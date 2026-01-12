// Estrategia de Fragmentación de Tamaño Fijo (Fixed-Size)
import type { Chunk, ChunkingResult, ChunkingStatistics } from '@/types';

interface FixedSizeConfig {
    chunkSize: number;
    overlap: number;
    [key: string]: unknown;
}

export function fixedSizeChunking(
    text: string,
    config: FixedSizeConfig = { chunkSize: 500, overlap: 60 }
): ChunkingResult {
    const startTime = performance.now();
    const chunks: Chunk[] = [];

    const { chunkSize, overlap } = config;
    const step = chunkSize - overlap;

    let chunkIndex = 0;
    let position = 0;

    while (position < text.length) {
        const endPosition = Math.min(position + chunkSize, text.length);
        const chunkText = text.slice(position, endPosition);

        if (chunkText.trim().length > 0) {
            chunks.push({
                id: `fixed-${chunkIndex}`,
                text: chunkText,
                startIndex: position,
                endIndex: endPosition,
                metadata: {
                    strategy: 'fixed-size',
                    overlap: position > 0 ? Math.min(overlap, position) : 0,
                    chunkIndex,
                },
            });
            chunkIndex++;
        }

        position += step;

        // Prevenir bucle infinito al final
        if (endPosition >= text.length) break;
    }

    const processingTime = performance.now() - startTime;
    const statistics = calculateStatistics(chunks);

    return {
        strategy: 'fixed-size',
        chunks,
        processingTime,
        config,
        statistics,
    };
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
