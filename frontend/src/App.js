import { Component, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "@/components/ui/sonner";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Catalogue from "@/pages/Catalogue";
import OfferDetail from "@/pages/OfferDetail";
import RendezVous from "@/pages/RendezVous";

function SmoothScroll() {
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
        window.__lenis = lenis;
        let raf = requestAnimationFrame(function loop(t) {
            lenis.raf(t);
            raf = requestAnimationFrame(loop);
        });
        return () => {
            cancelAnimationFrame(raf);
            lenis.destroy();
            window.__lenis = null;
        };
    }, []);
    return null;
}

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
        else window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        if (this.state.failed) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center text-ink">
                    <p className="font-serif text-4xl">Un instant de pause…</p>
                    <p className="max-w-md text-sm text-ink/60">
                        Quelque chose s'est interrompu. Revenez à l'accueil en
                        toute sérénité.
                    </p>
                    <Link
                        to="/"
                        data-testid="error-back-home"
                        className="rounded-full bg-navy px-7 py-3 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
                    >
                        Retour à l'accueil
                    </Link>
                </div>
            );
        }
        return this.props.children;
    }
}

function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sand px-6 text-center text-ink">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy">
                Erreur 404
            </p>
            <h1 className="font-serif text-5xl">Cette pièce est vide.</h1>
            <p className="max-w-sm text-sm text-ink/60">
                La page que vous cherchez n'existe pas — ou a déménagé vers de
                meilleurs horaires.
            </p>
            <Link
                to="/"
                data-testid="notfound-back-home"
                className="rounded-full bg-navy px-7 py-3 text-sm font-semibold text-paper transition-colors duration-300 hover:bg-navy-soft"
            >
                Retour à l'accueil
            </Link>
        </main>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <SmoothScroll />
                <ScrollToTop />
                <div className="grain-overlay" aria-hidden="true" />
                <Nav />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/offres" element={<Catalogue />} />
                    <Route path="/offres/:id" element={<OfferDetail />} />
                    <Route path="/rendez-vous" element={<RendezVous />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
                <Toaster position="bottom-right" richColors />
            </BrowserRouter>
        </ErrorBoundary>
    );
}
