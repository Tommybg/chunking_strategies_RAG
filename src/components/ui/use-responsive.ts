import { useEffect, useState } from "react";

const BREAKPOINTS = {
    SM: 0,
    MD: 600,
    LG: 960,
    XL: 1200
};

export const useResponsive = (styles: any) => {
    const [responsiveStyles, setResponsiveStyles] = useState(styles);

    useEffect(() => {
        const getResponsive = (styles: any) => {
            let current;
            if (typeof styles === "object" && styles !== null) {
                if (styles.sm && window.innerWidth >= BREAKPOINTS.SM) {
                    current = styles.sm;
                }
                if (styles.md && window.innerWidth >= BREAKPOINTS.MD) {
                    current = styles.md;
                }
                if (styles.lg && window.innerWidth >= BREAKPOINTS.LG) {
                    current = styles.lg;
                }
                if (styles.xl && window.innerWidth >= BREAKPOINTS.XL) {
                    current = styles.xl;
                }
                // Fallback or default if no breakpoint matches or simple value
                if (!current && styles.sm) current = styles.sm;
            } else {
                current = styles;
            }
            return current;
        };

        const listener = () => {
            setResponsiveStyles(getResponsive(styles));
        };

        // Initial check
        listener();

        window.addEventListener("resize", listener);

        return () => {
            window.removeEventListener("resize", listener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(styles)]);

    return responsiveStyles;
};
