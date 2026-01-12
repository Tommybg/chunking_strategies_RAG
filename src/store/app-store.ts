import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Document,
    ChunkingStrategyType,
    ChunkingResult,
} from '@/types';

// Configuración simplificada de embeddings (Solo OpenAI)
interface EmbeddingConfig {
    apiKey?: string;
    model: string;
}

interface AppState {
    // Estado del Documento
    document: Document | null;
    setDocument: (doc: Document | null) => void;

    // Estado del Panel Izquierdo
    leftStrategy: ChunkingStrategyType;
    leftResult: ChunkingResult | null;
    leftConfig: Record<string, unknown>;
    leftLoading: boolean;
    setLeftStrategy: (strategy: ChunkingStrategyType) => void;
    setLeftResult: (result: ChunkingResult | null) => void;
    setLeftConfig: (config: Record<string, unknown>) => void;
    setLeftLoading: (loading: boolean) => void;

    // Estado del Panel Derecho
    rightStrategy: ChunkingStrategyType;
    rightResult: ChunkingResult | null;
    rightConfig: Record<string, unknown>;
    rightLoading: boolean;
    setRightStrategy: (strategy: ChunkingStrategyType) => void;
    setRightResult: (result: ChunkingResult | null) => void;
    setRightConfig: (config: Record<string, unknown>) => void;
    setRightLoading: (loading: boolean) => void;

    // Configuración de Embeddings (Solo OpenAI)
    embeddingConfig: EmbeddingConfig;
    setEmbeddingConfig: (config: Partial<EmbeddingConfig>) => void;

    // Estado de la UI
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Fragmento Seleccionado (para resaltar)
    selectedChunkId: string | null;
    hoveredChunkId: string | null;
    setSelectedChunkId: (id: string | null) => void;
    setHoveredChunkId: (id: string | null) => void;

    // Reiniciar Estado
    resetComparison: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Estado del Documento
            document: null,
            setDocument: (doc) => set({ document: doc }),

            // Panel Izquierdo - Por defecto a Tamaño Fijo
            leftStrategy: 'fixed-size',
            leftResult: null,
            leftConfig: { chunkSize: 500, overlap: 50 },
            leftLoading: false,
            setLeftStrategy: (strategy) => set({ leftStrategy: strategy, leftResult: null }),
            setLeftResult: (result) => set({ leftResult: result }),
            setLeftConfig: (config) => set({ leftConfig: config }),
            setLeftLoading: (loading) => set({ leftLoading: loading }),

            // Panel Derecho - Por defecto a Semántico
            rightStrategy: 'semantic',
            rightResult: null,
            rightConfig: { similarityThreshold: 0.7, minChunkSize: 100 },
            rightLoading: false,
            setRightStrategy: (strategy) => set({ rightStrategy: strategy, rightResult: null }),
            setRightResult: (result) => set({ rightResult: result }),
            setRightConfig: (config) => set({ rightConfig: config }),
            setRightLoading: (loading) => set({ rightLoading: loading }),

            // Configuración de Embeddings (Solo OpenAI)
            embeddingConfig: {
                model: 'text-embedding-3-small',
                apiKey: undefined,
            },
            setEmbeddingConfig: (config) =>
                set((state) => ({
                    embeddingConfig: { ...state.embeddingConfig, ...config },
                })),

            // Estado de la UI
            sidebarOpen: true,
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),

            // Fragmento Seleccionado
            selectedChunkId: null,
            hoveredChunkId: null,
            setSelectedChunkId: (id) => set({ selectedChunkId: id }),
            setHoveredChunkId: (id) => set({ hoveredChunkId: id }),

            // Reiniciar
            resetComparison: () =>
                set({
                    document: null,
                    leftResult: null,
                    rightResult: null,
                    selectedChunkId: null,
                    hoveredChunkId: null,
                }),
        }),
        {
            name: 'rag-chunking-visualizer',
            partialize: (state) => ({
                embeddingConfig: state.embeddingConfig,
                sidebarOpen: state.sidebarOpen,
                leftStrategy: state.leftStrategy,
                rightStrategy: state.rightStrategy,
                leftConfig: state.leftConfig,
                rightConfig: state.rightConfig,
            }),
        }
    )
);
