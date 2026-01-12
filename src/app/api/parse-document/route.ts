// Parse Document API Route
// Compatible con Edge Runtime de Cloudflare
// NOTA: El soporte para DOCX está deshabilitado en producción (Edge) porque 'mammoth'
// usa APIs de Node.js incompatibles. Los archivos .docx deben procesarse en el cliente.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const fileType = file.name.split('.').pop()?.toLowerCase();

        // En Edge Runtime, solo podemos procesar archivos de texto plano
        if (['txt', 'md', 'markdown'].includes(fileType || '')) {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);
            return NextResponse.json({ content: text.trim() });
        } else if (fileType === 'docx' || fileType === 'doc') {
            // Mammoth no es compatible con Edge Runtime
            // El procesamiento de DOCX se hace en el cliente
            return NextResponse.json(
                {
                    error: 'El procesamiento de archivos Word (.docx) se realiza localmente en tu navegador.',
                    hint: 'Si ves este error, intenta subir el archivo nuevamente.'
                },
                { status: 400 }
            );
        } else {
            return NextResponse.json(
                { error: 'Unsupported file type. Only TXT and Markdown are supported via API.' },
                { status: 400 }
            );
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Document parsing error:', error);
        return NextResponse.json(
            { error: `Internal server error during parsing: ${message}` },
            { status: 500 }
        );
    }
}
