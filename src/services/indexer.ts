// Servicio Indexador - Crea un índice vectorial a partir de documentos
import type { Chunk, ChunkingResult, ChunkingStrategyType } from '@/types';
import { createCollection, upsertChunks, DEFAULT_COLLECTION } from './qdrant';

import { generateOpenAIEmbeddings } from './openai';

interface IndexerConfig {
    collectionName: string;
    embeddingProvider: 'ollama' | 'openai';
    embeddingModel: string;
    apiKey?: string; // Requerido para OpenAI
    vectorSize?: number;
}

interface IndexResult {
    success: boolean;
    collectionName: string;
    chunksIndexed: number;
    processingTimeMs: number;
    error?: string;
}

/**
 * Indexador de Documentos - Crea embeddings y los almacena en Qdrant
 * Similar a VectorStoreIndex.from_documents() en LlamaIndex
 */
export class DocumentIndexer {
    private config: IndexerConfig;

    constructor(config: IndexerConfig) {
        this.config = {
            ...config,
            vectorSize: config.vectorSize ?? 1024, // Por defecto para mxbai-embed-large
        };
    }

    /**
     * Crea un índice a partir de fragmentos (chunks)
     * Esto genera embeddings para cada fragmento y los almacena en el almacén de vectores Qdrant
     */
    async indexChunks(chunkingResult: ChunkingResult): Promise<IndexResult> {
        const startTime = performance.now();

        try {
            // Paso 1: Crear/recrear la colección en Qdrant
            const collectionCreated = await createCollection(
                this.config.collectionName,
                this.config.vectorSize
            );

            if (!collectionCreated) {
                throw new Error('Error al crear la colección en Qdrant');
            }

            // Paso 2: Extraer textos de los fragmentos
            const texts = chunkingResult.chunks.map((chunk) => chunk.text);

            // Paso 3: Generar embeddings para todos los fragmentos
            let embeddings: number[][];

            if (this.config.embeddingProvider === 'ollama') {
                throw new Error('El soporte para Ollama ha sido descontinuado. Por favor, usa OpenAI.');
            } else {
                if (!this.config.apiKey) {
                    throw new Error('La clave API de OpenAI es requerida');
                }
                embeddings = await generateOpenAIEmbeddings(
                    texts,
                    this.config.apiKey,
                    this.config.embeddingModel
                );
            }

            // Paso 4: Añadir embeddings a los fragmentos
            const chunksWithEmbeddings: Chunk[] = chunkingResult.chunks.map(
                (chunk, index) => ({
                    ...chunk,
                    embedding: embeddings[index],
                })
            );

            // Paso 5: Upsert a Qdrant
            const upsertSuccess = await upsertChunks(
                this.config.collectionName,
                chunksWithEmbeddings
            );

            if (!upsertSuccess) {
                throw new Error('Error al subir los fragmentos a Qdrant');
            }

            const processingTimeMs = performance.now() - startTime;

            return {
                success: true,
                collectionName: this.config.collectionName,
                chunksIndexed: chunksWithEmbeddings.length,
                processingTimeMs,
            };
        } catch (error) {
            return {
                success: false,
                collectionName: this.config.collectionName,
                chunksIndexed: 0,
                processingTimeMs: performance.now() - startTime,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }

    /**
     * Indexa múltiples resultados de fragmentación (para comparación)
     */
    async indexMultiple(
        results: Array<{ strategy: ChunkingStrategyType; result: ChunkingResult }>
    ): Promise<Map<ChunkingStrategyType, IndexResult>> {
        const indexResults = new Map<ChunkingStrategyType, IndexResult>();

        for (const { strategy, result } of results) {
            const collectionName = `${this.config.collectionName}_${strategy}`;
            const indexer = new DocumentIndexer({
                ...this.config,
                collectionName,
            });

            const indexResult = await indexer.indexChunks(result);
            indexResults.set(strategy, indexResult);
        }

        return indexResults;
    }
}

/**
 * Crea un índice a partir de documentos
 * Similar a: index = VectorStoreIndex.from_documents(docs, ...)
 */
export function createIndex(
    collectionName: string,
    provider: 'ollama' | 'openai' = 'openai',
    model: string = 'mxbai-embed-large:latest',
    apiKey?: string
): DocumentIndexer {
    return new DocumentIndexer({
        collectionName,
        embeddingProvider: provider,
        embeddingModel: model,
        apiKey,
    });
}

/**
 * Función auxiliar para indexar fragmentos en una sola llamada
 */
export async function indexDocumentChunks(
    collectionName: string,
    chunkingResult: ChunkingResult,
    embeddingConfig: {
        provider: 'ollama' | 'openai';
        model: string;
        apiKey?: string;
    }
): Promise<IndexResult> {
    const indexer = createIndex(
        collectionName,
        embeddingConfig.provider,
        embeddingConfig.model,
        embeddingConfig.apiKey
    );

    return indexer.indexChunks(chunkingResult);
}
