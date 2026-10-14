import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LogoWordmark } from "./Logo";

// Header du tunnel : zéro distraction — juste le logo et un seul bouton.
export default function FunnelHeader() {
  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ background: "rgba(253,252,248,0.92)", borderColor: "var(--line)" }} data-testid="funnel-header">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link to="/" data-testid="funnel-header-logo" aria-label="Zayado">
          <LogoWordmark />
        </Link>
        <Link to="/diagnostic" data-testid="funnel-header-cta" className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-[14px]">
          Faire le diagnostic <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}
