import axios from "axios";
import { API, getUid } from "@/lib/api";

export const T = {
  fr: {
    search: "Rechercher...",
    nav_cockpit: "Cockpit", nav_valider: "Valider projet", nav_vision: "Vision",
    nav_croissance: "Croissance", nav_bureau: "Mon Bureau", nav_travail: "Travail", nav_pilotage: "Pilotage", nav_bienetre: "Moi", nav_copilote: "Co-pilote",
    soon: "page bientôt disponible",
    settings: "Paramètres", help: "Aide & support", logout: "Déconnexion", language: "Langue",
    role: "Solopreneur",
    ob_title: "Bienvenue dans MyExtension AI",
    ob_sub: "Personnalise ton cockpit en 10 secondes.",
    ob_theme: "Choisis ton ambiance", ob_menu: "Choisis la position du menu",
    theme_dark: "Sombre (Sens)", theme_light: "Clair (Clarté)",
    menu_bottom: "Barre en bas", menu_left: "Menu à gauche",
    ob_start: "Entrer dans mon cockpit", ob_step: "Étape",
    set_appearance: "Apparence", set_theme: "Thème", set_menu: "Position du menu",
    set_profile: "Profil", set_name: "Nom", set_email: "Email",
    set_saved: "Préférences enregistrées",
  },
  en: {
    search: "Search...",
    nav_cockpit: "Cockpit", nav_valider: "Validate", nav_vision: "Vision",
    nav_croissance: "Growth", nav_bureau: "My Office", nav_travail: "Work", nav_pilotage: "Finances", nav_bienetre: "Me", nav_copilote: "Co-pilot",
    soon: "page coming soon",
    settings: "Settings", help: "Help & support", logout: "Log out", language: "Language",
    role: "Solopreneur",
    ob_title: "Welcome to MyExtension AI",
    ob_sub: "Personalize your cockpit in 10 seconds.",
    ob_theme: "Pick your vibe", ob_menu: "Pick your menu position",
    theme_dark: "Dark (Sens)", theme_light: "Light (Clarté)",
    menu_bottom: "Bottom bar", menu_left: "Left menu",
    ob_start: "Enter my cockpit", ob_step: "Step",
    set_appearance: "Appearance", set_theme: "Theme", set_menu: "Menu position",
    set_profile: "Profile", set_name: "Name", set_email: "Email",
    set_saved: "Preferences saved",
  },
};

export const prefsApi = {
  get: () => axios.get(`${API}/prefs`, { params: { user_id: getUid() } }).then((r) => r.data),
  save: (data) => axios.put(`${API}/prefs`, data, { params: { user_id: getUid() } }).then((r) => r.data),
};

export function makeT(lang) {
  const dict = T[lang] || T.fr;
  return (key) => dict[key] || T.fr[key] || key;
}
