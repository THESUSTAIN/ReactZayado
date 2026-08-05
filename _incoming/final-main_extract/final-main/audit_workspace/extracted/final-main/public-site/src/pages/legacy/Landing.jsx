import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Compass, Anchor, Sun, Leaf, Quote,
  CheckCircle2, Slack, Calendar, Mail, CreditCard, FileText, Github
} from "lucide-react";

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
        <a href="#how" className="hover:text-aubergine transition">Comment ça marche</a>
        <a href="#values" className="hover:text-aubergine transition">Valeurs</a>
        <a href="#screens" className="hover:text-aubergine transition">L'app</a>
        <a href="#testimonials" className="hover:text-aubergine transition">Témoignages</a>
      </nav>
      <Link
        to="/onboarding"
        data-testid="nav-start-cta"
        className="inline-flex items-center gap-2 bg-aubergine hover:bg-aubergine-deep text-cream px-4 py-2 rounded-full text-sm transition-colors"
      >
        Commencer
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  </header>
);

const Hero = () => (
  <section className="relative pt-20 pb-24 overflow-hidden">
    <div className="absolute inset-0 dotted-bg opacity-50" />
    <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-blush/40 blur-3xl" />
    <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-sky/40 blur-3xl" />

    <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10 items-center">
      <div className="lg:col-span-7">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-outline text-xs text-ink/70 mb-6 animate-rise">
          <span className="w-1.5 h-1.5 rounded-full bg-aubergine" />
          Le copilote des fondateurs solos
        </div>
        <h1 className="font-medium tracking-tight text-[3rem] sm:text-[3.5rem] lg:text-[4.6rem] leading-[0.95] text-ink animate-rise">
          Entreprendre,
          <br />
          sans rester <span className="font-serif-italic text-aubergine">seul.</span>
        </h1>
        <p className="mt-7 text-lg lg:text-xl text-ink/70 max-w-xl leading-relaxed animate-rise" style={{animationDelay:"80ms"}}>
          L'IA prépare <b className="text-ink">70%</b> du travail. Toi, tu apportes le
          <span className="fancy-underline relative"> jugement</span>, la vision, le sens.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4 animate-rise" style={{animationDelay:"160ms"}}>
          <Link
            to="/onboarding"
            data-testid="hero-start-cta"
            className="group inline-flex items-center gap-2.5 bg-aubergine hover:bg-aubergine-deep text-cream pl-5 pr-3 py-3 rounded-full transition-all hover:translate-y-[-1px]"
          >
            Préparer mon cockpit
            <span className="w-8 h-8 rounded-full bg-cream/15 flex items-center justify-center group-hover:bg-cream/25 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <a href="#how" className="text-ink/80 hover:text-aubergine text-sm underline underline-offset-4 decoration-aubergine/30">
            Voir comment ça marche
          </a>
        </div>

        <div className="mt-10 flex items-center gap-6 text-[13px] text-ink/55 animate-rise" style={{animationDelay:"220ms"}}>
          <div className="flex -space-x-2">
            {["#FBE7E1","#D7E0D2","#D6E4F0","#EFE3D0"].map((c,i)=>(
              <span key={i} className="w-7 h-7 rounded-full border-2 border-canvas" style={{background:c}} />
            ))}
          </div>
          <span>+ 180 fondateurs ont déjà posé leur Pourquoi cette semaine.</span>
        </div>
      </div>

      {/* Hero illustration: stack of mini cockpit cards */}
      <div className="lg:col-span-5 relative">
        <CockpitMockup />
      </div>
    </div>
  </section>
);

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

const HowItWorks = () => (
  <section id="how" className="py-24 relative">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">Comment ça marche</div>
          <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-2xl">
            Trois étapes pour passer d'une page blanche à une <span className="font-serif-italic text-aubergine">trajectoire claire.</span>
          </h2>
        </div>
        <p className="text-ink/60 max-w-sm text-[15px]">
          Pas de tableau de bord vide. Dès la première connexion, l'IA prépare ton contexte —
          tu n'as qu'à juger.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {[
          {
            n: "01",
            title: "Pose ton Pourquoi",
            desc: "Une seule question, en une phrase. C'est la boussole de toute ton IA.",
            ic: <Compass className="w-5 h-5" />,
            color: "bg-blush",
          },
          {
            n: "02",
            title: "L'IA prépare 70%",
            desc: "Positionnement, roadmap 90 jours, première mission — générés sur mesure en 30 secondes.",
            ic: <Sparkles className="w-5 h-5" />,
            color: "bg-sky",
          },
          {
            n: "03",
            title: "Toi, tu décides",
            desc: "Tu valides ou tu ajustes. Le matin, un check-in. Le vendredi, ton bilan.",
            ic: <Anchor className="w-5 h-5" />,
            color: "bg-sage",
          },
        ].map((s, i) => (
          <div key={i} className="relative bg-white rounded-3xl border border-outline p-7 hover:border-aubergine/30 transition group">
            <div className={`absolute -top-4 left-7 px-3 py-1 rounded-full ${s.color} text-[11px] tracking-wider text-aubergine`}>
              ÉTAPE {s.n}
            </div>
            <div className="w-11 h-11 rounded-2xl bg-aubergine/8 flex items-center justify-center text-aubergine mb-5 mt-2">
              {s.ic}
            </div>
            <h3 className="text-xl text-ink tracking-tight mb-2">{s.title}</h3>
            <p className="text-ink/65 text-[15px] leading-relaxed">{s.desc}</p>
            <div className="mt-6 text-aubergine/80 text-xs group-hover:translate-x-1 transition flex items-center gap-1">
              en savoir plus <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Values = () => {
  const values = [
    { name: "Calme", desc: "Pas de notifications qui hurlent. Un seul focus par jour.", color: "bg-sage", icon: <Leaf className="w-4 h-4" /> },
    { name: "Lucidité", desc: "Des chiffres honnêtes. Pas de vanity metrics.", color: "bg-sky", icon: <Compass className="w-4 h-4" /> },
    { name: "Trajectoire", desc: "Tout est aligné sur ton Pourquoi. Aucune tâche orpheline.", color: "bg-blush", icon: <Anchor className="w-4 h-4" /> },
    { name: "Durabilité", desc: "Ton énergie est une métrique. Pas un bonus.", color: "bg-sand", icon: <Sun className="w-4 h-4" /> },
  ];
  return (
    <section id="values" className="py-24 bg-canvasSoft border-y border-outline">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">Nos quatre piliers</div>
        <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-3xl mb-12">
          Une app qui respire <span className="font-serif-italic text-aubergine">comme toi</span>.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v, i) => (
            <div key={i} className="bg-white border border-outline rounded-3xl p-6 hover:translate-y-[-2px] transition">
              <div className={`w-10 h-10 rounded-xl ${v.color} flex items-center justify-center text-aubergine mb-5`}>
                {v.icon}
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

const Screens = () => (
  <section id="screens" className="py-24">
    <div className="max-w-7xl mx-auto px-6 lg:px-10">
      <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">L'app, vraiment</div>
      <h2 className="text-4xl lg:text-5xl tracking-tight text-ink max-w-2xl mb-12">
        Pas de promesse abstraite. Voici ce que tu verras <span className="font-serif-italic text-aubergine">demain matin.</span>
      </h2>

      <div className="grid lg:grid-cols-3 gap-6">
        <MockCockpitCard />
        <MockFileIA />
        <MockVisionBoard />
      </div>
    </div>
  </section>
);

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
  <div className="rounded-3xl bg-navy-nuance text-cream border border-navy-deep overflow-hidden shadow-[0_18px_50px_-30px_rgba(12,29,51,0.5)]">
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

const Testimonials = () => {
  const list = [
    { name: "Margaux", role: "Designer freelance · Paris", quote: "Avant Zayado, j'étais éparpillée. En 7 jours, j'avais une roadmap claire et une vraie boussole." },
    { name: "Thomas", role: "Fondateur SaaS · Lyon", quote: "Le check-in du matin a changé mon rapport au boulot. Je commence calme, je termine lucide." },
    { name: "Aïssa", role: "Coach indépendante · Marseille", quote: "Les livrables IA sont précis. Je valide ou j'ajuste — c'est moi qui garde la décision." },
  ];
  return (
    <section id="testimonials" className="py-24 bg-canvasSoft border-y border-outline">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-3">Témoignages</div>
        <h2 className="text-4xl lg:text-5xl tracking-tight text-ink mb-12 max-w-2xl">
          Trois fondateurs. <span className="font-serif-italic text-aubergine">Trois trajectoires.</span>
        </h2>
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

const Integrations = () => {
  const items = [
    { ic: <Mail className="w-4 h-4" />, name: "Gmail" },
    { ic: <Calendar className="w-4 h-4" />, name: "Google Cal" },
    { ic: <Slack className="w-4 h-4" />, name: "Slack" },
    { ic: <FileText className="w-4 h-4" />, name: "Notion" },
    { ic: <CreditCard className="w-4 h-4" />, name: "Stripe" },
    { ic: <Github className="w-4 h-4" />, name: "GitHub" },
  ];
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-aubergine/70 mb-2">Intégrations</div>
            <h3 className="text-2xl text-ink tracking-tight max-w-md">Branché à tes outils — pas à leur bruit.</h3>
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

const FinalCTA = () => (
  <section className="py-24">
    <div className="max-w-5xl mx-auto px-6">
      <div className="relative rounded-[36px] bg-navy-nuance text-cream p-12 lg:p-16 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gold-soft/15 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-cream/5 blur-3xl" />
        <div className="relative">
          <h2 className="text-4xl lg:text-6xl tracking-tight max-w-2xl leading-[1] font-display">
            Ton cockpit est prêt en <span className="font-serif-italic text-gold-soft">5 minutes</span>.
          </h2>
          <p className="mt-6 text-cream/70 max-w-md text-lg">
            Pas d'écran vide. Pas de compteur à zéro. Une première mission posée par l'IA, ancrée dans ton Pourquoi.
          </p>
          <Link
            to="/onboarding"
            data-testid="final-cta-start"
            className="mt-10 inline-flex items-center gap-3 bg-cream text-navy pl-5 pr-3 py-3 rounded-full hover:bg-gold-soft transition group"
          >
            Préparer mon cockpit
            <span className="w-8 h-8 rounded-full bg-navy text-cream flex items-center justify-center group-hover:translate-x-1 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-10 border-t border-outline">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center justify-between gap-4 text-xs text-inkMuted">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-aubergine flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border border-cream" />
        </div>
        © {new Date().getFullYear()} Zayado — entreprendre, sans rester seul.
      </div>
      <div className="flex gap-5">
        <a href="#" className="hover:text-aubergine">Confidentialité</a>
        <a href="#" className="hover:text-aubergine">CGU</a>
        <a href="#" className="hover:text-aubergine">Contact</a>
      </div>
    </div>
  </footer>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas" data-testid="landing-page">
      <NavBar />
      <Hero />
      <HowItWorks />
      <Values />
      <Screens />
      <Testimonials />
      <Integrations />
      <FinalCTA />
      <Footer />
    </div>
  );
}
