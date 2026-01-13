import * as React from "react";
import { cn } from "@/lib/utils";

interface CustomSliderProps {
    values: number[];
    defaultValue: number;
    value?: number;
    resetKey?: number;
    snapping?: boolean;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    config?: {
        snappingThreshold?: number;
        labelFormatter?: (value: number) => string;
    };
    label: string;
    prefix?: string;
    suffix?: string;
    className?: string;
}

const formatNumber = (value: number, step: number = 1): string => {
    const numValue = Number(value);
    if (isNaN(numValue)) {
        throw new Error(`Invalid number value: ${value}`);
    }

    const decimalPlaces = step.toString().split(".")[1]?.length || 0;
    if (decimalPlaces === 0 && Number.isInteger(numValue)) {
        return numValue.toString();
    }
    return numValue.toFixed(decimalPlaces);
};

const SnappySlider = React.forwardRef<HTMLDivElement, CustomSliderProps>(
    (
        {
            values,
            defaultValue,
            value,
            resetKey,
            snapping = true,
            min: providedMin,
            max: providedMax,
            step,
            onChange,
            config = {},
            label,
            prefix,
            suffix,
            className,
            ...props
        },
        ref
    ) => {
        const sliderRef = React.useRef<HTMLDivElement>(null);
        const { snappingThreshold = 1 } = config;

        const defaultValueArray = [...values, defaultValue].sort((a, b) => a - b);

        const inputMin = providedMin ?? Math.min(...defaultValueArray);
        const inputMax = providedMax ?? Math.max(...defaultValueArray);

        const sliderValues =
            providedMin !== undefined && providedMax !== undefined
                ? defaultValueArray.filter((v) => v >= providedMin && v <= providedMax)
                : defaultValueArray;

        const sliderMin = Math.min(...sliderValues);
        const sliderMax = Math.max(...sliderValues);

        const computedStep = step ?? 1;

        const [internalValue, setInternalValue] = React.useState(defaultValue);
        const currentValue = value ?? internalValue;

        const [inputValue, setInputValue] = React.useState(
            formatNumber(currentValue, computedStep)
        );

        const isOutOfBounds = currentValue < sliderMin || currentValue > sliderMax;

        const sliderPercentage =
            ((Math.min(Math.max(currentValue, sliderMin), sliderMax) - sliderMin) /
                (sliderMax - sliderMin)) *
            100;

        React.useEffect(() => {
            if (value !== undefined) {
                setInternalValue(value);
                setInputValue(formatNumber(value, computedStep));
            }
        }, [value, computedStep]);

        const handleValueChange = (newValue: number) => {
            setInternalValue(newValue);
            setInputValue(formatNumber(newValue, computedStep));
            onChange(newValue);
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value);
        };

        const handleInputBlur = () => {
            const newValue = Number(inputValue);

            if (isNaN(newValue)) {
                setInputValue(formatNumber(currentValue, computedStep));
            } else {
                const clampedValue = Math.max(inputMin, Math.min(inputMax, newValue));
                const steppedValue =
                    Math.round(clampedValue / computedStep) * computedStep;
                setInputValue(formatNumber(steppedValue, computedStep));
                handleValueChange(steppedValue);
            }
        };

        const handleInteraction = React.useCallback(
            (clientX: number) => {
                const slider = sliderRef.current;
                if (!slider) return;

                const rect = slider.getBoundingClientRect();
                const percentage = Math.max(
                    0,
                    Math.min(1, (clientX - rect.left) / rect.width)
                );
                const rawValue = percentage * (sliderMax - sliderMin) + sliderMin;

                if (snapping) {
                    const snapPoints = [...new Set([...defaultValueArray, currentValue])].sort(
                        (a, b) => a - b
                    );
                    const closestValue = snapPoints.reduce((prev, curr) => {
                        return Math.abs(curr - rawValue) < Math.abs(prev - rawValue)
                            ? curr
                            : prev;
                    });

                    if (Math.abs(closestValue - rawValue) <= snappingThreshold) {
                        handleValueChange(closestValue);
                        return;
                    }
                }

                const steppedValue = Math.round(rawValue / computedStep) * computedStep;
                const clampedValue = Math.max(
                    sliderMin,
                    Math.min(sliderMax, steppedValue)
                );
                handleValueChange(clampedValue);
            },
            [
                sliderMin,
                sliderMax,
                defaultValueArray,
                currentValue,
                computedStep,
                snapping,
                snappingThreshold,
            ]
        );

        React.useEffect(() => {
            const slider = sliderRef.current;
            if (!slider) return;

            const handleMouseDown = (e: MouseEvent) => {
                e.preventDefault();
                handleInteraction(e.clientX);
                document.body.style.userSelect = "none";

                const handleMouseMove = (e: MouseEvent) => {
                    handleInteraction(e.clientX);
                };

                const handleMouseUp = () => {
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.body.style.userSelect = "";
                };

                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp, { once: true });
            };

            const handleTouchStart = (e: TouchEvent) => {
                e.preventDefault();
                handleInteraction(e.touches[0].clientX);

                const handleTouchMove = (e: TouchEvent) => {
                    handleInteraction(e.touches[0].clientX);
                };

                document.addEventListener("touchmove", handleTouchMove, {
                    passive: false,
                });
                document.addEventListener(
                    "touchend",
                    () => {
                        document.removeEventListener("touchmove", handleTouchMove);
                    },
                    { once: true }
                );
            };

            slider.addEventListener("mousedown", handleMouseDown);
            slider.addEventListener("touchstart", handleTouchStart, {
                passive: false,
            });

            return () => {
                slider.removeEventListener("mousedown", handleMouseDown);
                slider.removeEventListener("touchstart", handleTouchStart);
                document.body.style.userSelect = "";
            };
        }, [handleInteraction]);

        React.useEffect(() => {
            const slider = sliderRef.current;
            if (!slider) return;

            const handleDoubleClick = () => {
                onChange(defaultValue);
            };

            slider.addEventListener("dblclick", handleDoubleClick);
            return () => slider.removeEventListener("dblclick", handleDoubleClick);
        }, [onChange, defaultValue]);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const current = Number(inputValue);
                if (isNaN(current)) return;

                const newValue =
                    current + (e.key === "ArrowUp" ? computedStep : -computedStep);
                const clampedValue = Math.max(sliderMin, Math.min(sliderMax, newValue));

                setInputValue(formatNumber(clampedValue, computedStep));
                onChange(clampedValue);
            }
        };

        return (
            <div
                className={cn(
                    "[--mark-slider-gap:0.5rem] [--mark-slider-height:1.5rem] [--mark-slider-track-height:0.5rem] [--mark-slider-marker-width:1px]",
                    "flex flex-col gap-[--mark-slider-gap] pb-6",
                    className
                )}
                {...props}
            >
                <SnappySliderHeader>
                    <SnappySliderLabel>{label}</SnappySliderLabel>
                    <SnappySliderValue
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        prefix={prefix}
                        suffix={suffix}
                        className={cn(isOutOfBounds && "opacity-75")}
                    />
                </SnappySliderHeader>
                <div className="relative h-[--mark-slider-height]">
                    <div ref={sliderRef} className="absolute inset-0 cursor-pointer">
                        <div className="absolute top-1/2 -translate-y-1/2 w-full h-[--mark-slider-track-height] bg-[#3E8989]/20 rounded-sm overflow-hidden">
                            {/* Progress overlay */}
                            <div
                                className="absolute top-0 h-full z-[1] bg-[#3E8989]"
                                style={{ width: `${sliderPercentage}%` }}
                            />

                            {/* Regular marks */}
                            {sliderValues.map((mark, index) => {
                                if (mark === sliderMin) return null;
                                const markPercentage =
                                    ((mark - sliderMin) / (sliderMax - sliderMin)) * 100;
                                if (markPercentage < 0 || markPercentage > 100) return null;
                                return (
                                    <div
                                        key={`${mark}-${index}`}
                                        className="absolute top-0 w-[--mark-slider-marker-width] z-[2] h-full -translate-x-[calc(var(--mark-slider-marker-width)/2)] bg-white/30"
                                        style={{ left: `${markPercentage}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Thumb */}
                        <div
                            className={cn(
                                "absolute z-30 top-0 -translate-y-full -translate-x-1/2 cursor-grab active:cursor-grabbing mb-1",
                                isOutOfBounds && "opacity-75"
                            )}
                            style={{ left: `${sliderPercentage}%` }}
                        >
                            {/* Triangle */}
                            <div
                                className={cn(
                                    "w-0 h-0 border-[3px] border-transparent border-b-[#3E8989]",
                                    isOutOfBounds && "border-b-[#3E8989]/20"
                                )}
                            />
                            {/* Square */}
                            <div
                                className={cn(
                                    "w-[6px] h-[6px]",
                                    isOutOfBounds ? "bg-[#3E8989]/20" : "bg-[#3E8989]"
                                )}
                            />
                            {/* Text */}
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span
                                    className={cn(
                                        "text-[10px] font-medium text-white/70",
                                        isOutOfBounds && "opacity-75"
                                    )}
                                >
                                    {isOutOfBounds
                                        ? currentValue < sliderMin
                                            ? `<${formatNumber(sliderMin, computedStep)}`
                                            : `>${formatNumber(sliderMax, computedStep)}`
                                        : formatNumber(currentValue, computedStep)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
SnappySlider.displayName = "SnappySlider";

const SnappySliderHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex justify-between items-center mb-0.5", className)}
        {...props}
    />
));
SnappySliderHeader.displayName = "SnappySliderHeader";

const SnappySliderLabel = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn("text-xs font-medium text-white/50", className)}
        {...props}
    />
));
SnappySliderLabel.displayName = "SnappySliderLabel";

const SnappySliderValue = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & {
        prefix?: string;
        suffix?: string;
    }
>(({ className, prefix, suffix, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const value = parseFloat(input.value);

        switch (e.key) {
            case "Enter":
                input.blur();
                break;
            case "ArrowUp":
                e.preventDefault();
                if (!isNaN(value)) {
                    const step = e.shiftKey ? 10 : 1;
                    input.value = String(value + step);
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                if (!isNaN(value)) {
                    const step = e.shiftKey ? 10 : 1;
                    input.value = String(value - step);
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                }
                break;
        }
    };

    return (
        <div
            className="group inline-flex items-center bg-white/5 rounded px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-[#3E8989] cursor-text"
            onClick={handleContainerClick}
        >
            {prefix && (
                <span className="text-xs text-white/50 select-none shrink-0">
                    {prefix}
                </span>
            )}
            <input
                ref={(node) => {
                    if (typeof ref === "function") ref(node);
                    else if (ref) ref.current = node;
                    inputRef.current = node;
                }}
                type="number"
                inputMode="decimal"
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-16 min-w-0 text-right text-xs bg-transparent border-none focus:outline-none",
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    "tabular-nums text-white",
                    className
                )}
                {...props}
            />
            {suffix && (
                <span className="text-xs text-white/50 select-none shrink-0 ml-0.5">
                    {suffix}
                </span>
            )}
        </div>
    );
});
SnappySliderValue.displayName = "SnappySliderValue";

export { SnappySlider };
