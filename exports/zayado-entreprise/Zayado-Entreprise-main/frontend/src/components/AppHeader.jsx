import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LogoWordmark } from "./Logo";

// Header de la zone « appli » (pages Cockpit & diagnostic) : différent du header
// boutique — juste le logo et un bouton qui ramène vers la marketplace.
export default function AppHeader({ cta = "Faire le diagnostic" }) {
  return (
    <header className="zayado-app-bg sticky top-0 z-50 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }} data-testid="app-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link to="/" data-testid="app-header-logo" aria-label="Zayado — accueil vitrine">
          <LogoWordmark light />
        </Link>
        <Link
          to="/marketplace"
          data-testid="app-header-cta"
          className="btn btn-creme inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold"
        >
          {cta} <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}
