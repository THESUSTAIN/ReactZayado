import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight, Sparkles, Compass, Anchor, Sun, Leaf, Quote,
  CheckCircle2, Slack, Calendar, Mail, CreditCard, FileText, Github
} from "lucide-react";
import { useWPPage, parseWPContent, getSection } from "@/lib/wpContent";
import useWpContent from "@/hooks/useWpContent";
import { PublicHeader, UnifiedFooter } from "@/pages/LandingHub";

const NavBar = () => (
  <header className="sticky top-0 z-50 glass border-b border-outline">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2.5" data-testid="logo-zayado">
        <div className="w-9 h-9 rounded-full bg-aubergine flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-cream" />
        </div>
        <span className="text-[19px] tracking-tight font-medium text-ink">Zayado<span className="text-aubergine">.</span></span>
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
        <Link to="/myextension-ai" className="hover:text-aubergine transition">MyExtension AI</Link>
        <Link to="/vision" className="hover:text-aubergine transition">Vision Board</Link>
        <Link to="/expansion-agent" className="hover:text-aubergine transition">Expansion Agent</Link>
        <Link to="/boutique" className="hover:text-aubergine transition">Boutique</Link>
      </nav>
      <a
        href="https://app.zayado.net/login"
        target="_self"
        data-testid="nav-start-cta"
        className="inline-flex items-center gap-2 bg-aubergine hover:bg-aubergine-deep text-cream px-4 py-2 rounded-full text-sm transition-colors"
      >
        Commencer
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  </header>
);

const Hero = ({ wp }) => {
  const hero = getSection(wp, "hero", { heading: "Entreprendre avec <span class=\"font-serif-italic\" style=\"color:#b89855\">sens, clarté et stabilité.</span>" });
  const titleHTML = hero.heading || "Entreprendre avec <span class=\"font-serif-italic\" style=\"color:#b89855\">sens, clarté et stabilité.</span>";
  const subtitleHTML = hero.subtitle || "L'IA prépare <b class=\"text-ink\">70%</b> du travail. Toi, tu apportes le <span class=\"fancy-underline relative\"> jugement</span>, la vision, le sens.";
  const eyebrow = hero.extras?.eyebrow || hero.extras?.["eyebrow-petite-etiquette-en-haut"] || "Le cockpit business des entrepreneurs ambitieux";
  const ctaPrimary = hero.extras?.["bouton-principal"] || hero.extras?.bouton || "Préparer mon cockpit";
  const ctaSecondary = hero.extras?.["lien-secondaire"] || "Voir comment ça marche";
  const socialProof = hero.extras?.["social-proof"] || "+ 180 fondateurs ont déjà posé leur Pourquoi cette semaine.";
  return (
  <section className="relative pt-20 pb-24 overflow-hidden">
    <div className="absolute inset-0 dotted-bg opacity-50" />
    <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-blush/40 blur-3xl" />
    <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-sky/40 blur-3xl" />

    <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10 items-center">
      <div className="lg:col-span-7">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-outline text-xs text-ink/70 mb-6 animate-rise" data-testid="hero-eyebrow">
          <span className="w-1.5 h-1.5 rounded-full bg-aubergine" />
          {eyebrow}
        </div>
        <h1
          data-testid="hero-title"
          className="font-medium tracking-tight text-[3rem] sm:text-[3.5rem] lg:text-[4.6rem] leading-[0.95] text-ink animate-rise"
          dangerouslySetInnerHTML={{ __html: titleHTML }}
        />
        <p
          data-testid="hero-subtitle"
          className="mt-7 text-lg lg:text-xl text-ink/70 max-w-xl leading-relaxed animate-rise"
          style={{animationDelay:"80ms"}}
          dangerouslySetInnerHTML={{ __html: subtitleHTML }}
        />

        <div className="mt-9 flex flex-wrap items-center gap-4 animate-rise" style={{animationDelay:"160ms"}}>
          <a
            href="https://app.zayado.net/login"
            target="_self"
            data-testid="hero-start-cta"
            className="group inline-flex items-center gap-2.5 bg-aubergine hover:bg-aubergine-deep text-cream pl-5 pr-3 py-3 rounded-full transition-all hover:translate-y-[-1px]"
          >
            {ctaPrimary}
            <span className="w-8 h-8 rounded-full bg-cream/15 flex items-center justify-center group-hover:bg-cream/25 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </a>
          <a href="#how" className="text-ink/80 hover:text-aubergine text-sm underline underline-offset-4 decoration-aubergine/30">
            {ctaSecondary}
          </a>
        </div>

        <div className="mt-10 flex items-center gap-6 text-[13px] text-ink/55 animate-rise" style={{animationDelay:"220ms"}}>
          <div className="flex -space-x-2">
            {["#FBE7E1","#D7E0D2","#D6E4F0","#EFE3D0"].map((c,i)=>(
              <span key={i} className="w-7 h-7 rounded-full border-2 border-canvas" style={{background:c}} />
            ))}
          </div>
          <span dangerouslySetInnerHTML={{ __html: socialProof }} />
        </div>
      </div>

      {/* Hero illustration: stack of mini cockpit cards */}
      <div className="lg:col-span-5 relative">
        <CockpitMockup />
      </div>
    </div>
  </section>
  );
};

const CockpitMockup = () => (
  <div className="relative w-full">
    {/* Floating side cards */}
    <div className="absolute -left-6 top-6 w-44 rounded-2xl bg-white border border-outline shadow-[0_8px_30px_rgba(74,30,44,0.08)] p-4 animate-floaty rotate-[-4deg] hidden md:block">
      <div className="text-[11px] text-inkMuted uppercase tracking-wider mb-1">Mon Pourquoi</div>
      <div className="font-serif-italic text-aubergine text-[15px] leading-snug">"Donner aux solos la sérénité d'un comité."</div>
    </div>

    <div className="absolute -right-4 -top-2 w-48 rounded-2xl bg-blush border border-blush/80 p-4 rotate-[5deg] shadow-[0_8px_30px_rgba(74,30,44,0.08)] hidden md:block animate-floaty" style={{animationDelay:"1.2s"}}>
      <div className="text-[11px] text-aubergine/70 uppercase tracking-wider">Score business</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-medium text-aubergine">72</span>
        <span className="text-xs text-aubergine/60">/100</span>
      </div>
      <div className="text-[11px] text-aubergine/60 mt-1">+8 cette semaine</div>
    </div>

    {/* Main cockpit card */}
    <div className="relative rounded-[28px] bg-white border border-outline p-6 shadow-[0_30px_80px_-30px_rgba(74,30,44,0.30)] animate-rise">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-cream" />
          </div>
          <div>
            <div className="text-[11px] text-inkMuted">Lundi · 7h12</div>
            <div className="text-sm text-ink">Bonjour Margaux</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {["😌","🙂","😐","😣","🤯"].map((e,i)=>(
            <button key={i} className={`w-9 h-9 rounded-xl text-lg transition ${i===1 ? 'bg-blush ring-2 ring-aubergine/20' : 'bg-canvasSoft hover:bg-blush/60'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-canvasSoft p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-aubergine/70 mb-1">Mission du jour · proposée par l'IA</div>
        <div className="text-ink text-[15px] leading-snug">
          Contacte 3 prospects qualifiés et propose une démo de 20 minutes — focus matin, énergie haute.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"Énergie", val:"7,2", unit:"/10"},
          {label:"Focus", val:"82", unit:"%"},
          {label:"Décisions", val:"9", unit:"/sem"},
        ].map((m,i)=>(
          <div key={i} className="rounded-xl border border-outline p-3">
            <div className="text-[10px] uppercase tracking-wider text-inkMuted">{m.label}</div>
            <div className="text-ink mt-1"><span className="text-xl font-medium">{m.val}</span><span className="text-xs text-inkMuted ml-0.5">{m.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-outline p-3 flex items-center gap-3 bg-cream">
        <div className="w-9 h-9 rounded-lg bg-aubergine/10 flex items-center justify-center text-aubergine">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] text-ink">3 livrables IA prêts à valider</div>
          <div className="text-[11px] text-inkMuted">Positionnement · Script · Roadmap 90 jours</div>
        </div>
        <ArrowRight className="w-4 h-4 text-aubergine" />
      </div>
    </div>
  </div>
);

const HowItWorks = ({ wp }) => {
  const s = getSection(wp, "comment-ca-marche", {});
  const heading = s.heading || "Trois étapes pour passer d'une page blanche à une <span class=\"font-serif-italic text-aubergine\">trajectoire claire.</span>";
  const intro = s.subtitle || "Pas de tableau de bord vide. Dès la première connexion, l'IA prépare ton contexte — tu n'as qu'à juger.";
  // Each step pattern : <strong>Étape N — Title:</strong> description
  const stepEntries = Object.entries(s.extras || {}).filter(([k]) => k.startsWith("etape-"));
  const stepDefaults = [
    { title: "Pose ton Pourquoi", desc: "Une seule question, en une phrase. C'est la boussole de toute ton IA." },
    { title: "L'IA prépare 70%", desc: "Positionnement, roadmap 90 jours, première mission — générés sur mesure en 30 secondes." },
    { title: "Toi, tu décides", desc: "Tu valides ou tu ajustes. Le matin, un check-in. Le vendredi, ton bilan." },
  ];
  const steps = stepDefaults.map((d, i) => {
    const found = stepEntries[i]?.[1];
    if (!found) return d;
    // "Title : description"  or  "Title — description"
    const split = found.split(/\s*[:—]\s*/);
    return split.length > 1 ? { title: split[0], desc: split.slice(1).join(" — ") } : { title: d.title, desc: found };
  });
  const icons = [<Compass className="w-5 h-5" key="c"/>, <Sparkles className="w-5 h-5" key="s"/>, <Anchor className="w-5 h-5" key="a"/>];
  const colors = ["bg-blush", "bg-sky", "bg-sage"];
  return (
  <section id="how" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">{s.name || "Comment ça marche"}</div>
          <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-2xl" dangerouslySetInnerHTML={{ __html: heading }} />
        </div>
        <p className="text-ink/60 max-w-sm text-[15px]" dangerouslySetInnerHTML={{ __html: intro }} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {steps.map((step, i) => (
          <div key={i} className="relative bg-white rounded-3xl border border-outline p-7 hover:border-aubergine/30 transition group">
            <div className={`absolute -top-4 left-7 px-3 py-1 rounded-full ${colors[i]} text-[11px] tracking-wider text-aubergine`}>
              ÉTAPE 0{i + 1}
            </div>
            <div className="w-11 h-11 rounded-2xl bg-aubergine/8 flex items-center justify-center text-aubergine mb-5 mt-2">
              {icons[i]}
            </div>
            <h3 className="text-xl text-ink tracking-tight mb-2">{step.title}</h3>
            <p className="text-ink/65 text-[15px] leading-relaxed">{step.desc}</p>
            <div className="mt-6 text-aubergine/80 text-xs group-hover:translate-x-1 transition flex items-center gap-1">
              en savoir plus <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

const Values = ({ wp }) => {
  const s = getSection(wp, "valeurs", {});
  const heading = s.heading || "Une app qui respire <span class=\"font-serif-italic text-aubergine\">comme toi</span>.";
  const valueEntries = Object.entries(s.extras || {}).filter(([k]) => k.startsWith("valeur-"));
  const defaults = [
    { name: "Calme", desc: "Pas de notifications qui hurlent. Un seul focus par jour." },
    { name: "Lucidité", desc: "Des chiffres honnêtes. Pas de vanity metrics." },
    { name: "Trajectoire", desc: "Tout est aligné sur ton Pourquoi. Aucune tâche orpheline." },
    { name: "Durabilité", desc: "Ton énergie est une métrique. Pas un bonus." },
  ];
  const wpValues = defaults.map((d, i) => {
    const raw = valueEntries[i]?.[1];
    if (!raw) return d;
    const split = raw.split(/\s*[:—]\s*/);
    return split.length > 1 ? { name: split[0], desc: split.slice(1).join(" — ") } : { ...d, desc: raw };
  });
  const palette = [
    { color: "bg-sage", icon: <Leaf className="w-4 h-4" /> },
    { color: "bg-sky", icon: <Compass className="w-4 h-4" /> },
    { color: "bg-blush", icon: <Anchor className="w-4 h-4" /> },
    { color: "bg-sand", icon: <Sun className="w-4 h-4" /> },
  ];
  return (
    <section id="values" className="py-24 bg-canvasSoft border-y border-outline">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">{s.name || "Nos valeurs"}</div>
        <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-3xl mb-12" dangerouslySetInnerHTML={{ __html: heading }} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {wpValues.map((v, i) => (
            <div key={i} className="bg-white border border-outline rounded-3xl p-6 hover:translate-y-[-2px] transition">
              <div className={`w-10 h-10 rounded-xl ${palette[i].color} flex items-center justify-center text-aubergine mb-5`}>
                {palette[i].icon}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-inkMuted mb-1">Pilier {i+1}</div>
              <h3 className="text-xl text-ink mb-2">{v.name}</h3>
              <p className="text-ink/60 text-[14px] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Screens = ({ wp }) => {
  const s = getSection(wp, "lapp-vraiment", {});
  const eyebrow = s.name && s.name !== "default" ? s.name : "L'app, vraiment";
  const heading = s.heading || 'Pas de promesse abstraite. Voici ce que tu verras <span class="font-serif-italic text-aubergine">demain matin.</span>';
  return (
  <section id="screens" className="py-24">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">{eyebrow}</div>
      <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-2xl mb-12" dangerouslySetInnerHTML={{ __html: heading }} />

      <div className="grid lg:grid-cols-3 gap-6">
        <MockCockpitCard />
        <MockFileIA />
        <MockVisionBoard />
      </div>
    </div>
  </section>
  );
};

const MockCockpitCard = () => (
  <div className="rounded-3xl bg-white border border-outline overflow-hidden shadow-[0_18px_50px_-30px_rgba(74,30,44,0.25)]">
    <div className="px-5 py-3 border-b border-outline flex items-center justify-between bg-canvasSoft">
      <div className="text-[11px] uppercase tracking-wider text-aubergine/70">Cockpit du matin</div>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-aubergine/30" />
        <span className="w-2 h-2 rounded-full bg-aubergine/30" />
        <span className="w-2 h-2 rounded-full bg-aubergine" />
      </div>
    </div>
    <div className="p-5">
      <div className="text-[11px] text-inkMuted">Mon Pourquoi</div>
      <div className="font-serif-italic text-aubergine text-[15px] mb-4">"Aider 100 indépendants à reprendre la main sur leur temps."</div>

      <div className="rounded-2xl bg-canvas p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-aubergine/70 mb-1">Mission · 9h00 — 9h45</div>
        <div className="text-ink text-[14px]">Écris 3 messages LinkedIn ciblés pour ta short-list freelances.</div>
      </div>

      <div className="space-y-2.5">
        {["Pourquoi posé","Vision board exploré","Première tâche IA"].map((s,i)=>(
          <div key={i} className="flex items-center gap-2 text-[13px] text-ink/70">
            <CheckCircle2 className="w-4 h-4 text-aubergine" />
            {s}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MockFileIA = () => (
  <div className="rounded-3xl bg-navy-gradient text-cream border border-navy-deep overflow-hidden shadow-[0_18px_50px_-30px_rgba(12,29,51,0.5)]">
    <div className="px-5 py-3 border-b border-cream/10 flex items-center justify-between">
      <div className="text-[11px] uppercase tracking-wider text-cream/60">File IA · 3 livrables</div>
      <Sparkles className="w-4 h-4 text-gold-soft" />
    </div>
    <div className="p-5 space-y-3">
      {[
        { t: "Positionnement en 3 lignes", tag: "Stratégie" },
        { t: "10 questions de validation terrain", tag: "Recherche" },
        { t: "Roadmap 90 jours · phase Lancement", tag: "Plan" },
      ].map((d,i)=>(
        <div key={i} className="rounded-2xl bg-cream/8 border border-cream/15 p-3.5 hover:bg-cream/15 transition cursor-pointer">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-blush/90">{d.tag}</span>
            <span className="text-[10px] text-cream/50">prêt à valider</span>
          </div>
          <div className="text-cream text-[14px]">{d.t}</div>
        </div>
      ))}
      <button className="w-full mt-2 rounded-full bg-cream text-aubergine py-2.5 text-sm hover:bg-blush transition">
        Valider en bloc · 2 min
      </button>
    </div>
  </div>
);

const MockVisionBoard = () => (
  <div className="rounded-3xl bg-cream border border-outline overflow-hidden shadow-[0_18px_50px_-30px_rgba(74,30,44,0.25)] relative">
    <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-blush/70" />
    <div className="absolute bottom-10 left-6 w-20 h-20 rounded-full bg-sky/70" />
    <div className="absolute top-20 left-1/2 w-12 h-12 rounded-full bg-sage/80" />
    <div className="px-5 py-3 border-b border-outline flex items-center justify-between bg-cream relative z-10">
      <div className="text-[11px] uppercase tracking-wider text-aubergine/70">Vision Board · 5 ans</div>
    </div>
    <div className="relative z-10 p-6 min-h-[280px] flex flex-col justify-end">
      <div className="rounded-2xl bg-white/90 border border-outline p-4 backdrop-blur">
        <div className="text-[11px] uppercase tracking-wider text-inkMuted mb-1">Trajectoire</div>
        <div className="font-serif-italic text-aubergine text-[17px] leading-snug">
          "Une boîte à 8 personnes, 2M€ d'ARR, et trois mois sabbatiques par an."
        </div>
      </div>
    </div>
  </div>
);

const Testimonials = ({ wp }) => {
  const s = getSection(wp, "temoignages", {});
  const eyebrow = s.name && s.name !== "default" ? s.name : "Témoignages";
  const heading = s.heading || 'Trois fondateurs. <span class="font-serif-italic text-aubergine">Trois trajectoires.</span>';

  // Each testimonial in WP : "<strong>Nom · Rôle</strong> citation"  OR  paragraph "Nom · Rôle | Citation"
  const fallback = [
    { name: "Margaux", role: "Designer freelance · Paris", quote: "Avant Zayado, j'étais éparpillée. En 7 jours, j'avais une roadmap claire et une vraie boussole." },
    { name: "Thomas", role: "Fondateur SaaS · Lyon", quote: "Le check-in du matin a changé mon rapport au boulot. Je commence calme, je termine lucide." },
    { name: "Aïssa", role: "Coach indépendante · Marseille", quote: "Les livrables IA sont précis. Je valide ou j'ajuste — c'est moi qui garde la décision." },
  ];

  // Parse paragraphs : prefer "<strong>Name · Role</strong> Quote" pattern, else "Name | Role | Quote"
  const parsed = (s.paragraphs || []).map((html) => {
    const strongMatch = html.match(/^<strong>([^|<]+)\s*\|\s*([^<]+)<\/strong>\s*(.*)$/i);
    if (strongMatch) return { name: strongMatch[1].trim(), role: strongMatch[2].trim(), quote: strongMatch[3].replace(/<[^>]+>/g, "").trim() };
    const text = html.replace(/<[^>]+>/g, "");
    const parts = text.split("|").map((p) => p.trim());
    if (parts.length >= 3) return { name: parts[0], role: parts[1], quote: parts.slice(2).join(" | ") };
    return null;
  }).filter(Boolean);

  const list = parsed.length >= 1 ? parsed : fallback;

  return (
    <section id="testimonials" className="py-24 bg-canvasSoft border-y border-outline">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">{eyebrow}</div>
        <h2 className="text-4xl lg:text-5xl tracking-tight text-ink mb-12 max-w-2xl" dangerouslySetInnerHTML={{ __html: heading }} />
        <div className="grid md:grid-cols-3 gap-5">
          {list.map((t,i)=>(
            <div key={i} className="bg-white border border-outline rounded-3xl p-7 hover:border-aubergine/30 transition">
              <Quote className="w-6 h-6 text-aubergine/60 mb-4" />
              <p className="text-ink/85 text-[15px] leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-aubergine text-cream flex items-center justify-center text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm text-ink">{t.name}</div>
                  <div className="text-xs text-inkMuted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Integrations = ({ wp }) => {
  const s = getSection(wp, "integrations", {});
  const eyebrow = s.name && s.name !== "default" ? s.name : "Intégrations";
  const heading = s.heading || "Branché à tes outils — pas à leur bruit.";

  const fallbackItems = [
    { ic: <Mail className="w-4 h-4" />, name: "Gmail" },
    { ic: <Calendar className="w-4 h-4" />, name: "Google Cal" },
    { ic: <Slack className="w-4 h-4" />, name: "Slack" },
    { ic: <FileText className="w-4 h-4" />, name: "Notion" },
    { ic: <CreditCard className="w-4 h-4" />, name: "Stripe" },
    { ic: <Github className="w-4 h-4" />, name: "GitHub" },
  ];
  const iconFor = (name) => {
    const n = (name || "").toLowerCase();
    if (n.includes("gmail") || n.includes("mail")) return <Mail className="w-4 h-4" />;
    if (n.includes("cal")) return <Calendar className="w-4 h-4" />;
    if (n.includes("slack")) return <Slack className="w-4 h-4" />;
    if (n.includes("notion") || n.includes("doc")) return <FileText className="w-4 h-4" />;
    if (n.includes("stripe") || n.includes("mollie") || n.includes("paie")) return <CreditCard className="w-4 h-4" />;
    if (n.includes("github") || n.includes("git")) return <Github className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };
  // Parse paragraphs as comma-separated lists OR one per line.
  const parsed = (s.paragraphs || [])
    .flatMap((html) => html.replace(/<[^>]+>/g, "").split(/[,;\n]/))
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((name) => ({ ic: iconFor(name), name }));

  const items = parsed.length >= 3 ? parsed : fallbackItems;

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-2">{eyebrow}</div>
            <h3 className="text-2xl text-ink tracking-tight max-w-md" dangerouslySetInnerHTML={{ __html: heading }} />
          </div>
          <div className="flex flex-wrap gap-3">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-outline bg-white text-ink/80 text-sm hover:border-aubergine/30 transition">
                <span className="text-aubergine">{it.ic}</span>
                {it.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = ({ wp }) => {
  const s = getSection(wp, "final-cta-bas-de-page", {});
  const heading = s.heading || "Ton cockpit est prêt en <span class=\"font-serif-italic text-gold-soft\">5 minutes</span>.";
  const subtitle = s.subtitle || "Pas d'écran vide. Pas de compteur à zéro. Une première mission posée par l'IA, ancrée dans ton Pourquoi.";
  const button = s.extras?.bouton || "Préparer mon cockpit";
  return (
  <section className="py-24">
    <div className="max-w-5xl mx-auto px-6">
      <div className="relative rounded-[36px] bg-navy-gradient text-cream p-12 lg:p-16 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gold-soft/15 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-cream/5 blur-3xl" />
        <div className="relative">
          <h2 className="text-4xl lg:text-6xl tracking-tight max-w-2xl leading-[1] font-display" dangerouslySetInnerHTML={{ __html: heading }} />
          <p className="mt-6 text-cream/70 max-w-md text-lg" dangerouslySetInnerHTML={{ __html: subtitle }} />
          <a
            href="https://app.zayado.net/login"
            target="_self"
            data-testid="final-cta-start"
            className="mt-10 inline-flex items-center gap-3 bg-cream text-navy pl-5 pr-3 py-3 rounded-full hover:bg-gold-soft transition group"
          >
            {button}
            <span className="w-8 h-8 rounded-full bg-navy text-cream flex items-center justify-center group-hover:translate-x-1 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </a>
        </div>
      </div>
    </div>
  </section>
  );
};

const Footer = () => (
  <footer className="py-10 border-t border-outline">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center justify-between gap-4 text-xs text-inkMuted">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-aubergine flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border border-cream" />
        </div>
        © {new Date().getFullYear()} Zayado — Entreprendre avec sens, clarté et stabilité.
      </div>
      <div className="flex gap-5">
        <Link to="/legal/confidentialite" className="hover:text-aubergine">Confidentialité</Link>
        <Link to="/legal/conditions-utilisation" className="hover:text-aubergine">CGU</Link>
        <Link to="/contact" className="hover:text-aubergine">Contact</Link>
      </div>
    </div>
  </footer>
);

export default function MyExtensionAI() {
  const { page: wpPage } = useWPPage("landing");
  const parsed = wpPage ? parseWPContent(wpPage.content?.rendered || "") : null;
  // Meta SEO synchronisée avec WP (slug "myextension-ai" ou "landing" fallback)
  const wpMeta = useWpContent("myextension-ai", {
    title: "MyExtension AI · Le cockpit business des entrepreneurs | Zayado",
    subtitle: "L'extension business 70 % IA + 30 % humain. Vision Board, Pilotage financier, IA stratégique, Bien-être. Entreprendre avec sens, clarté et stabilité.",
  });
  return (
    <div className="min-h-screen bg-canvas" data-testid="myextension-page">
      <Helmet>
        <title>{wpMeta.seo.title}</title>
        <meta name="description" content={wpMeta.seo.description} />
        <meta property="og:title" content={wpMeta.seo.title} />
        <meta property="og:description" content={wpMeta.seo.description} />
        {wpMeta.seo.og_image && <meta property="og:image" content={wpMeta.seo.og_image} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zayado.net/myextension-ai" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={wpMeta.seo.canonical || "https://zayado.net/myextension-ai"} />
      </Helmet>
      <PublicHeader />
      <Hero wp={parsed} />
      <HowItWorks wp={parsed} />
      <Values wp={parsed} />
      <PillarsSection />
      <Screens wp={parsed} />
      <Testimonials wp={parsed} />
      <FAQSection />
      <Integrations wp={parsed} />
      <FinalCTA wp={parsed} />
      <UnifiedFooter />
    </div>
  );
}

/* ========================================================================
 *  Sections enrichies migrées depuis /login (3 pillars + FAQ + pricing teaser)
 *  Demande utilisateur : "tout le texte met etc.. utilise cela pour actualiser
 *   la page /myextuon ai"
 * ======================================================================== */

const PillarsSection = () => {
  const PILLARS = [
    { idx: "01", title: "Cockpit en 1 clic",
      desc: "Vision, missions, KPIs, IA stratégique — tout réuni dans un cockpit unique. Fini le zapping entre 12 outils." },
    { idx: "02", title: "Le 30 % humain",
      desc: "L'IA prépare 70 % du travail. Vous tranchez les 30 % à forte valeur. Coach humain et bilan trimestriel inclus dès SERENITY." },
    { idx: "03", title: "Sans engagement",
      desc: "1er mois symbolique à 1 €. Annulation à tout moment. Vos données restent les vôtres, exportables en 1 clic." },
  ];
  return (
    <section className="relative py-20" style={{ background: "#f6f3ee" }} data-testid="myext-pillars">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: "#b89855" }}>
            Trois piliers
          </div>
          <h2 className="font-display text-[28px] sm:text-[36px] leading-tight" style={{ color: "#1a3a6e", letterSpacing: "-0.025em", fontWeight: 600 }}>
            Pourquoi MyExtension AI <span className="font-serif-italic" style={{ color: "#b89855" }}>change la donne.</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition" data-testid={`myext-pillar-${i}`}>
              <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: "#b89855" }}>
                · {p.idx}
              </div>
              <h3 className="font-semibold text-[18px] mb-2" style={{ color: "#1a1815", letterSpacing: "-0.015em" }}>{p.title}</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#4a4538" }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => {
  const ITEMS = [
    { q: "Qu'est-ce que MyExtension AI exactement ?",
      a: "Un cockpit business unique pour les solo founders et indépendants ambitieux. L'IA fait 70 % du travail répétitif (rédaction, suivi CA, leads). Vous gardez les 30 % à forte valeur (décisions, relations, vision). Inclut Vision Board, Pilotage financier, missions IA et bien-être." },
    { q: "Combien ça coûte vraiment ?",
      a: "START 29 €/mo (1 € le 1er mois), GROW 79 €/mo, SERENITY 149 €/mo (coach humain inclus). Engagement annuel −20 % sur START et GROW. Création d'entreprise à 1 € symbolique conditionnée à un abonnement actif." },
    { q: "Mes données sont-elles confidentielles ?",
      a: "Oui. Hébergement européen (RGPD), chiffrement au repos, aucune donnée revendue, aucun cookie publicitaire tiers. Vous pouvez exporter ou supprimer votre compte à tout moment depuis Paramètres." },
    { q: "Ça remplace un comptable ?",
      a: "Non — ça le complète. Le module Pilotage suit votre CA en temps réel (via Stripe / banque via Make) et vous alerte. Le bilan annuel reste chez votre expert-comptable. Avec SERENITY, supervision DAF/compta incluse." },
    { q: "Combien de temps pour démarrer ?",
      a: "10 minutes : onboarding 3 étapes (profil, objectifs, focus IA) puis le cockpit s'adapte à votre activité. Vous pouvez tester en mode découverte (0 €) avant de souscrire." },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section className="relative py-20 bg-white" data-testid="myext-faq">
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: "#b89855" }}>FAQ</div>
          <h2 className="font-display text-[28px] sm:text-[36px] leading-tight" style={{ color: "#1a3a6e", letterSpacing: "-0.025em", fontWeight: 600 }}>
            On vous explique <span className="font-serif-italic" style={{ color: "#b89855" }}>tout.</span>
          </h2>
        </div>
        <div className="space-y-2.5">
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <button key={i} onClick={() => setOpen(isOpen ? -1 : i)}
                      className="w-full text-left rounded-2xl p-5 transition shadow-md hover:shadow-lg bg-white"
                      style={{ background: "#fbfaf6" }}
                      data-testid={`myext-faq-${i}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[14.5px]" style={{ color: "#1a3a6e" }}>{it.q}</span>
                  <span className="text-[20px] font-bold transition-transform" style={{ color: "#b89855", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                </div>
                {isOpen && (
                  <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: "#4a4538" }}>{it.a}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const PricingTeaserSection = () => (
  <section className="relative py-20" style={{ background: "#f6f3ee" }} data-testid="myext-pricing-teaser">
    <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
      <div className="rounded-3xl p-10 shadow-2xl" style={{ background: "linear-gradient(135deg, #1a3a6e 0%, #2c4d85 100%)", color: "#f6f3ee" }}>
        <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: "#d4b982" }}>
          Pas encore décidé ?
        </div>
        <h3 className="font-display text-[30px] sm:text-[38px] leading-tight mb-2" style={{ letterSpacing: "-0.025em", fontWeight: 600 }}>
          <span className="font-serif-italic" style={{ color: "#d4b982" }}>1 €</span> le 1<sup>er</sup> mois.
        </h3>
        <p className="text-[14.5px] mb-7 opacity-85 max-w-md mx-auto">
          Sans CB au démarrage. Annulation à tout moment. Vos données restent les vôtres.
        </p>
        <Link to="/tarifs"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold transition shadow-md"
              style={{ background: "#d4b982", color: "#0c1d33" }}>
          Voir tous les plans <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  </section>
);
