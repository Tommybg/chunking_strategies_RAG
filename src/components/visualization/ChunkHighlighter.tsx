'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Chunk } from '@/types';
import { useAppStore } from '@/store/app-store';

interface ChunkHighlighterProps {
    text: string;
    chunks: Chunk[];
    strategyColor: string;
}

export function ChunkHighlighter({ text, chunks, strategyColor }: ChunkHighlighterProps) {
    const { hoveredChunkId, setHoveredChunkId, selectedChunkId, setSelectedChunkId } = useAppStore();
    const [tooltipChunk, setTooltipChunk] = useState<Chunk | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // Paletas de colores duales para mejor distinción - Estilo de resaltador con sombra
    const LEFT_PANEL_COLORS = [
        'hsla(220, 80%, 65%, 0.35)',  // Azul brillante
        'hsla(240, 75%, 70%, 0.35)',  // Morado real
        'hsla(260, 75%, 70%, 0.35)',  // Morado profundo
        'hsla(200, 85%, 65%, 0.35)',  // Cyan
        'hsla(280, 70%, 70%, 0.35)',  // Violeta
        'hsla(190, 90%, 60%, 0.35)',  // Turquesa
    ];

    const RIGHT_PANEL_COLORS = [
        'hsla(340, 80%, 70%, 0.35)',  // Rosa-magenta
        'hsla(160, 80%, 60%, 0.35)',  // Verde teal
        'hsla(320, 75%, 70%, 0.35)',  // Magenta
        'hsla(180, 80%, 65%, 0.35)',  // Aguamarina
        'hsla(290, 75%, 70%, 0.35)',  // Morado-rosa
        'hsla(170, 85%, 60%, 0.35)',  // Verde agua
    ];

    const chunkColors = useMemo(() => {
        // Detectar panel por color base
        const isLeftPanel = strategyColor === '#3E8989';
        const palette = isLeftPanel ? LEFT_PANEL_COLORS : RIGHT_PANEL_COLORS;

        return chunks.map((_, index) => palette[index % palette.length]);
    }, [chunks, strategyColor]);

    // Colores de borde (más saturados y brillantes para hover)
    const borderColors = useMemo(() => {
        return chunkColors.map(color => {
            const hsl = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
            if (!hsl) return color;
            // Más saturados y brillantes para hover
            return `hsl(${hsl[1]}, ${Math.min(100, parseInt(hsl[2]) + 20)}%, ${Math.min(85, parseInt(hsl[3]) + 10)}%)`;
        });
    }, [chunkColors]);

    // Crear segmentos resaltados
    const segments = useMemo(() => {
        if (chunks.length === 0) {
            return [{ type: 'text' as const, content: text, chunk: null }];
        }

        const result: Array<{ type: 'text' | 'chunk'; content: string; chunk: Chunk | null; color?: string; borderColor?: string }> = [];
        let lastEnd = 0;

        // Ordenar fragmentos por índice de inicio
        const sortedChunks = [...chunks].sort((a, b) => a.startIndex - b.startIndex);

        for (let i = 0; i < sortedChunks.length; i++) {
            const chunk = sortedChunks[i];

            // Agregar cualquier texto antes de este fragmento
            if (chunk.startIndex > lastEnd) {
                result.push({
                    type: 'text',
                    content: text.slice(lastEnd, chunk.startIndex),
                    chunk: null,
                });
            }

            // Agregar el fragmento
            result.push({
                type: 'chunk',
                content: text.slice(chunk.startIndex, chunk.endIndex),
                chunk,
                color: chunkColors[i % chunkColors.length],
                borderColor: borderColors[i % borderColors.length],
            });

            lastEnd = chunk.endIndex;
        }

        // Agregar cualquier texto restante
        if (lastEnd < text.length) {
            result.push({
                type: 'text',
                content: text.slice(lastEnd),
                chunk: null,
            });
        }

        return result;
    }, [text, chunks, chunkColors]);

    const handleChunkHover = (chunk: Chunk | null, event?: React.MouseEvent) => {
        setHoveredChunkId(chunk?.id || null);
        if (chunk && event) {
            setTooltipChunk(chunk);
            setTooltipPosition({ x: event.clientX, y: event.clientY });
        } else {
            setTooltipChunk(null);
        }
    };

    const handleChunkClick = (chunk: Chunk) => {
        setSelectedChunkId(selectedChunkId === chunk.id ? null : chunk.id);
    };

    return (
        <div className="relative">
            {/* Leyenda de Fragmentos */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/20">
                {chunks.slice(0, 10).map((chunk, index) => (
                    <button
                        key={chunk.id}
                        onClick={() => handleChunkClick(chunk)}
                        onMouseEnter={() => setHoveredChunkId(chunk.id)}
                        onMouseLeave={() => setHoveredChunkId(null)}
                        className={`
                            px-3 py-2 rounded text-sm font-semibold
                            transition-all duration-200
                            ${selectedChunkId === chunk.id
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110'
                                : ''
                            }
                            ${hoveredChunkId === chunk.id
                                ? 'scale-105'
                                : ''
                            }
                        `}
                        style={{
                            backgroundColor: hoveredChunkId === chunk.id
                                ? borderColors[index % borderColors.length].replace('hsl', 'hsla').replace(')', ', 0.5)')
                                : chunkColors[index % chunkColors.length],
                            border: selectedChunkId === chunk.id ? `2px solid white` : `1px solid ${borderColors[index % borderColors.length]}`,
                            borderRadius: '4px',
                        }}
                    >
                        Chunk {index + 1}
                        <span className="ml-1 text-xs opacity-75">
                            {chunk.text.length} chars
                        </span>
                    </button>
                ))}
                {chunks.length > 10 && (
                    <span className="px-3 py-1.5 text-sm text-white/60 font-medium">
                        +{chunks.length - 10} more
                    </span>
                )}
            </div>

            {/* Texto Resaltado */}
            <div className="text-base leading-relaxed text-white whitespace-pre-wrap">
                {segments.map((segment, index) => {
                    if (segment.type === 'text') {
                        return (
                            <span key={index} className="text-white/70">
                                {segment.content}
                            </span>
                        );
                    }

                    const isHovered = hoveredChunkId === segment.chunk?.id;
                    const isSelected = selectedChunkId === segment.chunk?.id;

                    return (
                        <motion.span
                            key={segment.chunk?.id || index}
                            role="button"
                            tabIndex={0}
                            aria-label={`Chunk ${index + 1}: ${segment.content.slice(0, 50)}...`}
                            onClick={() => segment.chunk && handleChunkClick(segment.chunk)}
                            onMouseEnter={(e) => handleChunkHover(segment.chunk, e)}
                            onMouseLeave={() => handleChunkHover(null)}
                            onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ' ') && segment.chunk) {
                                    e.preventDefault();
                                    handleChunkClick(segment.chunk);
                                }
                            }}
                            className={`
                                inline cursor-pointer transition-all duration-150
                                ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}
                            `}
                            style={{
                                backgroundColor: isHovered
                                    ? (segment.borderColor || '').replace('hsl', 'hsla').replace(')', ', 0.45)')
                                    : segment.color,
                                borderRadius: '4px',
                                boxDecorationBreak: 'clone',
                                WebkitBoxDecorationBreak: 'clone',
                                padding: '2px 0',
                            }}
                            transition={{ duration: 0.1 }}
                        >
                            {segment.content}
                        </motion.span>
                    );
                })}
            </div>

            {/* Tooltip (Información emergente) */}
            <AnimatePresence>
                {tooltipChunk && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed z-50 p-3 glass-card max-w-xs pointer-events-none"
                        style={{
                            left: Math.min(tooltipPosition.x + 10, window.innerWidth - 260),
                            top: tooltipPosition.y + 10,
                        }}
                    >
                        <p className="text-xs font-bold text-white mb-1">
                            {tooltipChunk.id}
                        </p>
                        <p className="text-xs text-white/70 mb-2">
                            {tooltipChunk.text.slice(0, 100)}...
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-white/50">Size:</span>
                                <span className="text-white ml-1">{tooltipChunk.text.length}</span>
                            </div>
                            <div>
                                <span className="text-white/50">Position:</span>
                                <span className="text-white ml-1">{tooltipChunk.startIndex}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Función auxiliar para convertir hex a HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 180, s: 50, l: 40 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
