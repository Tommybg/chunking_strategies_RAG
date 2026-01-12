import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

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

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileType = file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'docx' || fileType === 'doc') {
            try {
                const result = await mammoth.extractRawText({ buffer });
                return NextResponse.json({ content: result.value.trim() });
            } catch (docxError: any) {
                console.error('DOCX parsing error:', docxError);
                return NextResponse.json(
                    { error: `Failed to parse DOCX file: ${docxError.message}` },
                    { status: 500 }
                );
            }
        } else if (['txt', 'md', 'markdown'].includes(fileType || '')) {
            const text = buffer.toString('utf-8');
            return NextResponse.json({ content: text.trim() });
        } else {
            return NextResponse.json(
                { error: 'Unsupported file type. Only DOCX, TXT, and Markdown are supported.' },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error('Document parsing error:', error);
        return NextResponse.json(
            { error: `Internal server error during parsing: ${error.message}` },
            { status: 500 }
        );
    }
}
