'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from '@phosphor-icons/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ComparisonPanel } from '@/components/layout/ComparisonPanel';
import { useAppStore } from '@/store/app-store';
import { Book } from '@/components/ui/book';

import { FallingPattern } from '@/components/ui/falling-pattern';

export default function Home() {
  const { sidebarOpen } = useAppStore();
  const [showDescription, setShowDescription] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Degradados de fondo - Persistentes */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#3E8989]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#4FA9A9]/5 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {!hasEntered ? (
          <motion.div
            key="landing"
            className="flex flex-col items-center justify-center h-screen w-full z-50 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 z-0">
              <FallingPattern color="#3E8989" />
            </div>

            <div className="z-10 flex flex-col items-center justify-center">
              <div
                className="cursor-pointer transition-transform duration-500"
                onClick={() => setHasEntered(true)}
              >
                <Book
                  title="Estrategias de Chunking para RAG"
                  author="Por: Tommy BG ♥️"
                  width={240}
                  variant="stripe"
                  textColor="#ffffff"
                  color="#000000"
                  bottomColor="#3E8989"
                />
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-12 text-white/30 text-[10px] font-medium tracking-[0.2em] uppercase hover:text-white/50 transition-colors duration-300"
              >
                Click to Open
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            className="flex h-full w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Barra Lateral */}
            <Sidebar />

            {/* Contenido Principal */}
            <motion.main
              className="relative h-screen flex flex-col w-full"
              initial={false}
              animate={{
                marginLeft: sidebarOpen ? 320 : 0,
                paddingLeft: sidebarOpen ? 0 : 60,
              }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Encabezado con espaciado generoso */}
              <header className="px-12 pt-16 pb-24 flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-6 relative">
                  <h1 className="text-5xl font-bold text-white tracking-tight">
                    Compara{' '}
                    <span className="bg-gradient-to-r from-[#3E8989] to-[#4FA9A9] bg-clip-text text-transparent">
                      Estrategias de Chunking
                    </span>
                  </h1>

                  {/* Botón de Información y Popover */}
                  <div className="relative flex items-center">
                    <button
                      onClick={() => setShowDescription(!showDescription)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border border-transparent ${showDescription
                        ? 'bg-[#3E8989] text-white shadow-[0_0_20px_rgba(62,137,137,0.4)]'
                        : 'bg-white/5 text-white/40 hover:bg-[#3E8989]/20 hover:text-[#3E8989] hover:border-[#3E8989]/30'
                        }`}
                      title="Información"
                    >
                      <Info weight="bold" className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {showDescription && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 top-full mt-6 w-[440px] bg-[#18181B]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl z-50 origin-top-left"
                        >
                          {/* Flecha apuntando hacia arriba */}
                          <div className="absolute left-3 -top-2 w-4 h-4 bg-[#18181B]/80 border-t border-l border-white/10 rotate-45 backdrop-blur-2xl" />

                          <p className="text-white/70 leading-relaxed text-sm">
                            Sube un documento y observa cómo diferentes estrategias de chunking segmentan tu texto.
                            Compara lado a lado para encontrar el mejor enfoque para tu pipeline de RAG.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </header>

              {/* Espaciador para separación limpia */}
              <div className="h-16" />

              {/* Paneles de Comparación - mantiene altura completa de lectura */}
              <div className="px-10 pb-10 flex gap-8 flex-1 min-h-0">
                <ComparisonPanel side="left" />

                {/* Divisor */}
                <div className="w-px bg-white/5" />

                <ComparisonPanel side="right" />
              </div>
            </motion.main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

