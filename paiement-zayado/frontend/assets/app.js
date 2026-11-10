(function () {
  // L'API est celle de l'appli. Par défaut on passe par /api, relayé vers app.zayado.net par l'hébergeur (voir LISEZ-MOI).
  var API = (window.ZAYADO_API || '/api').replace(/\/$/, '');
  var $ = function (id) { return document.getElementById(id); };
  var offres = [], choisie = null;
  var euro = function (v) { return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }).replace(',00', ''); };

  function erreur(t) { var e = $('erreur'); e.textContent = t || ''; e.className = t ? 'msg err' : 'msg'; }

  function maj() {
    var devis = choisie && choisie.id === 'devis';
    $('bloc-devis').classList.toggle('hide', !devis);
    $('choix').textContent = choisie ? choisie.titre : 'Choisissez une prestation';
    var m = devis ? parseFloat(($('montant').value || '').replace(',', '.')) : (choisie ? parseFloat(choisie.prix) : NaN);
    $('prix').textContent = isNaN(m) ? '—' : euro(m);
    $('payer').disabled = !choisie || !$('cgv').checked;
  }

  function afficher() {
    var box = $('offres'); box.innerHTML = '';
    var actives = offres.filter(function (o) { return o.actif; });
    if (!actives.length) { box.innerHTML = '<p class="note">Aucune offre n\'est payable en ligne pour le moment. Écrivez-nous depuis <a href="https://zayado.net/pages/contact">la page Contact</a>.</p>'; return; }
    actives.forEach(function (o) {
      var l = document.createElement('label'); l.className = 'offre'; l.dataset.id = o.id;
      l.innerHTML = '<input type="radio" name="offre" value="' + o.id + '"><div><b></b><span></span></div><div class="prix"></div>';
      l.querySelector('b').textContent = o.titre;
      l.querySelector('span').textContent = o.texte;
      l.querySelector('.prix').textContent = o.prix ? euro(o.prix) : 'Selon devis';
      l.querySelector('input').addEventListener('change', function () {
        choisie = o; [].forEach.call(document.querySelectorAll('.offre'), function (x) { x.classList.toggle('on', x.dataset.id === o.id); }); maj();
      });
      box.appendChild(l);
    });
    var pre = new URLSearchParams(location.search).get('offre');
    var r = pre && box.querySelector('input[value="' + pre.replace(/[^a-z0-9-]/g, '') + '"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
  }

  fetch(API + '/paiement/offres').then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (d) { offres = d.offres || []; afficher(); })
    .catch(function () { $('offres').innerHTML = '<p class="note">Les offres ne se chargent pas. Réessayez dans un instant ou écrivez-nous depuis <a href="https://zayado.net/pages/contact">la page Contact</a>.</p>'; });

  $('cgv').addEventListener('change', maj);
  $('montant').addEventListener('input', maj);

  $('form').addEventListener('submit', function (e) {
    e.preventDefault(); erreur('');
    if (!choisie) return erreur('Choisissez une prestation.');
    var f = function (n) { return ($(n).value || '').trim(); };
    if (!f('prenom') || !f('nom')) return erreur('Indiquez votre prénom et votre nom.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f('email'))) return erreur('Vérifiez votre adresse e-mail.');
    var corps = { offre: choisie.id, prenom: f('prenom'), nom: f('nom'), email: f('email'), societe: f('societe'), telephone: f('telephone'), message: f('message'), accepte_conditions: $('cgv').checked };
    if (choisie.id === 'devis') {
      corps.reference = f('reference'); corps.montant = parseFloat(f('montant').replace(',', '.'));
      if (!corps.reference || !(corps.montant >= 1)) return erreur('Indiquez la référence et le montant de votre devis.');
    }
    var b = $('payer'); b.disabled = true; b.textContent = 'Redirection vers Mollie…';
    fetch(API + '/paiement/commande', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (x.ok && x.d.checkout_url) { location.href = x.d.checkout_url; return; }
        throw new Error(typeof x.d.detail === 'string' ? x.d.detail : 'Le paiement n\'a pas pu démarrer.');
      })
      .catch(function (err) { erreur(err.message || 'Le paiement n\'a pas pu démarrer. Réessayez dans un instant.'); b.textContent = 'Payer en toute sécurité'; maj(); });
  });
})();
