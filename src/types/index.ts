// Core Types for RAG Chunking Visualizer

export interface Chunk {
    id: string;
    text: string;
    startIndex: number;
    endIndex: number;
    tokens?: number;
    metadata: {
        strategy: ChunkingStrategyType;
        overlap?: number;
        sectionTitle?: string;
        level?: number;
        [key: string]: unknown;
    };
    embedding?: number[];
}

export type ChunkingStrategyType =
    | 'fixed-size'
    | 'semantic'
    | 'recursive'
    | 'document-structure'
    | 'llm-based';

export interface ChunkingStrategy {
    id: ChunkingStrategyType;
    name: string;
    description: string;
    color: string;
    icon: string;
    requiresLLM?: boolean;
    configOptions: ConfigOption[];
}

export interface ConfigOption {
    key: string;
    label: string;
    type: 'number' | 'select' | 'boolean';
    default: number | string | boolean;
    min?: number;
    max?: number;
    options?: { value: string | number; label: string }[];
}

export interface Document {
    id: string;
    name: string;
    content: string;
    type: 'pdf' | 'docx' | 'txt' | 'md';
    size: number;
    uploadedAt: Date;
    structure?: DocumentStructure;
}

export interface DocumentStructure {
    title?: string;
    sections: DocumentSection[];
}

export interface DocumentSection {
    title: string;
    content: string;
    level: number;
    startIndex: number;
    endIndex: number;
    children?: DocumentSection[];
}

export interface ChunkingResult {
    strategy: ChunkingStrategyType;
    chunks: Chunk[];
    processingTime: number;
    config: Record<string, unknown>;
    statistics: ChunkingStatistics;
}

export interface ChunkingStatistics {
    totalChunks: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalTokens?: number;
    overlapPercentage?: number;
}

export interface EmbeddingConfig {
    provider: 'ollama' | 'openai';
    model: string;
    apiKey?: string;
}

export interface OllamaModel {
    name: string;
    size: string;
    modified: string;
}

export interface ComparisonState {
    document: Document | null;
    leftPanel: {
        strategy: ChunkingStrategyType | null;
        result: ChunkingResult | null;
        config: Record<string, unknown>;
        loading: boolean;
    };
    rightPanel: {
        strategy: ChunkingStrategyType | null;
        result: ChunkingResult | null;
        config: Record<string, unknown>;
        loading: boolean;
    };
}

export interface QdrantStatus {
    connected: boolean;
    collections: string[];
    error?: string;
}

export interface OllamaStatus {
    connected: boolean;
    models: OllamaModel[];
    error?: string;
}

// API Request/Response Types
export interface ChunkRequest {
    text: string;
    strategy: ChunkingStrategyType;
    config: Record<string, unknown>;
}

export interface ChunkResponse {
    success: boolean;
    result?: ChunkingResult;
    error?: string;
}

export interface EmbedRequest {
    texts: string[];
    provider: 'ollama' | 'openai';
    model: string;
    apiKey?: string;
}

export interface EmbedResponse {
    success: boolean;
    embeddings?: number[][];
    error?: string;
}

// Strategy Definitions
export const CHUNKING_STRATEGIES: ChunkingStrategy[] = [
    {
        id: 'fixed-size',
        name: 'Fijo',
        description: 'Divide el texto en fragmentos de caracteres fijos con superposición opcional',
        color: '#3E8989',
        icon: 'Scissors',
        configOptions: [
            { key: 'chunkSize', label: 'Tamaño de Fragmento (caracteres)', type: 'number', default: 500, min: 100, max: 2000 },
            { key: 'overlap', label: 'Superposición (caracteres)', type: 'number', default: 50, min: 0, max: 500 },
        ],
    },
    {
        id: 'semantic',
        name: 'Semántico',
        description: 'Agrupa oraciones basándose en similitud semántica usando embeddings',
        color: '#4FA9A9',
        icon: 'Brain',
        configOptions: [
            { key: 'similarityThreshold', label: 'Umbral de Similitud', type: 'number', default: 0.7, min: 0.1, max: 0.95 },
            { key: 'minChunkSize', label: 'Tamaño Mínimo de Fragmento', type: 'number', default: 100, min: 50, max: 500 },
        ],
    },
    {
        id: 'recursive',
        name: 'Recursivo',
        description: 'Divide el texto jerárquicamente usando múltiples separadores',
        color: '#2D6666',
        icon: 'GitBranch',
        configOptions: [
            { key: 'chunkSize', label: 'Tamaño Objetivo', type: 'number', default: 500, min: 100, max: 2000 },
            { key: 'chunkOverlap', label: 'Superposición', type: 'number', default: 50, min: 0, max: 500 },
        ],
    },
    {
        id: 'document-structure',
        name: 'Doc',
        description: 'Fragmenta basándose en la jerarquía del documento (encabezados, secciones)',
        color: '#64B4B4',
        icon: 'FileText',
        configOptions: [
            { key: 'maxChunkSize', label: 'Tamaño Máximo', type: 'number', default: 1000, min: 200, max: 3000 },
            { key: 'preserveHeadings', label: 'Preservar Encabezados', type: 'boolean', default: true },
        ],
    },
    {
        id: 'llm-based',
        name: 'LLM',
        description: 'Usa LLM para identificar límites semánticos naturales',
        color: '#1E5050',
        icon: 'Sparkles',
        requiresLLM: true,
        configOptions: [
            {
                key: 'model',
                label: 'Modelo LLM',
                type: 'select',
                default: 'gpt-4o-mini',
                options: [
                    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                    { value: 'gpt-4o', label: 'GPT-4o' },
                ],
            },
            { key: 'targetChunks', label: 'Número Objetivo de Fragmentos', type: 'number', default: 10, min: 3, max: 50 },
        ],
    },
];
