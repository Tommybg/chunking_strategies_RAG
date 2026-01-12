// Estrategia de Fragmentación Recursiva (Recursive Chunking)
import type { Chunk, ChunkingResult, ChunkingStatistics } from '@/types';

interface RecursiveConfig {
    chunkSize: number;
    chunkOverlap: number;
    [key: string]: unknown;
}

// Separadores por defecto en orden de prioridad (de más a menos específicos)
const DEFAULT_SEPARATORS = [
    '\n\n\n',    // Triple salto de línea (secciones principales)
    '\n\n',      // Doble salto de línea (párrafos)
    '\n',        // Salto de línea simple
    '. ',        // Fin de oración
    '! ',        // Exclamación
    '? ',        // Pregunta
    '; ',        // Punto y coma
    ', ',        // Coma
    ' ',         // Espacio (último recurso)
];

export function recursiveChunking(
    text: string,
    config: RecursiveConfig = { chunkSize: 500, chunkOverlap: 50 },
    separators: string[] = DEFAULT_SEPARATORS
): ChunkingResult {
    const startTime = performance.now();

    const { chunkSize, chunkOverlap } = config;
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    function splitRecursively(
        text: string,
        startOffset: number,
        separatorIndex: number = 0
    ): void {
        // Caso base: el texto es lo suficientemente pequeño
        if (text.length <= chunkSize) {
            if (text.trim().length > 0) {
                chunks.push({
                    id: `recursive-${chunkIndex}`,
                    text: text.trim(),
                    startIndex: startOffset,
                    endIndex: startOffset + text.length,
                    metadata: {
                        strategy: 'recursive',
                        splitLevel: separatorIndex,
                    },
                });
                chunkIndex++;
            }
            return;
        }

        // No hay más separadores disponibles
        if (separatorIndex >= separators.length) {
            // Forzar división al tamaño chunkSize
            let position = 0;
            while (position < text.length) {
                const endPos = Math.min(position + chunkSize, text.length);
                const chunkText = text.slice(position, endPos);

                if (chunkText.trim().length > 0) {
                    chunks.push({
                        id: `recursive-${chunkIndex}`,
                        text: chunkText.trim(),
                        startIndex: startOffset + position,
                        endIndex: startOffset + endPos,
                        metadata: {
                            strategy: 'recursive',
                            splitLevel: separatorIndex,
                            forceSplit: true,
                        },
                    });
                    chunkIndex++;
                }

                position += chunkSize - chunkOverlap;
            }
            return;
        }

        const separator = separators[separatorIndex];
        const parts = text.split(separator);

        // Si el separador no divide el texto, intentar con el siguiente separador
        if (parts.length === 1) {
            splitRecursively(text, startOffset, separatorIndex + 1);
            return;
        }

        // Procesar cada parte, uniendo las pequeñas
        let currentMerged = '';
        let currentOffset = startOffset;
        let mergeStartOffset = startOffset;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const partWithSep = i < parts.length - 1 ? part + separator : part;

            // Verificar si añadir esta parte excedería el tamaño del fragmento
            if (currentMerged.length + partWithSep.length <= chunkSize) {
                if (currentMerged.length === 0) {
                    mergeStartOffset = currentOffset;
                }
                currentMerged += partWithSep;
            } else {
                // Procesar el texto acumulado
                if (currentMerged.trim().length > 0) {
                    if (currentMerged.length <= chunkSize) {
                        chunks.push({
                            id: `recursive-${chunkIndex}`,
                            text: currentMerged.trim(),
                            startIndex: mergeStartOffset,
                            endIndex: mergeStartOffset + currentMerged.length,
                            metadata: {
                                strategy: 'recursive',
                                splitLevel: separatorIndex,
                            },
                        });
                        chunkIndex++;
                    } else {
                        // Aún es demasiado grande, recurrir con el siguiente separador
                        splitRecursively(currentMerged, mergeStartOffset, separatorIndex + 1);
                    }
                }

                // Iniciar nueva unión
                currentMerged = partWithSep;
                mergeStartOffset = currentOffset;
            }

            currentOffset += partWithSep.length;
        }

        // Procesar el texto acumulado restante
        if (currentMerged.trim().length > 0) {
            if (currentMerged.length <= chunkSize) {
                chunks.push({
                    id: `recursive-${chunkIndex}`,
                    text: currentMerged.trim(),
                    startIndex: mergeStartOffset,
                    endIndex: mergeStartOffset + currentMerged.length,
                    metadata: {
                        strategy: 'recursive',
                        splitLevel: separatorIndex,
                    },
                });
                chunkIndex++;
            } else {
                splitRecursively(currentMerged, mergeStartOffset, separatorIndex + 1);
            }
        }
    }

    splitRecursively(text, 0);

    const processingTime = performance.now() - startTime;
    const statistics = calculateStatistics(chunks);

    return {
        strategy: 'recursive',
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
