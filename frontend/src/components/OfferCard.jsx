import { Link } from "react-router-dom";
import { ArrowUpRight, Clock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "./Reveal";

export default function OfferCard({ offer, index = 0 }) {
    const reduce = useReducedMotion();
    return (
        <motion.div
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.65, ease: EASE, delay: (index % 3) * 0.08 }}
            className="h-full"
        >
            <Link
                to={`/offres/${offer.id}`}
                data-testid={`offer-card-${offer.id}`}
                className="group flex h-full flex-col border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-navy/40"
            >
                <div className="overflow-hidden">
                    <img
                        src={offer.image}
                        alt={offer.title}
                        loading="lazy"
                        className="img-editorial h-52 w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                    />
                </div>
                <div className="flex flex-1 flex-col p-7">
                    <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy">
                            {offer.category}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-ink/35 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy" />
                    </div>
                    <h3 className="mt-4 font-serif text-2xl leading-snug text-ink transition-colors duration-300 group-hover:text-navy">
                        {offer.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/60">
                        {offer.tagline}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                        <span className="font-serif text-lg italic text-navy">
                            {offer.price}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-ink/55">
                            <Clock className="h-3.5 w-3.5" />
                            {offer.duration}
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
