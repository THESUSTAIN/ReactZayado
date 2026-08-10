import React from "react";
import {
  Chrome, PanelRight, Sparkles, MousePointerClick, Users, FileText,
  Download, Check, ArrowRight, Mail, Calendar, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: PanelRight, title: "Side-panel IA", desc: "Un Hub IA contextuel qui s'ouvre à côté de n'importe quelle page (Gmail, LinkedIn, un site prospect…)." },
  { icon: MousePointerClick, title: "Capture intelligente", desc: "Sélectionnez une zone ou une page, l'IA la résume et propose des actions en un clic." },
  { icon: Users, title: "Contexte CRM", desc: "Détection du contact et de l'entreprise sur la page, avec accès direct à votre CRM." },
  { icon: FileText, title: "Créer sans quitter l'onglet", desc: "Tâche, opportunité, note ou ajout au CRM — envoyé directement dans votre cockpit." },
  { icon: Mail, title: "Gmail & Outlook", desc: "Un email important devient une opportunité CRM, puis une carte de votre Vision Board." },
  { icon: Calendar, title: "Agenda relié", desc: "Vos réunions alimentent votre charge de travail et l'analyse d'alignement." },
];

const STEPS = [
  "Téléchargez et décompressez l'extension.",
  "Ouvrez chrome://extensions et activez le Mode développeur.",
  "Cliquez « Charger l'extension non empaquetée » et sélectionnez le dossier.",
  "Épinglez l'icône Zayado — le side-panel s'ouvre au clic.",
];

export default function Extension() {
  const navigate = useNavigate();
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8" data-testid="extension-page">
      {/* Hero */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#9333EA]/15 via-white/[0.02] to-[#C9A449]/10 p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
          <Chrome size={13} /> Extension navigateur
        </div>
        <h1 className="font-head text-4xl font-bold text-white sm:text-5xl">
          Zayado Copilot — votre <span className="text-[#C9A449]">couche IA</span> dans le navigateur
        </h1>
        <p className="mt-3 max-w-2xl text-base text-white/70">
          L'extension relie le web à votre Business OS. Elle s'ouvre en side-panel, comprend le
          contexte de la page et transforme ce que vous voyez en actions (tâche, opportunité, CRM)
          — sans quitter votre onglet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/zayado-copilot-extension.zip" download data-testid="extension-download-btn"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9333EA] to-[#C9A449] px-6 py-3 text-sm font-semibold text-white no-underline hover:opacity-95 transition-opacity">
            <Download size={16} /> Télécharger l'extension
          </a>
          <button onClick={() => navigate("/vision-board")} data-testid="extension-goto-vision"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors">
            <Zap size={16} className="text-[#C9A449]" /> Ouvrir le Hub IA
          </button>
        </div>
      </div>

      {/* Fonctionnalités */}
      <h2 className="mt-10 mb-4 font-head text-2xl font-semibold text-white">Ce qu'elle fait</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5" data-testid={`extension-feature-${i}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9333EA]/20 text-amber-100">
              <f.icon size={18} />
            </div>
            <div className="mt-3 font-medium text-white">{f.title}</div>
            <p className="mt-1 text-sm text-white/60 leading-snug">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Installation */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6" data-testid="extension-install">
          <h2 className="mb-4 font-head text-2xl font-semibold text-white">Installation (2 min)</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C9A449]/20 text-xs font-bold text-[#C9A449]">{i + 1}</span>
                <span className="text-sm text-white/75">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Exemple Gmail */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6" data-testid="extension-demo">
          <h2 className="mb-4 font-head text-2xl font-semibold text-white">Exemple dans Gmail</h2>
          <div className="rounded-2xl border border-white/10 bg-[#0f2647] p-4">
            <div className="flex items-center gap-2 text-white/90"><Sparkles size={14} className="text-[#C9A449]" /> <span className="text-sm font-semibold">Zayado Copilot</span></div>
            <div className="mt-3 text-sm text-white/80">Contact détecté : <b>Jean Dupont</b> — ABC (Prospect)</div>
            <div className="mt-2 text-xs text-white/50">Dernier échange · Projet associé · Valeur potentielle</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["Répondre avec l'IA", "Voir CRM", "Créer une tâche", "Créer une opportunité"].map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs text-white/80">
                  <ArrowRight size={11} className="text-[#9333EA]" /> {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60" data-testid="extension-note">
        <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
        Compatible Chrome / navigateurs Chromium. La connexion utilise votre compte MyExtension AI
        (aucune donnée n'est stockée hors de votre espace).
      </div>
    </div>
  );
}
