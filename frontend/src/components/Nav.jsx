import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const LINKS = [
    { label: "La Maison", to: "/", hash: "maison", slug: "maison" },
    { label: "Les offres", to: "/offres", slug: "offres" },
    { label: "Le marché", to: "/", hash: "marche", slug: "marche" },
];

export function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -84 });
    else el.scrollIntoView({ behavior: "smooth" });
}

export default function Nav() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    const go = (link) => (e) => {
        e.preventDefault();
        setOpen(false);
        if (link.hash) {
            if (location.pathname !== "/") {
                navigate("/");
                setTimeout(() => scrollToId(link.hash), 420);
            } else {
                scrollToId(link.hash);
            }
        } else {
            navigate(link.to);
        }
    };

    const solid = scrolled || open;

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                solid
                    ? "border-b border-line/70 bg-paper/85 backdrop-blur-xl"
                    : "bg-transparent"
            }`}
        >
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                <a
                    href="/"
                    data-testid="nav-logo"
                    onClick={go({ to: "/" })}
                    className="transition-opacity duration-300 hover:opacity-75"
                >
                    <Logo />
                </a>

                <div className="hidden items-center gap-9 md:flex">
                    {LINKS.map((l) => (
                        <a
                            key={l.label}
                            href={l.to}
                            data-testid={`nav-link-${l.slug}`}
                            onClick={go(l)}
                            className="group relative text-sm font-medium text-ink/75 transition-colors duration-300 hover:text-navy"
                        >
                            {l.label}
                            <span className="absolute -bottom-1 left-0 h-px w-0 bg-navy transition-all duration-300 group-hover:w-full" />
                        </a>
                    ))}
                    <a
                        href="/rendez-vous"
                        data-testid="nav-cta-button"
                        onClick={go({ to: "/rendez-vous" })}
                        className="rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                    >
                        Prendre rendez-vous
                    </a>
                </div>

                <button
                    type="button"
                    data-testid="mobile-menu-button"
                    aria-label="Menu"
                    onClick={() => setOpen((v) => !v)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper/80 text-ink md:hidden"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-x-0 top-[73px] z-40 h-[calc(100vh-73px)] border-t border-line bg-paper md:hidden"
                    >
                        <div className="flex h-full flex-col justify-between px-6 pb-10 pt-10">
                            <div className="flex flex-col">
                                {LINKS.map((l) => (
                                    <a
                                        key={l.label}
                                        href={l.to}
                                        data-testid={`mobile-link-${l.slug}`}
                                        onClick={go(l)}
                                        className="border-b border-line/70 py-5 font-serif text-4xl text-ink"
                                    >
                                        {l.label}
                                    </a>
                                ))}
                            </div>
                            <a
                                href="/rendez-vous"
                                data-testid="mobile-cta-button"
                                onClick={go({ to: "/rendez-vous" })}
                                className="rounded-full bg-navy py-4 text-center text-sm font-semibold text-paper"
                            >
                                Prendre rendez-vous
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
