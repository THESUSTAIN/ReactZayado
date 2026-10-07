import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo";
import { FadeUp } from "./Reveal";
import { Eyebrow } from "./Bits";

const LINKS_SERVICES = [
    ["Cockpit IA", "/services/cockpit-ia"],
    ["Optimisation d'entreprise", "/services/optimisation-entreprise"],
    ["Acquisition & transmission", "/services/acquisition-transmission"],
];

export default function Footer() {
    return (
        <footer data-testid="footer" className="bg-ink text-paper">
            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
                <FadeUp>
                    <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
                        <h2 className="max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                            Plus de clients,{" "}
                            <em className="italic text-paper/75">
                                moins de charge mentale.
                            </em>
                        </h2>
                        <Link
                            to="/diagnostic"
                            data-testid="footer-cta-button"
                            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-sand"
                        >
                            Demander un diagnostic
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </FadeUp>

                <div className="mt-20 grid gap-12 border-t border-paper/15 pt-14 md:grid-cols-3">
                    <div>
                        <Logo dark compact />
                        <p className="mt-6 max-w-xs text-sm leading-relaxed text-paper/60">
                            La maison qui réunit les services, le Cockpit IA et
                            les produits sélectionnés pour l'entrepreneur et
                            son entreprise. zayado.net
                        </p>
                    </div>
                    <div>
                        <Eyebrow dark>Services</Eyebrow>
                        <ul className="mt-5 space-y-3">
                            {LINKS_SERVICES.map(([label, to]) => (
                                <li key={to}>
                                    <Link
                                        to={to}
                                        data-testid={`footer-link-${to.split("/").pop()}`}
                                        className="text-sm text-paper/70 transition-colors duration-300 hover:text-paper"
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <Eyebrow dark>La Maison</Eyebrow>
                        <ul className="mt-5 space-y-3 text-sm text-paper/70">
                            <li>bonjour@zayado.net</li>
                            <li>zayado.net</li>
                            <li>Lun. — Ven. · 9h — 19h</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 flex flex-col justify-between gap-3 border-t border-paper/15 pt-8 text-xs text-paper/45 sm:flex-row">
                    <span>
                        © 2025 Zayado — Maison des entrepreneurs apaisés
                    </span>
                    <span>Sélection stricte, interlocuteur de confiance</span>
                </div>
            </div>
        </footer>
    );
}
