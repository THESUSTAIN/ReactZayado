// Pont Extension Chrome — fix E2 (audit).
//
// Transmet la session web à l'extension Zayado Copilot quand elle est
// installée, pour que le side panel se connecte automatiquement au lieu de
// rester bloqué sur "cliquez le lien puis revenez" sans jamais se mettre à
// jour (bug réel identifié dans sidepanel.js). Repose sur
// `externally_connectable` déclaré dans chrome-extension/manifest.json.
//
// ⚠️ Limite à connaître avant mise en prod : l'ID d'extension Chrome est
// généré par le Chrome Web Store à la publication (ou fixé manuellement en
// dev via un champ "key" dans manifest.json pour un ID stable en local). Tant
// que l'extension n'est pas publiée, il n'y a PAS d'ID définitif — la
// constante ci-dessous est un placeholder à remplacer une fois l'extension
// publiée (ou chargée en local avec un ID fixe pour les tests).
const ZAYADO_EXTENSION_ID = "REMPLACER_PAR_L_ID_REEL_APRES_PUBLICATION_CHROME_WEB_STORE";

function hasExtensionApi() {
  return (
    typeof window !== "undefined" &&
    window.chrome &&
    window.chrome.runtime &&
    typeof window.chrome.runtime.sendMessage === "function" &&
    ZAYADO_EXTENSION_ID &&
    !ZAYADO_EXTENSION_ID.startsWith("REMPLACER_")
  );
}

/**
 * À appeler juste après une connexion réussie (magic link ou OAuth) pour
 * que l'extension Chrome, si installée, récupère la session sans que
 * l'utilisateur ait à se reconnecter une 2e fois dans le side panel.
 * Ne fait rien si l'extension n'est pas installée ou pas encore publiée
 * (échoue en silence — ce n'est jamais bloquant pour la connexion web).
 */
export function notifyExtensionOfSession(token, email) {
  if (!hasExtensionApi()) return;
  try {
    window.chrome.runtime.sendMessage(
      ZAYADO_EXTENSION_ID,
      { type: "zayado_session", token, email: email || "" },
      () => { /* pas de callback obligatoire, on ignore chrome.runtime.lastError */ }
    );
  } catch (e) {
    // Extension non installée / navigateur non-Chrome : silencieux, non bloquant.
  }
}

/** À appeler à la déconnexion pour vider aussi la session de l'extension. */
export function notifyExtensionOfLogout() {
  if (!hasExtensionApi()) return;
  try {
    window.chrome.runtime.sendMessage(ZAYADO_EXTENSION_ID, { type: "zayado_logout" }, () => {});
  } catch (e) {
    // silencieux
  }
}
