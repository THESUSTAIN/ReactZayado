/**
 * Zayado RH — installation sur Google Workspace (équivalent du script Microsoft Install-ZayadoRH.ps1).
 * À coller dans le Google Sheets importé : Extensions › Apps Script › Exécuter « installer ».
 * Relançable : ce qui existe déjà est gardé, seul le manquant est créé (comme le script Microsoft).
 *
 * Ce que fait le script :
 *  1. crée le dossier « Zayado RH » (s'il n'existe pas) et y range ce classeur ;
 *  2. crée « Documents-RH » et, pour chaque personne de l'onglet Annuaire, un dossier (+ « Bulletins ») partagé avec elle seule ;
 *  3. déplace les onglets PRIVÉS (Contrats, DossierSalarie, Pieces…) dans un classeur « Données privées » que seul toi ouvres ;
 *  4. protège les onglets de référence (Annuaire, Planning…) : l'équipe lit, seuls les employeurs modifient.
 */
var REF = ['Annuaire', 'Planning', 'Parametres', 'AccesOutils', 'TypesPieces', 'PiecesRequises'];
var PRIVES = ['Contrats', 'DossierSalarie', 'Pieces', 'PlanningPerso', 'SousTaches', 'Livraisons', 'Absences'];
var PARTAGES = ['Presence'];

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var moi = Session.getActiveUser().getEmail();
  var racine = dossier_(DriveApp.getRootFolder(), 'Zayado RH');
  var fichier = DriveApp.getFileById(ss.getId());
  if (!estDans_(fichier, racine)) { fichier.moveTo(racine); }

  // 1) Données privées : un classeur à part, non partagé
  var prive = classeurPrive_(racine, ss.getName() + ' – Données privées');
  PRIVES.forEach(function (nom) {
    var f = ss.getSheetByName(nom);
    if (f && !prive.getSheetByName(nom)) {
      f.copyTo(prive).setName(nom);
    }
    if (f && prive.getSheetByName(nom)) { ss.deleteSheet(f); }
  });
  var vide = prive.getSheetByName('Feuille 1') || prive.getSheetByName('Sheet1');
  if (vide && prive.getSheets().length > 1) { prive.deleteSheet(vide); }

  var employeurs = employeurs_(ss);

  // 2) Onglets de référence : protégés (seul le propriétaire et les éditeurs choisis modifient)
  REF.forEach(function (nom) {
    var f = ss.getSheetByName(nom);
    if (!f) { return; }
    var p = f.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0] || f.protect();
    p.setDescription('Zayado RH : référence, modifiable par les employeurs');
    var garder = [moi.toLowerCase()].concat(employeurs);
    p.removeEditors(p.getEditors().filter(function (u) { return garder.indexOf(u.getEmail().toLowerCase()) < 0; }));
    if (employeurs.length) { p.addEditors(employeurs); }
    if (p.canDomainEdit()) { p.setDomainEdit(false); }
  });

  // 3) Documents-RH : un dossier par personne, partagé avec elle seule
  var docs = dossier_(racine, 'Documents-RH');
  var annuaire = ss.getSheetByName('Annuaire');
  var crees = 0, partages = 0;
  if (annuaire) {
    var v = annuaire.getDataRange().getValues();
    var t = v[0].map(String);
    var iNom = t.indexOf('Title'), iMail = t.indexOf('Email'), iRole = t.indexOf('Role');
    for (var r = 1; r < v.length; r++) {
      var nom = String(v[r][iNom] || '').trim();
      var mail = String(v[r][iMail] || '').trim().toLowerCase();
      if (!nom || !mail || mail.indexOf('@') < 0 || /exemple|entreprise\.fr$/.test(mail)) { continue; }
      var avant = docs.getFoldersByName(nom).hasNext();
      var d = dossier_(docs, nom);
      dossier_(d, 'Bulletins');
      if (!avant) { crees++; }
      var deja = d.getEditors().some(function (u) { return u.getEmail().toLowerCase() === mail; });
      if (!deja && mail !== moi.toLowerCase()) {
        try { d.addEditor(mail); partages++; } catch (e) { Logger.log('Partage impossible pour ' + mail + ' : ' + e); }
      }
      // Les employeurs ont accès au classeur de référence en lecture ; les salariés aussi
      try {
        if (String(v[r][iRole]) === 'Employeur') { fichier.addEditor(mail); } else { fichier.addViewer(mail); }
      } catch (e) { Logger.log('Accès au classeur impossible pour ' + mail + ' : ' + e); }
    }
  }
  // Présence : tout le monde lit et écrit sa ligne (onglet non protégé)
  PARTAGES.forEach(function (nom) { if (!ss.getSheetByName(nom)) { ss.insertSheet(nom); } });

  var bilan = 'Installation terminée.\n\nDossier : ' + racine.getUrl() + '\nDossiers créés : ' + crees + ', partages ajoutés : ' + partages +
    '\nDonnées privées : ' + prive.getUrl() + '\n\nDans Zayado › Ton entreprise › Réglages, colle le lien du dossier « Zayado RH ».';
  Logger.log(bilan);
  try { SpreadsheetApp.getUi().alert(bilan); } catch (e) { /* exécuté hors de l'interface */ }
}

/** Adresses des personnes marquées « Employeur » dans l'onglet Annuaire. */
function employeurs_(ss) {
  var a = ss.getSheetByName('Annuaire');
  if (!a) { return []; }
  var v = a.getDataRange().getValues(), t = v[0].map(String);
  var iMail = t.indexOf('Email'), iRole = t.indexOf('Role'), out = [];
  for (var r = 1; r < v.length; r++) {
    var m = String(v[r][iMail] || '').trim().toLowerCase();
    if (m && m.indexOf('@') > 0 && String(v[r][iRole]) === 'Employeur') { out.push(m); }
  }
  return out;
}

function dossier_(parent, nom) {
  var it = parent.getFoldersByName(nom);
  return it.hasNext() ? it.next() : parent.createFolder(nom);
}

function estDans_(fichier, dossier) {
  var p = fichier.getParents();
  while (p.hasNext()) { if (p.next().getId() === dossier.getId()) { return true; } }
  return false;
}

function classeurPrive_(racine, nom) {
  var it = racine.getFilesByName(nom);
  if (it.hasNext()) { return SpreadsheetApp.open(it.next()); }
  var s = SpreadsheetApp.create(nom);
  DriveApp.getFileById(s.getId()).moveTo(racine);
  return s;
}

/** Menu « Zayado RH » dans le classeur, pour relancer l'installation après avoir ajouté des personnes. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Zayado RH').addItem('Installer / mettre à jour', 'installer').addToUi();
}
