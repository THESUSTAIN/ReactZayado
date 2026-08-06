// Background service worker — menu contextuel "Envoyer à MyExtension AI".
const APP_URL = "https://app.zayado.net";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "zayado-capture",
    title: "Envoyer à MyExtension AI",
    contexts: ["selection", "link", "page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const name = encodeURIComponent((tab && tab.title) || "");
  const url = encodeURIComponent(info.linkUrl || (tab && tab.url) || "");
  const note = encodeURIComponent(info.selectionText || "");
  chrome.tabs.create({ url: `${APP_URL}/croissance?capture_name=${name}&capture_url=${url}&capture_note=${note}` });
});
