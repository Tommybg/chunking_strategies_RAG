// Estrategia de Fragmentación basada en LLM (LLM-Based)
import type { Chunk, ChunkingResult, ChunkingStatistics } from '@/types';
import { llmChunking as callLLMChunking } from '@/services/openai';

interface LLMConfig {
    model: 'gpt-4o-mini' | 'gpt-4o';
    targetChunks: number;
    [key: string]: unknown;
}

export async function llmBasedChunking(
    text: string,
    apiKey: string,
    config: LLMConfig = { model: 'gpt-4o-mini', targetChunks: 10 }
): Promise<ChunkingResult> {
    const startTime = performance.now();

    const { model, targetChunks } = config;

    try {
        // Llamar al LLM para segmentar el texto
        const chunkTexts = await callLLMChunking(text, apiKey, targetChunks, model);

        // Crear objetos de fragmento con seguimiento de posición
        const chunks: Chunk[] = [];
        let searchStart = 0;

        for (let i = 0; i < chunkTexts.length; i++) {
            const chunkText = chunkTexts[i].trim();

            if (chunkText.length === 0) continue;

            // Encontrar el fragmento en el texto original
            // Buscamos una coincidencia de subcadena para manejar pequeñas modificaciones del LLM
            const startIndex = findBestMatch(text, chunkText, searchStart);
            const endIndex = startIndex !== -1
                ? startIndex + findOverlapLength(text.slice(startIndex), chunkText)
                : searchStart + chunkText.length;

            chunks.push({
                id: `llm-${i}`,
                text: chunkText,
                startIndex: startIndex !== -1 ? startIndex : searchStart,
                endIndex,
                metadata: {
                    strategy: 'llm-based',
                    model,
                    originalOrder: i,
                },
            });

            if (startIndex !== -1) {
                searchStart = endIndex;
            }
        }

        const processingTime = performance.now() - startTime;
        const statistics = calculateStatistics(chunks);

        return {
            strategy: 'llm-based',
            chunks,
            processingTime,
            config,
            statistics,
        };
    } catch (error) {
        console.error('LLM chunking failed:', error);
        throw error;
    }
}

// Encontrar la mejor posición de coincidencia para un fragmento en el texto original
function findBestMatch(text: string, chunk: string, startFrom: number): number {
    // Primero, intentar coincidencia exacta
    const exactIndex = text.indexOf(chunk, startFrom);
    if (exactIndex !== -1) {
        return exactIndex;
    }

    // Intentar coincidir los primeros 50 caracteres (en caso de que el LLM haya modificado ligeramente)
    const searchPrefix = chunk.slice(0, Math.min(50, chunk.length));
    const prefixIndex = text.indexOf(searchPrefix, startFrom);
    if (prefixIndex !== -1) {
        return prefixIndex;
    }

    // Intentar coincidir la primera oración
    const firstSentenceMatch = chunk.match(/^[^.!?]+[.!?]/);
    if (firstSentenceMatch) {
        const sentenceIndex = text.indexOf(firstSentenceMatch[0], startFrom);
        if (sentenceIndex !== -1) {
            return sentenceIndex;
        }
    }

    // Fallback: devolver -1 (no encontrado)
    return -1;
}

// Encontrar cuánto del fragmento se solapa con el texto en la posición dada
function findOverlapLength(textSlice: string, chunk: string): number {
    // Intentar encontrar dónde termina el contenido del fragmento en el texto original
    const chunkWords = chunk.split(/\s+/);
    const lastFewWords = chunkWords.slice(-5).join(' ');

    const endIndex = textSlice.indexOf(lastFewWords);
    if (endIndex !== -1) {
        return endIndex + lastFewWords.length;
    }

    // Fallback al tamaño del fragmento
    return Math.min(chunk.length, textSlice.length);
}

function calculateStatistics(chunks: Chunk[]): ChunkingStatistics {
    if (chunks.length === 0) {
        return {
            totalChunks: 0,
            averageChunkSize: 0,
            minChunkSize: 0,
            maxChunkSize: 0,
        };
    }

    const sizes = chunks.map((c) => c.text.length);
    const totalSize = sizes.reduce((a, b) => a + b, 0);

    return {
        totalChunks: chunks.length,
        averageChunkSize: Math.round(totalSize / chunks.length),
        minChunkSize: Math.min(...sizes),
        maxChunkSize: Math.max(...sizes),
    };
}

// Fragmentación de respaldo (fallback) cuando la API no está disponible
export function fallbackChunking(text: string, targetChunks: number): Chunk[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

    if (paragraphs.length <= targetChunks) {
        return paragraphs.map((p, i) => ({
            id: `fallback-${i}`,
            text: p.trim(),
            startIndex: text.indexOf(p),
            endIndex: text.indexOf(p) + p.length,
            metadata: {
                strategy: 'llm-based',
                fallback: true,
            },
        }));
    }

    // Combinar párrafos para alcanzar el número objetivo de fragmentos
    const chunksPerGroup = Math.ceil(paragraphs.length / targetChunks);
    const chunks: Chunk[] = [];

    for (let i = 0; i < paragraphs.length; i += chunksPerGroup) {
        const group = paragraphs.slice(i, i + chunksPerGroup);
        const chunkText = group.join('\n\n');
        const startIndex = text.indexOf(group[0]);

        chunks.push({
            id: `fallback-${chunks.length}`,
            text: chunkText,
            startIndex,
            endIndex: startIndex + chunkText.length,
            metadata: {
                strategy: 'llm-based',
                fallback: true,
            },
        });
    }

    return chunks;
}
