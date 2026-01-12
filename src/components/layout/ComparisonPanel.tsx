"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scissors,
    Brain,
    TreeStructure,
    FileText,
    Sparkle,
    CircleNotch,
    ChartBar,
    XCircle,
    Gear,
    Info,
    DownloadSimple,
    Copy,
    Check,
} from "@phosphor-icons/react";
import { useAppStore } from "@/store/app-store";
import { ChunkingStrategyType, CHUNKING_STRATEGIES } from "@/types";
import { ChunkHighlighter } from "@/components/visualization/ChunkHighlighter";
import { StrategyConfigPanel } from "@/components/ui/strategy-config-panel";
import { StrategyInfoModal } from "@/components/ui/StrategyInfoModal";
import { cn } from "@/lib/utils";

// Funciones de fragmentación
import { fixedSizeChunking } from "@/chunkers/fixed-size";
import { recursiveChunking } from "@/chunkers/recursive";
import { documentStructureChunking } from "@/chunkers/document-structure";

interface ComparisonPanelProps {
    side: "left" | "right";
}

const strategyIcons: Record<ChunkingStrategyType, React.ReactNode> = {
    "fixed-size": <Scissors weight="duotone" />,
    semantic: <Brain weight="duotone" />,
    recursive: <TreeStructure weight="duotone" />,
    "document-structure": <FileText weight="duotone" />,
    "llm-based": <Sparkle weight="duotone" />,
};

export function ComparisonPanel({ side }: ComparisonPanelProps) {
    const {
        document: doc,
        leftStrategy,
        rightStrategy,
        leftResult,
        rightResult,
        leftConfig,
        rightConfig,
        leftLoading,
        rightLoading,
        setLeftStrategy,
        setRightStrategy,
        setLeftResult,
        setRightResult,
        setLeftConfig,
        setRightConfig,
        setLeftLoading,
        setRightLoading,
    } = useAppStore();

    const strategy = side === "left" ? leftStrategy : rightStrategy;
    const result = side === "left" ? leftResult : rightResult;
    const config = side === "left" ? leftConfig : rightConfig;
    const loading = side === "left" ? leftLoading : rightLoading;
    const setStrategy = side === "left" ? setLeftStrategy : setRightStrategy;
    const setResult = side === "left" ? setLeftResult : setRightResult;
    const setConfig = side === "left" ? setLeftConfig : setRightConfig;
    const setLoading = side === "left" ? setLeftLoading : setRightLoading;

    const [showConfig, setShowConfig] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const strategyInfo = CHUNKING_STRATEGIES.find((s) => s.id === strategy);

    // Manejar exportación a markdown
    const handleExport = async () => {
        if (!result || !doc) return;

        const { exportToMarkdown, downloadMarkdown, generateFilename } = await import('@/lib/export-utils');
        const markdown = exportToMarkdown({
            document: doc,
            strategy,
            result,
        });
        const filename = generateFilename(strategy, doc.name);
        downloadMarkdown(markdown, filename);
    };

    // Manejar copia de estadísticas al portapapeles
    const handleCopyStats = async () => {
        if (!result) return;

        const { copyToClipboard } = await import('@/lib/export-utils');
        const stats = result.statistics;
        const tokenEstimate = Math.ceil(doc!.content.length / 4);
        const overlapPct = strategy === 'fixed-size' && config.overlap
            ? ((config.overlap as number) / (config.chunkSize as number) * 100).toFixed(1)
            : 'N/A';

        const statsText = `Chunking Statistics - ${strategyInfo?.name}
Total Chunks: ${stats.totalChunks}
Average Size: ${stats.averageChunkSize} chars
Min Size: ${stats.minChunkSize} chars
Max Size: ${stats.maxChunkSize} chars
Token Estimate: ~${tokenEstimate}
Overlap: ${overlapPct}%
Processing Time: ${result.processingTime.toFixed(1)}ms`;

        const success = await copyToClipboard(statsText);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Ejecutar fragmentación cuando cambia la estrategia o la configuración
    useEffect(() => {
        if (!doc || !strategy) return;

        const runChunking = async () => {
            setError(null);
            setLoading(true);
            try {
                let chunkingResult;

                switch (strategy) {
                    case "fixed-size":
                        chunkingResult = fixedSizeChunking(doc.content, {
                            chunkSize: (config.chunkSize as number) ?? 500,
                            overlap: (config.overlap as number) ?? 50,
                        });
                        break;

                    case "recursive":
                        chunkingResult = recursiveChunking(doc.content, {
                            chunkSize: (config.chunkSize as number) ?? 500,
                            chunkOverlap: (config.chunkOverlap as number) ?? 50,
                        });
                        break;

                    case "document-structure":
                        chunkingResult = documentStructureChunking(
                            doc.content,
                            doc.structure,
                            {
                                maxChunkSize: (config.maxChunkSize as number) ?? 1000,
                                preserveHeadings: (config.preserveHeadings as boolean) ?? true,
                            }
                        );
                        break;

                    case "semantic": {
                        // Función de batching para múltiples textos
                        const batchEmbeddingFn = async (texts: string[]): Promise<number[][]> => {
                            const response = await fetch('/api/embeddings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ texts }),  // Array de textos
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || 'Error al generar embeddings');
                            }

                            const data = await response.json();
                            return data.embeddings;  // Array de embeddings
                        };

                        // Función single para compatibilidad
                        const embeddingFn = async (text: string): Promise<number[]> => {
                            const results = await batchEmbeddingFn([text]);
                            return results[0];
                        };

                        // Llamar semantic chunking con batching
                        const { semanticChunking } = await import('@/chunkers/semantic');
                        chunkingResult = await semanticChunking(
                            doc.content,
                            {
                                similarityThreshold: (config.similarityThreshold as number) ?? 0.7,
                                minChunkSize: (config.minChunkSize as number) ?? 100,
                            },
                            embeddingFn,
                            batchEmbeddingFn  // ← NUEVO parámetro
                        );
                        break;
                    }

                    case "llm-based": {
                        // Usar API de fragmentación LLM del lado del servidor
                        const response = await fetch('/api/llm-chunking', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                text: doc.content,
                                targetChunks: (config.targetChunks as number) ?? 10,
                                model: (config.model as string) ?? 'gpt-4o-mini',
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Error en fragmentación LLM');
                        }

                        const data = await response.json();
                        const chunks = data.chunks;

                        // Construir ChunkingResult desde la respuesta del LLM
                        const startTime = performance.now();
                        chunkingResult = {
                            strategy: 'llm-based' as const,
                            chunks: chunks.map((text: string, i: number) => ({
                                id: `llm-${i}`,
                                text,
                                startIndex: 0,
                                endIndex: text.length,
                                metadata: { strategy: 'llm-based' },
                            })),
                            processingTime: performance.now() - startTime,
                            config,
                            statistics: {
                                totalChunks: chunks.length,
                                averageChunkSize: Math.round(chunks.reduce((a: number, c: string) => a + c.length, 0) / chunks.length),
                                minChunkSize: Math.min(...chunks.map((c: string) => c.length)),
                                maxChunkSize: Math.max(...chunks.map((c: string) => c.length)),
                            },
                        };
                        break;
                    }
                }

                setResult(chunkingResult);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setError(errorMessage);
                console.error("Chunking error:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce para la fragmentación
        const timeout = setTimeout(runChunking, 300);
        return () => clearTimeout(timeout);
    }, [doc, strategy, config, setLoading, setResult]);

    return (
        <motion.div
            className="flex-1 flex flex-col glass rounded-lg overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: side === "left" ? 0 : 0.15,
                ease: [0.25, 0.1, 0.25, 1]
            }}
        >
            {/* Encabezado */}
            <div className="p-7 pr-16 border-b border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            side === "left" ? "bg-[#3E8989]" : "bg-[#4FA9A9]"
                        )} />
                        {side === "left" ? "Estrategia A" : "Estrategia B"}
                    </h3>
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={cn(
                            "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded transition-colors duration-200",
                            showConfig
                                ? "text-[#3E8989] hover:text-[#4FA9A9]"
                                : "text-white/30 hover:text-white/60"
                        )}
                    >
                        {showConfig ? "Ocultar Config" : "Editar Config"}
                    </button>
                </div>

                {/* Selector de Estrategia */}
                <div className="flex flex-wrap gap-3 pt-2">
                    {CHUNKING_STRATEGIES.map((s) => (
                        <div key={s.id} className="flex items-center gap-1">
                            <button
                                onClick={() => setStrategy(s.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                    strategy === s.id
                                        ? "bg-[#3E8989] text-white shadow-md shadow-[#3E8989]/25"
                                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <span className="w-4 h-4">{strategyIcons[s.id]}</span>
                                <span className="hidden sm:inline">{s.name.split(" ")[0]}</span>
                            </button>
                            {strategy === s.id && (
                                <button
                                    onClick={() => setShowInfoModal(true)}
                                    className="p-1 rounded-md bg-[#3E8989]/20 text-[#3E8989] hover:bg-[#3E8989]/30 transition-colors"
                                    title={`Más sobre ${s.name}`}
                                >
                                    <Info weight="fill" className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Visualización de Errores */}
            {error && (
                <div className="mx-5 mt-5 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" weight="fill" />
                        <div className="flex-1">
                            <p className="text-sm text-red-300 font-medium mb-1">Error al Fragmentar</p>
                            <p className="text-xs text-red-400/80">{error}</p>
                            {error.includes('API key') && (
                                <p className="text-xs text-red-400/60 mt-2">
                                    Agrega tu API key de OpenAI en la configuración
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Panel de Configuración */}
            <AnimatePresence>
                {showConfig && strategy && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="border-b border-white/10"
                    >
                        <div className="p-6 pt-6 pb-[300px]">
                            <StrategyConfigPanel
                                strategy={strategy}
                                config={config}
                                onChange={setConfig}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Área de Contenido */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {!doc ? (
                    <div className="flex-1 flex items-center justify-center text-white/30">
                        <p className="text-sm">Sube un documento para comenzar</p>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <CircleNotch className="w-8 h-8 text-[#3E8989] animate-spin" />
                    </div>
                ) : result && result.chunks.length > 0 ? (
                    <>
                        {/* Barra de Estadísticas */}
                        <div className="px-4 py-2.5 bg-white/5 border-b border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <ChartBar className="w-4 h-4 text-[#3E8989]" weight="duotone" />
                                    <span className="text-xs font-medium text-white/70">Estadísticas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyStats}
                                        className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                                        title="Copiar estadísticas"
                                    >
                                        {copied ? (
                                            <Check weight="bold" className="w-3.5 h-3.5 text-green-400" />
                                        ) : (
                                            <Copy weight="duotone" className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="px-2.5 py-1.5 rounded-md bg-[#3E8989]/20 hover:bg-[#3E8989]/30 border border-[#3E8989]/30 text-[#3E8989] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                                    >
                                        <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
                                        Exportar
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-white/50">Fragmentos:</span>
                                    <span className="text-white font-medium">{result.statistics.totalChunks}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">Tamaño Prom:</span>
                                    <span className="text-white font-medium">{result.statistics.averageChunkSize} chars</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">Min / Max:</span>
                                    <span className="text-white font-medium">{result.statistics.minChunkSize} / {result.statistics.maxChunkSize}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">Tokens (est):</span>
                                    <span className="text-white font-medium">~{Math.ceil(doc!.content.length / 4)}</span>
                                </div>
                                {strategy === 'fixed-size' && config.overlap ? (
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Overlap:</span>
                                        <span className="text-white font-medium">
                                            {((config.overlap as number) / (config.chunkSize as number) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between">
                                    <span className="text-white/50">Tiempo:</span>
                                    <span className="text-white font-medium">{result.processingTime.toFixed(1)}ms</span>
                                </div>
                            </div>
                        </div>

                        {/* Visualización de Fragmentos */}
                        <div className="flex-1 overflow-auto p-5">
                            <ChunkHighlighter
                                text={doc.content}
                                chunks={result.chunks}
                                strategyColor={strategyInfo?.color || "#3E8989"}
                            />
                        </div>
                    </>
                ) : result?.chunks.length === 0 && strategy ? (
                    <div className="flex-1 flex items-center justify-center text-white/30 p-4 text-center">
                        <div>
                            <p className="text-sm mb-2">
                                {strategy === "semantic"
                                    ? "El fragmentado semántico requiere embeddings"
                                    : strategy === "llm-based"
                                        ? "El fragmentado LLM requiere una API key de OpenAI"
                                        : "No se generaron fragmentos"}
                            </p>
                            <p className="text-xs text-white/20">
                                Configura los ajustes arriba o conecta a un servicio
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Modal de Información de Estrategia */}
            {strategy && (
                <StrategyInfoModal
                    isOpen={showInfoModal}
                    onClose={() => setShowInfoModal(false)}
                    strategy={strategy}
                />
            )}
        </motion.div>
    );
}
