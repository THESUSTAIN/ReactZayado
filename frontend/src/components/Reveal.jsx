import { motion, useReducedMotion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1];

export function MaskedLine({ children, delay = 0, className = "" }) {
    const reduce = useReducedMotion();
    return (
        <span className={`block overflow-hidden ${className}`}>
            <motion.span
                className="block"
                initial={reduce ? { y: 0 } : { y: "112%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.95, ease: EASE, delay }}
            >
                {children}
            </motion.span>
        </span>
    );
}

export function FadeUp({
    children,
    delay = 0,
    y = 30,
    className = "",
    amount = 0.15,
}) {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount }}
            transition={{ duration: 0.8, ease: EASE, delay }}
        >
            {children}
        </motion.div>
    );
}
