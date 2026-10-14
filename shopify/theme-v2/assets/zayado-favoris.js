/* Zayado — favoris : cœurs sur les cartes produits + page « Mes favoris » (localStorage). */
(function () {
  var CLE = "zy_favoris";

  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch (e) { return []; }
  }
  function ecrire(ids) { localStorage.setItem(CLE, JSON.stringify(ids)); }

  function coeur(actif) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="' + (actif ? "#B42318" : "none") +
      '" stroke="' + (actif ? "#B42318" : "#0D1F38") + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }

  function basculer(handle, btn) {
    var ids = lire();
    var i = ids.indexOf(handle);
    if (i >= 0) { ids.splice(i, 1); } else { ids.push(handle); }
    ecrire(ids);
    if (btn) { btn.innerHTML = coeur(i < 0); btn.classList.toggle("est-favori", i < 0); }
  }

  /* 1) Cœurs sur les cartes produits (collections, grille Zayado) */
  function poserCoeurs() {
    var ids = lire();
    document.querySelectorAll('a[href*="/products/"]').forEach(function (a) {
      var carte = a.closest(".card-wrapper, .zy-carte, .card, li, article") || a.parentElement;
      if (!carte || carte.querySelector(".zy-fav-btn")) return;
      if (!carte.querySelector("img")) return;  /* uniquement les vraies cartes produits (avec visuel) */
      var m = a.href.match(/\/products\/([a-z0-9-]+)/);
      if (!m) return;
      var handle = m[1];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zy-fav-btn" + (ids.indexOf(handle) >= 0 ? " est-favori" : "");
      btn.setAttribute("aria-label", "Garder en favori");
      btn.setAttribute("data-testid", "favori-" + handle);
      btn.innerHTML = coeur(ids.indexOf(handle) >= 0);
      btn.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); basculer(handle, btn); });
      if (getComputedStyle(carte).position === "static") carte.style.position = "relative";
      carte.appendChild(btn);
    });
  }

  /* 1b) Cœur sur la FICHE produit (à côté du titre) */
  function poserCoeurFiche() {
    var m = window.location.pathname.match(/^\/products\/([a-z0-9-]+)/);
    if (!m) return;
    var handle = m[1];
    if (document.getElementById("zy-fav-fiche")) return;
    var titre = document.querySelector(".product__title h1, .product__title, .zy-fiche-produit h1, main h1");
    if (!titre) return;
    var ids = lire();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "zy-fav-fiche";
    btn.className = "zy-fav-btn zy-fav-btn--fiche" + (ids.indexOf(handle) >= 0 ? " est-favori" : "");
    btn.setAttribute("aria-label", "Garder en favori");
    btn.setAttribute("data-testid", "favori-" + handle);
    btn.innerHTML = coeur(ids.indexOf(handle) >= 0);
    btn.addEventListener("click", function (e) { e.preventDefault(); basculer(handle, btn); });
    titre.style.position = "relative";
    titre.appendChild(btn);
  }

  /* 2) Page « Mes favoris » */
  function rendrePage() {
    var grille = document.getElementById("zy-fav-grille");
    if (!grille) return;
    var vide = document.getElementById("zy-fav-vide");
    var compte = document.getElementById("zy-fav-compte");
    var ids = lire();
    if (!ids.length) { vide.style.display = "flex"; grille.style.display = "none"; return; }
    vide.style.display = "none";
    compte.textContent = ids.length + " pièce" + (ids.length > 1 ? "s" : "") + " gardée" + (ids.length > 1 ? "s" : "") + " de côté";
    Promise.all(ids.map(function (h) {
      return fetch("/products/" + h + ".js").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (produits) {
      grille.innerHTML = "";
      produits.filter(Boolean).forEach(function (p) {
        var prix = (p.price / 100).toLocaleString("fr-FR", { style: "currency", currency: p.currency || "EUR" });
        var img = p.featured_image ? '<img src="' + p.featured_image + '&width=600" alt="" loading="lazy">' : "";
        var el = document.createElement("div");
        el.className = "zy-fav__carte";
        el.innerHTML = '<a href="/products/' + p.handle + '">' + img +
          '<span class="zy-fav__carte-corps"><span class="zy-fav__carte-nom">' + p.title + '</span>' +
          '<span class="zy-fav__carte-prix">' + prix + '</span></span></a>';
        grille.appendChild(el);
      });
      poserCoeurs();
    });
  }

  document.addEventListener("DOMContentLoaded", function () { poserCoeurs(); poserCoeurFiche(); rendrePage(); });
})();
