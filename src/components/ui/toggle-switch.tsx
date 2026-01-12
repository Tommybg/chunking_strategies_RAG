"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export function ToggleSwitch({
    checked,
    onChange,
    label,
    disabled = false,
    className,
}: ToggleSwitchProps) {
    return (
        <div className={cn("flex items-center justify-between gap-3", className)}>
            {label && (
                <span className="text-xs font-medium text-white/50">{label}</span>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                    "focus:outline-none focus:ring-2 focus:ring-[#3E8989] focus:ring-offset-2 focus:ring-offset-black",
                    checked ? "bg-[#3E8989]" : "bg-white/10",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                        checked ? "translate-x-4" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    );
}
