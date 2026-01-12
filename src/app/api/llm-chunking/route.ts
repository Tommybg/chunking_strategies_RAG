import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

// Esta API route usa la key del servidor - los usuarios no necesitan proveer la suya
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, targetChunks = 10, model = 'gpt-4o-mini' } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Se requiere "text" en el body' },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'API key de OpenAI no configurada en el servidor' },
                { status: 500 }
            );
        }

        const prompt = `Eres un experto en segmentación de texto. Tu tarea es dividir el siguiente texto en aproximadamente ${targetChunks} fragmentos semánticamente coherentes.

Reglas:
1. Cada fragmento debe contener un pensamiento o tema completo
2. Preservar el flujo natural y significado del texto
3. Los fragmentos deben ser aproximadamente similares en tamaño
4. No agregues ni elimines contenido del texto original
5. Devuelve SOLO un array JSON de strings, donde cada string es un fragmento

Texto a fragmentar:
"""
${text}
"""

Devuelve los fragmentos como un array JSON válido de strings. No incluyas ningún otro texto o explicación.`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Eres un asistente de segmentación de texto preciso. Siempre devuelves arrays JSON válidos.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 4000,
        });

        const content = response.choices[0]?.message?.content || '[]';

        // Limpiar y parsear la respuesta JSON
        const cleanedContent = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        let chunks: string[];
        try {
            chunks = JSON.parse(cleanedContent);
            if (!Array.isArray(chunks)) {
                throw new Error('La respuesta no es un array');
            }
            chunks = chunks.filter((chunk): chunk is string => typeof chunk === 'string');
        } catch {
            // Fallback: dividir por dobles saltos de línea
            chunks = text.split(/\n\n+/).filter((chunk: string) => chunk.trim().length > 0);
        }

        return NextResponse.json({
            chunks,
            model,
            usage: response.usage,
        });
    } catch (error) {
        console.error('Error en fragmentación LLM:', error);

        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error al fragmentar con LLM: ${errorMessage}` },
            { status: 500 }
        );
    }
}
