import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Inicializar OpenAI DENTRO de la función para que el secret esté disponible
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const body = await request.json();
        const { text, texts, model = 'text-embedding-3-small' } = body;

        // Validar que tenemos texto para procesar
        const inputTexts = texts || (text ? [text] : null);
        if (!inputTexts || inputTexts.length === 0) {
            return NextResponse.json(
                { error: 'Se requiere "text" o "texts" en el body' },
                { status: 400 }
            );
        }

        // Verificar que la API key esté configurada
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'API key de OpenAI no configurada en el servidor' },
                { status: 500 }
            );
        }

        // Generar embeddings
        const response = await openai.embeddings.create({
            model,
            input: inputTexts,
        });

        const embeddings = response.data.map((d) => d.embedding);

        return NextResponse.json({
            embeddings,
            model,
            usage: response.usage,
        });
    } catch (error) {
        console.error('Error generando embeddings:', error);

        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error al generar embeddings: ${errorMessage}` },
            { status: 500 }
        );
    }
}
