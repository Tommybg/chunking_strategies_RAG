"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "@phosphor-icons/react";
import { ChunkingStrategyType } from "@/types";

interface StrategyInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    strategy: ChunkingStrategyType;
}

const strategyInfo: Record<ChunkingStrategyType, {
    title: string;
    subtitle: string;
    howItWorks: string[];
    knobs: { label: string; description: string }[];
    pros: string[];
    cons: string[];
    useCase: string;
}> = {
    "fixed-size": {
        title: "Fragmentado de Tamaño Fijo",
        subtitle: "El Enfoque de Cortador de Galletas",
        howItWorks: [
            "Contar caracteres (o tokens)",
            "Cortar el texto al límite de tamaño (ej: 500 caracteres)",
            "Retroceder la cantidad de superposición (ej: 50 caracteres) para asegurar que no se pierda contexto",
            "Repetir hasta el final"
        ],
        knobs: [
            { label: "Tamaño de Fragmento", description: "Qué tan grande es cada pieza. Más grande = más contexto, pero menos precisión" },
            { label: "Superposición", description: "Cuánto del fragmento anterior se mezcla en el siguiente. Previene cortar oraciones a la mitad" }
        ],
        pros: [
            "Rápido y predecible",
            "Fácil de implementar",
            "Funciona con cualquier texto"
        ],
        cons: [
            "Rompe oraciones a mitad de pensamiento",
            "Ignora límites semánticos",
            "El contexto puede dividirse incómodamente"
        ],
        useCase: "Caché simple, datasets muy grandes donde la precisión importa menos"
    },
    "semantic": {
        title: "Fragmentado Semántico",
        subtitle: "El Creador de Significado",
        howItWorks: [
            "Dividir texto en oraciones",
            "Generar un embedding vectorial para cada oración",
            "Comparar similitud de coseno entre oraciones consecutivas",
            "Si la similitud es alta (sobre el umbral), fusionarlas en el mismo fragmento",
            "Si la similitud baja (bajo el umbral), iniciar un nuevo fragmento"
        ],
        knobs: [
            { label: "Umbral de Similitud", description: "0.0-1.0. Mayor = más estricto (oraciones deben ser muy similares). Menor = más flexible" },
            { label: "Tamaño Mínimo", description: "Previene crear fragmentos diminutos solo porque una oración fue única" }
        ],
        pros: [
            "Crea los fragmentos más coherentes",
            "Asegura que fragmentos contengan exactamente una idea/tema",
            "Mejor para calidad de recuperación"
        ],
        cons: [
            "Lento y costoso (requiere muchas llamadas de embedding)",
            "Alta latencia",
            "Requiere acceso a modelo de embeddings"
        ],
        useCase: "RAG de alta calidad donde la deriva de temas perjudica el rendimiento"
    },
    "recursive": {
        title: "Fragmentado Recursivo",
        subtitle: "El Cortador Inteligente",
        howItWorks: [
            "Comenzar con separadores en orden de prioridad: párrafos → líneas → oraciones → palabras",
            "Intentar dividir por el primer separador (párrafos)",
            "Si el fragmento es menor que el objetivo, conservarlo",
            "Si es mayor, cambiar al siguiente separador (oraciones) y dividir ese fragmento",
            "Fusionar fragmentos pequeños adyacentes hasta alcanzar el límite de tamaño"
        ],
        knobs: [
            { label: "Tamaño de Fragmento", description: "El tamaño objetivo flexible para un fragmento" },
            { label: "Superposición", description: "Asegura continuidad entre fragmentos fusionados" }
        ],
        pros: [
            "Mantiene párrafos y oraciones intactos",
            "Mucho mejor coherencia que tamaño fijo",
            "Buen balance entre velocidad y calidad"
        ],
        cons: [
            "Ligeramente más costoso computacionalmente",
            "Puede resultar en fragmentos muy pequeños/grandes si la puntuación es rara"
        ],
        useCase: "Texto de propósito general, artículos de blog, artículos (Opción por Defecto)"
    },
    "document-structure": {
        title: "Fragmentado por Estructura de Documento",
        subtitle: "El Arquitecto",
        howItWorks: [
            "Analizar la jerarquía del documento (Encabezados H1, H2, H3)",
            "Agrupar todo el contenido bajo un encabezado en un bloque lógico",
            "Si la sección es mayor que el tamaño máximo, recurrir al fragmentado recursivo",
            "Preservar encabezados padre en los metadatos de fragmentos hijo"
        ],
        knobs: [
            { label: "Tamaño Máximo", description: "Cuándo forzar una división dentro de una sección" },
            { label: "Preservar Encabezados", description: "Si anteponer el texto del encabezado al contenido del fragmento (esencial para contexto RAG)" }
        ],
        pros: [
            "Excelente para documentos estructurados (manuales, documentos legales)",
            "Preserva contexto global (saber que Sección 5 pertenece a Capítulo 1)",
            "Mantiene jerarquía del documento"
        ],
        cons: [
            "Falla en archivos de texto plano sin encabezados",
            "Requiere buen formato del documento fuente"
        ],
        useCase: "Manuales técnicos, contratos legales, documentación de API"
    },
    "llm-based": {
        title: "Fragmentado Basado en LLM",
        subtitle: "El Agente Inteligente",
        howItWorks: [
            "Alimentar texto a un LLM (GPT-4o) con prompt específico",
            "El LLM identifica fragmentos independientes y autónomos basándose en flujo y lógica",
            "Devuelve segmentos de texto exactos que considera deben ser fragmentos",
            "Verificación de alineación de texto mapea la salida del LLM a índices de fuente original"
        ],
        knobs: [
            { label: "Fragmentos Objetivo", description: "Sugerencia al LLM sobre qué tan granular ser" },
            { label: "Modelo", description: "GPT-4o-mini (más rápido) vs GPT-4o (más inteligente)" }
        ],
        pros: [
            "Límites de más alta calidad",
            "Puede entender matices complejos (sarcasmo, formato extraño)",
            "Se adapta a cualquier estructura de texto"
        ],
        cons: [
            "Más costoso y lento",
            "Depende de disponibilidad de API externa",
            "Puede tener leves inconsistencias"
        ],
        useCase: "Texto complejo y desordenado no estructurado donde las reglas fallan"
    }
};

export function StrategyInfoModal({ isOpen, onClose, strategy }: StrategyInfoModalProps) {
    const info = strategyInfo[strategy];

    if (!info) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#363946]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-[101]"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-[#363946]/95 backdrop-blur-xl border-b border-white/10 p-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{info.title}</h2>
                                <p className="text-sm text-[#4FA9A9] italic">{info.subtitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X weight="bold" className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* How it Works */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <span className="text-[#3E8989]">🔍</span>
                                    Cómo Funciona
                                </h3>
                                <ol className="space-y-2 list-decimal list-inside text-white/80 text-sm">
                                    {info.howItWorks.map((step, i) => (
                                        <li key={i} className="leading-relaxed">{step}</li>
                                    ))}
                                </ol>
                            </div>

                            {/* Configuration Knobs */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <span className="text-[#3E8989]">⚙️</span>
                                    Configuración
                                </h3>
                                <div className="space-y-3">
                                    {info.knobs.map((knob, i) => (
                                        <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                            <h4 className="font-medium text-white text-sm mb-1">{knob.label}</h4>
                                            <p className="text-white/60 text-xs">{knob.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pros & Cons */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Pros */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <span className="text-green-400">✅</span>
                                        Ventajas
                                    </h3>
                                    <ul className="space-y-2">
                                        {info.pros.map((pro, i) => (
                                            <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                                <span className="text-green-400 mt-0.5">•</span>
                                                <span>{pro}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Cons */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <span className="text-red-400">❌</span>
                                        Desventajas
                                    </h3>
                                    <ul className="space-y-2">
                                        {info.cons.map((con, i) => (
                                            <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                                                <span className="text-red-400 mt-0.5">•</span>
                                                <span>{con}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Best Use Case */}
                            <div className="bg-[#3E8989]/10 border border-[#3E8989]/30 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-[#3E8989] mb-2">Mejor Caso de Uso</h3>
                                <p className="text-white/80 text-sm">{info.useCase}</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
