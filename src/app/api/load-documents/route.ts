// Load Documents API Route
// NOTA: Esta ruta usa APIs de Node.js (fs, path) que NO funcionan en Edge Runtime.
// En Cloudflare Pages, esta ruta devolverá un error informativo.
// Los usuarios deben subir archivos directamente via la UI en producción.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(_request: NextRequest) {
    // En Edge Runtime (Cloudflare), no podemos acceder al sistema de archivos del servidor.
    // Esta funcionalidad solo está disponible en desarrollo local con Node.js.
    return NextResponse.json(
        {
            error: 'Esta funcionalidad no está disponible en producción. Por favor, sube documentos directamente usando la interfaz.',
            hint: 'La carga desde directorio solo funciona en desarrollo local.'
        },
        { status: 501 }
    );
}
