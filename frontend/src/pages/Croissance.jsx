import { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Building2, CheckCircle2, ChevronRight,
  CircleDashed, CircleAlert, Clock3, Database, Facebook, FileText, Globe2,
  Inbox, Lightbulb, Link2, MessageSquare, Plug, Plus, Radar, RefreshCw,
  Search, ShieldCheck, SlidersHorizontal, Target, Youtube,
} from "lucide-react";
import { toast } from "sonner";

const VIEWS = [
  { id: "radar", label: "Radar du jour", icon: Radar },
  { id: "campaigns", label: "Campagnes & ICP", icon: Target },
  { id: "signals", label: "Signaux", icon: Activity },
  { id: "crm", label: "CRM connecté", icon: Database },
  { id: "actions", label: "Actions", icon: MessageSquare },
  { id: "intelligence", label: "Intelligence", icon: Lightbulb },
];

const SOURCES = [
  { label: "HubSpot / Brevo / Pipedrive / Odoo", detail: "CRM de référence", icon: Database, status: "À connecter", tone: "gold" },
  { label: "Google Business Profile", detail: "Avis, questions, posts", icon: Building2, status: "À connecter", tone: "blue" },
  { label: "YouTube", detail: "Chaînes, vidéos, commentaires", icon: Youtube, status: "À connecter", tone: "red" },
  { label: "Meta / Facebook", detail: "Pages et interactions autorisées", icon: Facebook, status: "À connecter", tone: "blue" },
  { label: "Forums & communautés", detail: "Signaux publics avec preuve", icon: Globe2, status: "À définir", tone: "green" },
];

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#E5C887]">{eyebrow}</p>
        <h1 className="mt-1 font-head text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, tone = "gold" }) {
  const tones = {
    gold: "border-[#E5C887]/35 bg-[#E5C887]/10 text-[#F4D990]",
    blue: "border-sky-300/30 bg-sky-300/10 text-sky-200",
    red: "border-rose-300/30 bg-rose-300/10 text-rose-200",
    green: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    muted: "border-white/15 bg-white/5 text-white/55",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${tones[tone] || tones.muted}`}>{children}</span>;
}

function EmptyPanel({ icon: Icon, title, text, actionLabel, onAction, footnote }) {
  return (
    <div className="glass relative overflow-hidden p-6 sm:p-8">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#E5C887]/[0.09] blur-2xl" />
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-xl gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E5C887]/30 bg-[#E5C887]/10 text-[#E5C887]"><Icon size={21} /></div>
          <div>
            <h3 className="font-head text-base font-semibold text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-white/60">{text}</p>
            {footnote && <p className="mt-3 text-xs leading-5 text-white/38">{footnote}</p>}
          </div>
        </div>
        {actionLabel && <button onClick={onAction} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#E5C887]/45 bg-[#E5C887]/10 px-4 py-2.5 text-sm font-semibold text-[#F4D990] transition hover:bg-[#E5C887]/18"><Plus size={15} /> {actionLabel}</button>}
      </div>
    </div>
  );
}

function SyncNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.045] p-4">
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#E5C887]" />
      <p className="text-xs leading-5 text-white/60"><strong className="font-semibold text-white/80">Votre CRM reste la source de vérité.</strong> Croissance détecte, qualifie et prépare ; aucun contact, deal, message ou pipeline ne sera créé ou modifié sans votre validation explicite.</p>
    </div>
  );
}

function RadarView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Radar de croissance"
        title="Les opportunités qui méritent votre attention."
        description="Le Radar transforme des signaux autorisés en décisions commerciales expliquées. Il ne remplace ni votre CRM, ni votre jugement."
        action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl bg-[#E5C887] px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] transition hover:brightness-105"><SlidersHorizontal size={15} /> Configurer le Radar</button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <EmptyPanel
          icon={Radar}
          title="Votre Radar est en attente de campagne."
          text="Décrivez votre offre, votre client idéal et les signaux que vous voulez suivre. Vous recevrez ensuite au maximum trois opportunités priorisées par jour."
          actionLabel="Créer ma première campagne"
          onAction={onConfigure}
          footnote="Aucune source externe n’est connectée aujourd’hui : aucun signal n’est inventé ou importé sans votre accord."
        />
        <div className="glass p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.13em] text-white/45">Pourquoi maintenant ?</p><CircleAlert size={16} className="text-[#E5C887]" /></div>
          <p className="mt-5 font-head text-lg font-semibold text-white">Une priorité commerciale doit être prouvée.</p>
          <p className="mt-2 text-sm leading-6 text-white/55">Chaque signal affichera son intention, son adéquation à votre cible, sa fraîcheur et la source qui l’a rendu visible.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-[10px] uppercase tracking-wide text-white/40">Signaux</p><p className="mt-1 font-head text-xl font-semibold text-white">—</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-[10px] uppercase tracking-wide text-white/40">À valider</p><p className="mt-1 font-head text-xl font-semibold text-white">—</p></div>
          </div>
        </div>
      </div>

      <SyncNotice />
    </div>
  );
}

function CampaignsView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Campagnes & ICP" title="Dites au Radar ce qu’il doit chercher." description="Une campagne ne crée aucun contact. Elle définit l’offre, le client idéal, les problèmes, les mots-clés, les concurrents et le territoire à surveiller." action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl bg-[#E5C887] px-4 py-2.5 text-sm font-semibold text-[#0B1F3A]"><Plus size={15} /> Nouvelle campagne</button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [Target, "Offre & résultat", "Ce que vous aidez réellement votre client à obtenir."],
          [Search, "Client idéal", "Secteur, zone, taille, rôle, budget ou maturité recherchés."],
          [Lightbulb, "Problèmes & déclencheurs", "Mots, questions et événements qui signalent un besoin concret."],
        ].map(([Icon, title, text]) => <div key={title} className="glass p-5"><Icon size={18} className="text-[#E5C887]" /><h3 className="mt-4 font-head font-semibold text-white">{title}</h3><p className="mt-1.5 text-sm leading-6 text-white/55">{text}</p><StatusPill tone="muted">À renseigner</StatusPill></div>)}
      </div>
      <EmptyPanel icon={Target} title="Aucune campagne active" text="Commencez par une seule offre et une seule cible. Le Radar doit rester précis pour protéger votre temps commercial." actionLabel="Définir une campagne" onAction={onConfigure} />
    </div>
  );
}

function SignalsView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Signaux d’intention" title="Des preuves, pas des listes achetées." description="Un signal peut être une demande, un avis, une question, une vidéo, un événement ou une interaction autorisée. Chaque élément doit conserver sa source et sa date." action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl border border-[#E5C887]/45 bg-[#E5C887]/10 px-4 py-2.5 text-sm font-semibold text-[#F4D990]"><Link2 size={15} /> Ajouter une source</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Intention exprimée", "35", "La personne cherche-t-elle une solution ?"], ["Adéquation ICP", "25", "Correspond-elle à votre client idéal ?"], ["Fraîcheur & urgence", "30", "Est-ce encore actionnable maintenant ?"]].map(([label, score, text]) => <div key={label} className="glass p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#E5C887]">{label}</p><p className="mt-4 font-head text-3xl font-semibold text-white">{score}<span className="text-base text-white/40"> pts</span></p><p className="mt-2 text-sm leading-6 text-white/52">{text}</p></div>)}
      </div>
      <EmptyPanel icon={Inbox} title="Aucun signal à évaluer" text="Une fois les sources autorisées ou une campagne connectées, les signaux seront affichés avec un score expliqué et leur preuve d’origine." actionLabel="Configurer mes sources" onAction={onConfigure} footnote="Un score ne crée jamais automatiquement un contact ou un deal dans votre CRM." />
    </div>
  );
}

function CrmView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="CRM connecté" title="Votre CRM conserve la vérité commerciale." description="Connectez le CRM que vous utilisez déjà. MyExtension lira uniquement les données autorisées et vous demandera votre validation avant toute création ou mise à jour." action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl bg-[#E5C887] px-4 py-2.5 text-sm font-semibold text-[#0B1F3A]"><Plug size={15} /> Connecter un CRM</button>} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="glass p-5">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/14 bg-white/5"><Database size={18} className="text-[#E5C887]" /></div><div><h3 className="font-head font-semibold text-white">Aucun CRM connecté</h3><p className="text-xs text-white/45">Dernière synchronisation : —</p></div></div><StatusPill tone="muted">Non connecté</StatusPill></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-white/45">Contacts synchronisés</p><p className="mt-1 font-head text-xl text-white">—</p></div><div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-white/45">Opportunités CRM</p><p className="mt-1 font-head text-xl text-white">—</p></div></div>
        </div>
        <div className="glass p-5"><p className="text-xs font-bold uppercase tracking-[.13em] text-white/45">CRM compatibles</p><div className="mt-3 flex flex-wrap gap-2">{["HubSpot", "Brevo", "Pipedrive", "Odoo"].map((name) => <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/68"><Database size={12} className="text-[#E5C887]" /> {name} <span className="text-white/38">· À connecter</span></span>)}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.13em] text-white/45">Ce qui sera synchronisé</p><div className="mt-4 space-y-3">{["Créer une fiche contact ou entreprise", "Créer ou mettre à jour un deal", "Ajouter une note, une tâche ou un brouillon", "Lire les statuts et les données autorisées"].map((line) => <div className="flex gap-3" key={line}><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#E5C887]" /><p className="text-sm text-white/62">{line}</p></div>)}</div></div>
      </div>
      <SyncNotice />
    </div>
  );
}

function ActionsView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Messages & actions" title="Préparez une action utile. Validez-la avant de l’envoyer." description="Les brouillons peuvent s’appuyer sur un signal et sur les données CRM que vous avez autorisées. L’action finale reste toujours entre vos mains." action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl border border-[#E5C887]/45 bg-[#E5C887]/10 px-4 py-2.5 text-sm font-semibold text-[#F4D990]"><FileText size={15} /> Préparer un brouillon</button>} />
      <div className="grid gap-4 md:grid-cols-3">{[[MessageSquare, "Réponse contextualisée", "Répondre au besoin détecté, pas envoyer un message générique."], [Clock3, "Suivi raisonné", "Préparer une relance liée à une interaction ou une échéance CRM."], [RefreshCw, "Synchronisation validée", "Créer une note, tâche ou fiche CRM seulement après validation."]].map(([Icon, title, text]) => <div className="glass p-5" key={title}><Icon size={18} className="text-[#E5C887]" /><h3 className="mt-4 font-head font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{text}</p><StatusPill tone="muted">Aucune action préparée</StatusPill></div>)}</div>
      <EmptyPanel icon={MessageSquare} title="Aucun brouillon à valider" text="Sélectionnez d’abord un signal ou une opportunité CRM. Le Copilote pourra alors préparer une réponse qui tient compte du contexte réel." actionLabel="Voir le Radar" onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </div>
  );
}

function IntelligenceView({ onConfigure }) {
  return (
    <div className="space-y-5">
      <SectionHeading eyebrow="Intelligence marché" title="Comprendre le marché avant de lui parler." description="Veillez les concurrents, objections, questions récurrentes et contenus utiles. Ces informations éclairent vos campagnes sans constituer une base de contacts cachée." action={<button onClick={onConfigure} className="inline-flex items-center gap-2 rounded-xl bg-[#E5C887] px-4 py-2.5 text-sm font-semibold text-[#0B1F3A]"><Plus size={15} /> Ajouter une veille</button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass p-5"><BarChart3 size={18} className="text-[#E5C887]" /><h3 className="mt-4 font-head font-semibold text-white">Concurrents</h3><p className="mt-2 text-sm leading-6 text-white/55">Repérez leurs offres, sujets, contenus et objections sans copier ni harceler leur audience.</p><StatusPill tone="muted">Aucun concurrent suivi</StatusPill></div>
        <div className="glass p-5"><Globe2 size={18} className="text-[#E5C887]" /><h3 className="mt-4 font-head font-semibold text-white">Questions du marché</h3><p className="mt-2 text-sm leading-6 text-white/55">Les questions répétées deviennent des pistes d’offre, de contenu ou de réponse utile.</p><StatusPill tone="muted">Aucune source connectée</StatusPill></div>
        <div className="glass p-5"><ArrowUpRight size={18} className="text-[#E5C887]" /><h3 className="mt-4 font-head font-semibold text-white">Opportunités éditoriales</h3><p className="mt-2 text-sm leading-6 text-white/55">Identifiez un sujet utile avant de préparer un contenu ou une contribution conforme aux règles de la communauté.</p><StatusPill tone="muted">À configurer</StatusPill></div>
      </div>
      <div className="glass p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-white/45">Sources disponibles</p><p className="mt-1 text-sm text-white/55">Chaque connecteur reste désactivé tant que vous ne l’avez pas autorisé.</p></div><ShieldCheck size={19} className="text-[#E5C887]" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{SOURCES.map(({ label, detail, icon: Icon, status, tone }) => <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3" key={label}><div className="flex items-start justify-between gap-2"><Icon size={17} className="text-[#E5C887]" /><StatusPill tone={tone}>{status}</StatusPill></div><p className="mt-3 text-sm font-semibold text-white">{label}</p><p className="mt-1 text-xs text-white/48">{detail}</p></div>)}</div></div>
    </div>
  );
}

export default function Croissance() {
  const [view, setView] = useState("radar");
  const active = useMemo(() => VIEWS.find((item) => item.id === view) || VIEWS[0], [view]);
  const configure = () => toast.info("Les connexions seront configurables dans Paramètres → Intégrations. Aucun connecteur n’est actif pour le moment.");

  const content = {
    radar: <RadarView onConfigure={configure} />,
    campaigns: <CampaignsView onConfigure={configure} />,
    signals: <SignalsView onConfigure={configure} />,
    crm: <CrmView onConfigure={configure} />,
    actions: <ActionsView onConfigure={configure} />,
    intelligence: <IntelligenceView onConfigure={configure} />,
  };

  return (
    <div className="space-y-6 pb-28 md:pb-4" data-testid="page-croissance-radar">
      <div className="glass overflow-hidden">
        <div className="relative px-5 py-5 sm:px-6">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#E5C887]/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E5C887]/35 bg-[#E5C887]/10 text-[#E5C887]"><Radar size={20} /></div><div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#E5C887]">Croissance guidée</p><h1 className="font-head text-xl font-semibold text-white">Radar de Croissance</h1><p className="mt-1 max-w-xl text-sm text-white/56">Détecter, comprendre, préparer, puis synchroniser vers votre CRM.</p></div></div>
            <div className="flex items-center gap-2"><StatusPill tone="muted"><CircleDashed size={11} className="mr-1" /> CRM non connecté</StatusPill><button onClick={configure} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10"><Plug size={14} /> Connecter</button></div>
          </div>
        </div>
        <div className="relative flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 sm:px-4">
          {VIEWS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${view === id ? "bg-white text-[#0B1F3A] shadow-sm" : "text-white/58 hover:bg-white/8 hover:text-white"}`}><Icon size={14} /> {label}</button>)}
        </div>
      </div>

      <div aria-live="polite" data-testid={`growth-view-${active.id}`}>{content[view]}</div>
    </div>
  );
}
