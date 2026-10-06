import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo";
import { FadeUp } from "./Reveal";
import { Eyebrow } from "./Bits";

const CATEGORIES = ["Juridique", "Comptabilité", "Bien-être", "Croissance"];

export default function Footer() {
    return (
        <footer data-testid="footer" className="bg-ink text-paper">
            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
                <FadeUp>
                    <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
                        <h2 className="max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                            Et si l'on prenait soin de tout&nbsp;—{" "}
                            <em className="italic text-paper/75">
                                de vous, et de votre entreprise&nbsp;?
                            </em>
                        </h2>
                        <Link
                            to="/rendez-vous"
                            data-testid="footer-cta-button"
                            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-sand"
                        >
                            Prendre rendez-vous
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </FadeUp>

                <div className="mt-20 grid gap-12 border-t border-paper/15 pt-14 md:grid-cols-3">
                    <div>
                        <Logo dark compact />
                        <p className="mt-6 max-w-xs text-sm leading-relaxed text-paper/60">
                            La première maison qui prend soin de l'entrepreneur
                            et de son entreprise, au même endroit.
                        </p>
                    </div>
                    <div>
                        <Eyebrow dark>Les offres</Eyebrow>
                        <ul className="mt-5 space-y-3">
                            {CATEGORIES.map((c) => (
                                <li key={c}>
                                    <Link
                                        to="/offres"
                                        data-testid={`footer-link-${c.toLowerCase().replace(/\s|é/g, (m) => (m === " " ? "-" : "e"))}`}
                                        className="text-sm text-paper/70 transition-colors duration-300 hover:text-paper"
                                    >
                                        {c}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <Eyebrow dark>La Maison</Eyebrow>
                        <ul className="mt-5 space-y-3 text-sm text-paper/70">
                            <li>bonjour@yori.fr</li>
                            <li>Paris, France</li>
                            <li>Lun. — Ven. · 9h — 19h</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 flex flex-col justify-between gap-3 border-t border-paper/15 pt-8 text-xs text-paper/45 sm:flex-row">
                    <span>© 2025 Yori — Maison des entrepreneurs apaisés</span>
                    <span>Fait avec calme, à Paris</span>
                </div>
            </div>
        </footer>
    );
}
