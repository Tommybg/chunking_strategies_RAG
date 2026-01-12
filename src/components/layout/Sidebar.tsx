"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    List,
    X,
    Upload,
    CloudArrowUp,
    CheckCircle,
    XCircle,
    Cpu,
    Database,
    FileText,
    Gear,
    Trash,
} from "@phosphor-icons/react";
import { useAppStore } from "@/store/app-store";
import { parseDocument, extractTextStructure } from "@/services/document-parser";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const {
        sidebarOpen,
        setSidebarOpen,
        document: doc,
        setDocument,
        embeddingConfig,
        setEmbeddingConfig,
    } = useAppStore();

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [loadingSample, setLoadingSample] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sampleDocuments = [
        { name: 'RAG Chunking Overview', file: 'rag-chunking-overview.txt', description: 'Technical article about chunking strategies' },
        { name: 'API Documentation', file: 'api-documentation.md', description: 'Vector Store API reference' },
        { name: 'Research Paper', file: 'research-paper.txt', description: 'Academic paper on semantic chunking' },
        { name: 'Short Story', file: 'short-story.txt', description: 'Creative narrative text' },
    ];

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);
        try {
            const parsedDoc = await parseDocument(file);
            setDocument(parsedDoc);
            setUploadSuccess(true);
            // Ocultar animación de éxito después de 2 segundos
            setTimeout(() => setUploadSuccess(false), 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to parse document';
            setUploadError(errorMessage);
            console.error("Failed to parse document:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        setDragOver(false);

        const file = event.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleRemoveDocument = () => {
        setDocument(null);
        setUploadError(null);
        // También limpiar resultados del store
        const store = useAppStore.getState();
        store.setLeftResult(null);
        store.setRightResult(null);
    };

    const handleLoadSample = async (sampleFile: string) => {
        setLoadingSample(true);
        setUploadError(null);
        setUploadSuccess(false);
        try {
            const response = await fetch(`/sample-docs/${sampleFile}`);
            if (!response.ok) {
                throw new Error('Failed to load sample document');
            }
            const content = await response.text();

            setDocument({
                id: `sample-${Date.now()}`,
                name: sampleDocuments.find(s => s.file === sampleFile)?.name || 'Sample',
                type: 'txt',
                content,
                size: content.length,
                uploadedAt: new Date(),
                structure: extractTextStructure(content)
            });
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to load sample:", error);
            setUploadError("Failed to load sample document");
        } finally {
            setLoadingSample(false);
        }
    };

    return (
        <>
            {/* Botón de alternancia (visible cuando está colapsado) */}
            <AnimatePresence>
                {!sidebarOpen && (
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        onClick={() => setSidebarOpen(true)}
                        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#363946]/80 backdrop-blur-xl border border-white/15 text-white/70 hover:text-white hover:bg-[#363946]/90 transition-all shadow-lg hover:shadow-xl"
                    >
                        <List weight="bold" className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Barra Lateral */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        {/* Fondo oscuro para móviles */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        />

                        {/* Sidebar Panel */}
                        <motion.aside
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }}
                            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                            className="fixed top-0 left-0 w-80 h-screen glass-heavy border-r border-white/10 z-50 flex flex-col shadow-2xl"
                        >
                            {/* Encabezado */}
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
                                <h2 className="text-xs font-bold text-white/90 tracking-widest flex items-center gap-2 uppercase">
                                    <List weight="bold" className="w-4 h-4 text-emerald-400" />
                                    Documentos
                                </h2>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200 -mr-2"
                                    aria-label="Cerrar menú"
                                >
                                    <X weight="bold" className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-8">
                                {/* Sección de Documentos */}
                                <section>
                                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FileText weight="duotone" className="w-4 h-4" />
                                        Documento
                                    </h3>

                                    {/* Área de Carga */}
                                    <div
                                        className={cn(
                                            "relative group rounded-xl border-2 border-dashed transition-all duration-300 ease-out cursor-pointer overflow-hidden",
                                            dragOver
                                                ? "border-[#3E8989] bg-[#3E8989]/10"
                                                : "border-white/10 hover:border-white/20 hover:bg-white/5",
                                            doc ? "p-0 border-none" : "p-8",
                                            uploadError ? "border-red-500/50 bg-red-500/5" : ""
                                        )}
                                        onDragOver={handleDragOver}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => !doc && fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept=".txt,.md,.doc,.docx"
                                        />

                                        {/* Capa de Carga */}
                                        <AnimatePresence>
                                            {uploading && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                                                >
                                                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#3E8989] animate-spin" />
                                                    <span className="text-xs font-medium text-white/80 animate-pulse">
                                                        Analizando documento...
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Capa de Éxito */}
                                        <AnimatePresence>
                                            {uploadSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="absolute inset-0 z-10 bg-[#3E8989]/90 backdrop-blur-md flex flex-col items-center justify-center gap-2"
                                                >
                                                    <CheckCircle weight="fill" className="w-8 h-8 text-white" />
                                                    <span className="text-sm font-bold text-white">¡Listo!</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Contenido de Error */}
                                        {uploadError && !uploading && !doc && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-500/10 backdrop-blur-sm z-20">
                                                <XCircle weight="fill" className="w-8 h-8 text-red-400 mb-2" />
                                                <p className="text-xs text-red-200">{uploadError}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUploadError(null);
                                                    }}
                                                    className="mt-3 text-[10px] underline text-red-300 hover:text-white"
                                                >
                                                    Intentar de nuevo
                                                </button>
                                            </div>
                                        )}

                                        {doc ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="relative p-4 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-colors"
                                            >
                                                <div className="flex items-start gap-4 pr-6">
                                                    <div className="w-10 h-10 rounded-lg bg-[#3E8989]/20 flex items-center justify-center shrink-0">
                                                        <FileText weight="duotone" className="w-6 h-6 text-[#3E8989]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-white truncate" title={doc.name}>
                                                            {doc.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 uppercase font-medium">
                                                                {doc.type}
                                                            </span>
                                                            <span className="text-[10px] text-white/40">
                                                                {(doc.size / 1024).toFixed(1)} KB
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Estadísticas */}
                                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                                                    <span className="text-white/40">Contenido</span>
                                                    <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">
                                                        {doc.content.length.toLocaleString()} caracteres
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveDocument();
                                                    }}
                                                    className="absolute top-2 right-2 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                    title="Eliminar documento"
                                                >
                                                    <Trash weight="duotone" className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 py-6">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                    <CloudArrowUp
                                                        weight="duotone"
                                                        className="w-6 h-6 text-white/40 group-hover:text-[#3E8989] transition-colors"
                                                    />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                                                        Sube un documento
                                                    </p>
                                                    <p className="text-[10px] text-white/30">
                                                        PDF, DOCX, TXT o MD
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Documentos de Ejemplo */}
                                    {!doc && !uploading && (
                                        <div className="mt-6">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-white/5"></div>
                                                <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Ejemplos</span>
                                                <div className="h-px flex-1 bg-white/5"></div>
                                            </div>
                                            <div className="space-y-2">
                                                {sampleDocuments.map((sample) => (
                                                    <button
                                                        key={sample.file}
                                                        onClick={() => handleLoadSample(sample.file)}
                                                        disabled={loadingSample}
                                                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left flex items-center gap-3 group"
                                                    >
                                                        <div className="w-8 h-8 rounded bg-[#3E8989]/10 flex items-center justify-center shrink-0 group-hover:bg-[#3E8989]/20 transition-colors">
                                                            <FileText weight="duotone" className="w-4 h-4 text-[#3E8989]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-white/80 group-hover:text-white truncate">
                                                                {sample.name}
                                                            </p>
                                                            <p className="text-[10px] text-white/40 truncate">
                                                                {sample.description}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Pie de página */}
                            <div className="p-5 border-t border-white/10 bg-white/5">
                                <p className="text-[10px] text-white/30 text-center font-medium tracking-wide">
                                    RAG CHUNKING VISUALIZER
                                </p>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
