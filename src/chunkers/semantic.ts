// Estrategia de Fragmentación Semántica (Semantic Chunking)
import type { Chunk, ChunkingResult, ChunkingStatistics } from '@/types';
import { cosineSimilarity } from '@/lib/cosine-similarity';

interface SemanticConfig {
    similarityThreshold: number;
    minChunkSize: number;
    [key: string]: unknown;
}

interface SentenceWithEmbedding {
    text: string;
    startIndex: number;
    endIndex: number;
    embedding: number[];
}

// Dividir texto en oraciones
function splitIntoSentences(text: string): Array<{ text: string; startIndex: number; endIndex: number }> {
    const sentences: Array<{ text: string; startIndex: number; endIndex: number }> = [];
    // Coincidir con oraciones que terminan en . ! ? seguidas de espacio o fin, o saltos de línea dobles
    const regex = /[^.!?\n]+[.!?]+[\s\n]*|[^.!?\n]+\n\n+|[^.!?\n]+$/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const trimmed = match[0].trim();
        if (trimmed.length > 0) {
            sentences.push({
                text: trimmed,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
            });
        }
    }

    return sentences;
}

export async function semanticChunking(
    text: string,
    config: SemanticConfig = { similarityThreshold: 0.7, minChunkSize: 100 },
    embeddingFn: (text: string) => Promise<number[]>,
    batchEmbeddingFn?: (texts: string[]) => Promise<number[][]>
): Promise<ChunkingResult> {
    const startTime = performance.now();

    const { similarityThreshold, minChunkSize } = config;

    // Paso 1: Dividir en oraciones
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) {
        return {
            strategy: 'semantic',
            chunks: [],
            processingTime: performance.now() - startTime,
            config,
            statistics: {
                totalChunks: 0,
                averageChunkSize: 0,
                minChunkSize: 0,
                maxChunkSize: 0,
            },
        };
    }

    // Paso 2: Generar embeddings para cada oración
    const sentencesWithEmbeddings: SentenceWithEmbedding[] = [];

    if (batchEmbeddingFn) {
        // ✅ RUTA OPTIMIZADA: Batching
        try {
            const sentenceTexts = sentences.map(s => s.text);
            const BATCH_SIZE = 20;
            const batches: string[][] = [];

            // Dividir en lotes
            for (let i = 0; i < sentenceTexts.length; i += BATCH_SIZE) {
                batches.push(sentenceTexts.slice(i, i + BATCH_SIZE));
            }

            // Procesar lotes en paralelo
            const batchResults = await Promise.all(
                batches.map(batch => batchEmbeddingFn(batch))
            );

            // Aplanar resultados
            const allEmbeddings = batchResults.flat();

            // Combinar con oraciones
            for (let i = 0; i < sentences.length; i++) {
                if (allEmbeddings[i]) {
                    sentencesWithEmbeddings.push({
                        ...sentences[i],
                        embedding: allEmbeddings[i],
                    });
                }
            }
        } catch (error) {
            console.error('Batch embedding failed, falling back to sequential:', error);
            // Fallback a secuencial (código actual)
            for (const sentence of sentences) {
                try {
                    const embedding = await embeddingFn(sentence.text);
                    sentencesWithEmbeddings.push({ ...sentence, embedding });
                } catch (err) {
                    console.error('Failed to generate embedding:', err);
                }
            }
        }
    } else {
        // ⚠️ RUTA LEGACY: Secuencial (sin cambios)
        for (const sentence of sentences) {
            try {
                const embedding = await embeddingFn(sentence.text);
                sentencesWithEmbeddings.push({
                    ...sentence,
                    embedding,
                });
            } catch (error) {
                console.error('Failed to generate embedding for sentence:', error);
                // Skip sentences that fail to embed
            }
        }
    }

    if (sentencesWithEmbeddings.length === 0) {
        throw new Error('Failed to generate embeddings for any sentences');
    }

    // Paso 3: Agrupar oraciones basándose en la similitud semántica
    const chunks: Chunk[] = [];
    let currentChunk: SentenceWithEmbedding[] = [sentencesWithEmbeddings[0]];
    let chunkIndex = 0;

    for (let i = 1; i < sentencesWithEmbeddings.length; i++) {
        const currentSentence = sentencesWithEmbeddings[i];
        const lastSentence = currentChunk[currentChunk.length - 1];

        // Calcular similitud con la última oración del fragmento actual
        const similarity = cosineSimilarity(
            lastSentence.embedding,
            currentSentence.embedding
        );

        const currentChunkText = currentChunk.map((s) => s.text).join(' ');

        // Si la similitud es suficientemente alta, añadir al fragmento actual
        if (similarity >= similarityThreshold) {
            currentChunk.push(currentSentence);
        } else {
            // Caída de similitud detectada - verificar si el fragmento alcanza el tamaño mínimo
            if (currentChunkText.length >= minChunkSize) {
                // Guardar fragmento actual e iniciar uno nuevo
                chunks.push(createChunk(currentChunk, chunkIndex));
                chunkIndex++;
                currentChunk = [currentSentence];
            } else {
                // Fragmento demasiado pequeño, continuar agregando
                currentChunk.push(currentSentence);
            }
        }
    }

    // No olvidar el último fragmento
    if (currentChunk.length > 0) {
        chunks.push(createChunk(currentChunk, chunkIndex));
    }

    const processingTime = performance.now() - startTime;
    const statistics = calculateStatistics(chunks);

    return {
        strategy: 'semantic',
        chunks,
        processingTime,
        config,
        statistics,
    };
}

function createChunk(sentences: SentenceWithEmbedding[], index: number): Chunk {
    const text = sentences.map((s) => s.text).join(' ');
    return {
        id: `semantic-${index}`,
        text,
        startIndex: sentences[0].startIndex,
        endIndex: sentences[sentences.length - 1].endIndex,
        metadata: {
            strategy: 'semantic',
            sentenceCount: sentences.length,
        },
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

// Versión síncrona para cuando los embeddings ya están pre-calculados
export function semanticChunkingSync(
    sentences: SentenceWithEmbedding[],
    config: SemanticConfig = { similarityThreshold: 0.7, minChunkSize: 100 }
): Chunk[] {
    const { similarityThreshold, minChunkSize } = config;
    const chunks: Chunk[] = [];

    if (sentences.length === 0) return chunks;

    let currentChunk: SentenceWithEmbedding[] = [sentences[0]];
    let chunkIndex = 0;

    for (let i = 1; i < sentences.length; i++) {
        const currentSentence = sentences[i];
        const lastSentence = currentChunk[currentChunk.length - 1];

        const similarity = cosineSimilarity(
            lastSentence.embedding,
            currentSentence.embedding
        );

        const currentChunkText = currentChunk.map((s) => s.text).join(' ');

        if (similarity >= similarityThreshold) {
            currentChunk.push(currentSentence);
        } else if (currentChunkText.length >= minChunkSize) {
            chunks.push(createChunk(currentChunk, chunkIndex));
            chunkIndex++;
            currentChunk = [currentSentence];
        } else {
            currentChunk.push(currentSentence);
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(createChunk(currentChunk, chunkIndex));
    }

    return chunks;
}
