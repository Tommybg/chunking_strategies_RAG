"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Warning, XCircle, Info, X } from "@phosphor-icons/react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 11);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto-dismiss after duration (default 5 seconds)
        const duration = toast.duration || 5000;
        setTimeout(() => {
            removeToast(id);
        }, duration);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const icons = {
        success: <CheckCircle weight="fill" className="w-5 h-5 text-green-500" />,
        error: <XCircle weight="fill" className="w-5 h-5 text-red-500" />,
        warning: <Warning weight="fill" className="w-5 h-5 text-yellow-500" />,
        info: <Info weight="fill" className="w-5 h-5 text-blue-500" />,
    };

    const colors = {
        success: "bg-green-500/10 border-green-500/30",
        error: "bg-red-500/10 border-red-500/30",
        warning: "bg-yellow-500/10 border-yellow-500/30",
        info: "bg-blue-500/10 border-blue-500/30",
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`p-4 rounded-lg border backdrop-blur-xl shadow-lg ${colors[toast.type]}`}
        >
            <div className="flex items-start gap-3">
                {icons[toast.type]}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{toast.title}</p>
                    {toast.message && <p className="text-xs text-white/70 mt-1">{toast.message}</p>}
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X weight="bold" className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
