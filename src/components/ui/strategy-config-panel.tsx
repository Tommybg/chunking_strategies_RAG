"use client";

import { ChunkingStrategyType } from "@/types";
import { SnappySlider } from "@/components/ui/snappy-slider";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/lib/utils";
import {
    Scissors,
    Brain,
    TreeStructure,
    FileText,
    Sparkle,
} from "@phosphor-icons/react";

interface StrategyConfigPanelProps {
    strategy: ChunkingStrategyType;
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
    className?: string;
}

export function StrategyConfigPanel({
    strategy,
    config,
    onChange,
    className,
}: StrategyConfigPanelProps) {
    const updateConfig = (key: string, value: unknown) => {
        onChange({ ...config, [key]: value });
    };

    const renderConfig = () => {
        switch (strategy) {
            case "fixed-size":
                return (
                    <div className="space-y-8">
                        <SnappySlider
                            label="Tamaño de Fragmento"
                            suffix=" chars"
                            values={[100, 200, 300, 500, 750, 1000, 1500, 2000]}
                            defaultValue={500}
                            value={(config.chunkSize as number) ?? 500}
                            onChange={(v) => updateConfig("chunkSize", v)}
                            min={100}
                            max={2000}
                            step={50}
                            snapping
                            config={{ snappingThreshold: 25 }}
                        />
                        <SnappySlider
                            label="Solapamiento"
                            suffix=" chars"
                            values={[0, 25, 50, 100, 150, 200, 300, 500]}
                            defaultValue={50}
                            value={(config.overlap as number) ?? 50}
                            onChange={(v) => updateConfig("overlap", v)}
                            min={0}
                            max={500}
                            step={10}
                            snapping
                            config={{ snappingThreshold: 10 }}
                        />
                    </div>
                );

            case "recursive":
                return (
                    <div className="space-y-8">
                        <SnappySlider
                            label="Tamaño de Fragmento"
                            suffix=" chars"
                            values={[100, 200, 300, 500, 750, 1000, 1500, 2000]}
                            defaultValue={500}
                            value={(config.chunkSize as number) ?? 500}
                            onChange={(v) => updateConfig("chunkSize", v)}
                            min={100}
                            max={2000}
                            step={50}
                            snapping
                            config={{ snappingThreshold: 25 }}
                        />
                        <SnappySlider
                            label="Solapamiento"
                            suffix=" chars"
                            values={[0, 25, 50, 100, 150, 200, 300, 500]}
                            defaultValue={50}
                            value={(config.chunkOverlap as number) ?? 50}
                            onChange={(v) => updateConfig("chunkOverlap", v)}
                            min={0}
                            max={500}
                            step={10}
                            snapping
                            config={{ snappingThreshold: 10 }}
                        />
                    </div>
                );

            case "document-structure":
                return (
                    <div className="space-y-8">
                        <SnappySlider
                            label="Tamaño Máx. Fragmento"
                            suffix=" chars"
                            values={[200, 500, 750, 1000, 1500, 2000, 2500, 3000]}
                            defaultValue={1000}
                            value={(config.maxChunkSize as number) ?? 1000}
                            onChange={(v) => updateConfig("maxChunkSize", v)}
                            min={200}
                            max={3000}
                            step={100}
                            snapping
                            config={{ snappingThreshold: 50 }}
                        />
                        <ToggleSwitch
                            label="Preserve Headings"
                            checked={(config.preserveHeadings as boolean) ?? true}
                            onChange={(v) => updateConfig("preserveHeadings", v)}
                        />
                    </div>
                );

            case "semantic":
                return (
                    <div className="space-y-8">
                        <SnappySlider
                            label="Umbral de Similitud"
                            values={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]}
                            defaultValue={0.7}
                            value={(config.similarityThreshold as number) ?? 0.7}
                            onChange={(v) => updateConfig("similarityThreshold", v)}
                            min={0.1}
                            max={0.95}
                            step={0.05}
                            snapping
                            config={{ snappingThreshold: 0.03 }}
                        />
                        <SnappySlider
                            label="Tamaño Mín. de Fragmento"
                            suffix=" chars"
                            values={[50, 100, 150, 200, 300, 500]}
                            defaultValue={100}
                            value={(config.minChunkSize as number) ?? 100}
                            onChange={(v) => updateConfig("minChunkSize", v)}
                            min={50}
                            max={500}
                            step={25}
                            snapping
                            config={{ snappingThreshold: 15 }}
                        />
                    </div>
                );

            case "llm-based":
                return (
                    <div className="space-y-8">
                        <SnappySlider
                            label="Fragmentos Objetivo"
                            values={[3, 5, 8, 10, 15, 20, 30, 50]}
                            defaultValue={10}
                            value={(config.targetChunks as number) ?? 10}
                            onChange={(v) => updateConfig("targetChunks", v)}
                            min={3}
                            max={50}
                            step={1}
                            snapping
                            config={{ snappingThreshold: 1 }}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/50">Modelo</span>
                            <select
                                value={(config.model as string) ?? "gpt-5-nano"}
                                onChange={(e) => updateConfig("model", e.target.value)}
                                className="bg-white/5 text-white text-xs rounded px-2 py-1 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#3E8989]"
                            >
                                <option value="gpt-5-nano">GPT-5 Nano</option>
                                <option value="gpt-5-mini">GPT-5 Mini</option>
                            </select>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className={cn(
                "bg-white/5 rounded-lg p-5 border border-white/10 relative z-20",
                className
            )}
        >
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-white/10">
                <StrategyIcon strategy={strategy} className="w-5 h-5 text-[#3E8989]" />
                <span className="text-sm font-medium text-white tracking-wide">
                    {getStrategyName(strategy)}
                </span>
            </div>
            {renderConfig()}
        </div>
    );
}

function StrategyIcon({
    strategy,
    className,
}: {
    strategy: ChunkingStrategyType;
    className?: string;
}) {
    const iconProps = { className, weight: "duotone" as const };

    switch (strategy) {
        case "fixed-size":
            return <Scissors {...iconProps} />;
        case "semantic":
            return <Brain {...iconProps} />;
        case "recursive":
            return <TreeStructure {...iconProps} />;
        case "document-structure":
            return <FileText {...iconProps} />;
        case "llm-based":
            return <Sparkle {...iconProps} />;
        default:
            return null;
    }
}

function getStrategyName(strategy: ChunkingStrategyType): string {
    const names: Record<ChunkingStrategyType, string> = {
        "fixed-size": "Fixed-Size",
        semantic: "Semantic",
        recursive: "Recursive",
        "document-structure": "Document Structure",
        "llm-based": "LLM-Based",
    };
    return names[strategy];
}

export { StrategyIcon, getStrategyName };
