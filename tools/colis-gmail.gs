/**
 * Gestion quotidien — Colis automatiques depuis Gmail
 * ---------------------------------------------------
 * Toutes les 15 minutes, ce script lit les nouveaux mails de commande et d'expédition,
 * en tire la boutique, le transporteur, le numéro de suivi et le point relais,
 * puis ajoute ou met à jour la ligne correspondante dans l'appli Colis (JSON_COLIS.json, dépôt privé).
 *
 * - Tes mails restent chez Google : rien n'est envoyé ailleurs qu'à ton dépôt GitHub privé.
 * - Aucune IA : la lecture se fait avec des règles simples.
 * - Pas de doublon : un même numéro de commande ou de suivi met à jour la ligne existante.
 *
 * Mise en place : voir le tuto. En bref :
 *   1. Coller ce fichier dans un projet sur script.google.com
 *   2. Paramètres du projet → Propriétés du script → ajouter GITHUB_TOKEN
 *   3. Lancer « tester » (ne rien écrire), puis « installer » (une seule fois)
 */

const CFG = {
  owner: 'AdrienFeuilloy',
  repo: 'phant-studio-data',
  branch: 'main',
  path: 'JSON_COLIS.json',
  premiersJours: 3,      // au premier lancement, combien de jours de mails relire
  delaiRelais: 10,       // jours pour retirer un colis en point relais (si le mail ne le dit pas)
};

/* ===================== À lancer à la main ===================== */

/** Une seule fois : crée le déclencheur « toutes les 15 minutes » puis fait une première lecture. */
function installer() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verifierMails').timeBased().everyMinutes(15).create();
  verifierMails();
  Logger.log('✅ Installé : le script tournera toutes les 15 minutes.');
}

/** Lit les mails des 7 derniers jours et affiche ce qui serait ajouté, SANS rien écrire. */
function tester() {
  const found = lireMails_(Date.now() - 7 * 864e5, new Set());
  if (!found.length) Logger.log('Aucun mail de commande ou d’expédition trouvé sur 7 jours.');
  found.forEach(r => Logger.log(`${r.status.padEnd(8)} | ${r.shop} | ${r.title} | suivi : ${r.track || '—'} | commande : ${r.order || '—'} | relais : ${r.place || '—'}`));
  if (!PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN')) Logger.log('⚠️ GITHUB_TOKEN manquant dans les propriétés du script.');
}

/** Arrête tout (supprime le déclencheur). */
function desinstaller() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Script arrêté : plus de lecture automatique.');
}

/* ===================== Lancé toutes les 15 minutes ===================== */

function verifierMails() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Ajoute GITHUB_TOKEN dans Paramètres du projet → Propriétés du script.');
  const since = Number(props.getProperty('DERNIER_PASSAGE')) || Date.now() - CFG.premiersJours * 864e5;
  const seen = new Set(JSON.parse(props.getProperty('DEJA_LUS') || '[]'));
  const startedAt = Date.now();
  const found = lireMails_(since, seen);
  if (found.length) ecrireDansColis_(found, token);
  props.setProperty('DEJA_LUS', JSON.stringify([...seen].slice(-600)));
  props.setProperty('DERNIER_PASSAGE', String(startedAt));
  if (found.length) Logger.log(`${found.length} mail(s) de colis traité(s).`);
}

/* ===================== Lecture des mails ===================== */

const SUJETS = ['commande', 'commandé', 'expédié', 'expédiée', 'expédition', 'colis', 'livraison', 'livré', 'livrée', '"point relais"', 'retrait', 'order', 'shipped', 'delivered', 'shipment', 'envoi', 'achat'];

function lireMails_(since, seen) {
  // une heure de marge, Gmail arrondit les dates de recherche
  const q = `after:${Math.floor((since - 3600e3) / 1000)} -in:chats -in:sent -category:social subject:(${SUJETS.join(' OR ')})`;
  const out = [];
  GmailApp.search(q, 0, 60).forEach(th => th.getMessages().forEach(m => {
    const id = m.getId();
    if (seen.has(id) || m.getDate().getTime() < since - 3600e3) return;
    seen.add(id);
    const r = analyser({ subject: m.getSubject(), from: m.getFrom(), body: m.getPlainBody(), date: m.getDate() });
    if (r) out.push(r);
  }));
  return out.sort((a, b) => a.at - b.at);
}

/* ===================== Analyse d'un mail (sans IA) ===================== */

const STATUTS = [
  ['retirer', /disponible (?:en|au|dans (?:votre|le)) (?:point relais|relais|consigne|locker|bureau de poste|magasin)|(?:est|sera) (?:pr[eê]t|disponible) (?:à être )?(?:retir|r[ée]cup[ée]r)|vous attend (?:en|au|dans)|en attente de retrait|à retirer|à r[ée]cup[ée]rer (?:avant|jusqu)|ready for (?:pick-?up|collection)/i],
  ['recu', /(?:a|ont) [ée]t[ée] livr[ée]e?s?\b|votre (?:colis|commande) est livr[ée]e?|livr[ée]e? (?:le|ce|aujourd)|has been delivered|was delivered|delivered today|colis (?:a été )?r[ée]cup[ée]r[ée]/i],
  ['route', /exp[ée]di[ée]e?s?\b|exp[ée]dition|en cours de livraison|en route|en chemin|remis(?:e)? (?:au|à notre) transporteur|pris en charge par|en cours d'acheminement|livraison pr[ée]vue|arrive (?:bient[ôo]t|demain|aujourd)|has shipped|shipped|out for delivery|on its way/i],
  ['commande', /confirmation de (?:votre )?commande|merci pour votre (?:commande|achat)|nous avons (?:bien )?re[çc]u votre commande|commande (?:n°|no|num[ée]ro|#)?\s*\S*\s*(?:est |a été )?(?:confirm[ée]e|valid[ée]e|enregistr[ée]e)|order confirm|thank you for your order|votre achat sur/i],
];
// Mails à ignorer même s'ils parlent de commande (pubs, avis, factures seules, retours)
const IGNORER = /donnez votre avis|[ée]valuez|notez votre|laissez un avis|newsletter|se d[ée]sinscrire.{0,40}promo|code promo|soldes|offre exclusive|remboursement effectu|retour (?:accept|re[çc]u)|facture disponible|votre panier vous attend|panier abandonn/i;

const TRANSPORTEURS = [
  ['UPS', /\b(1Z[0-9A-Z]{16})\b/i],
  ['Amazon', /\b(TBA\d{10,14})\b/i],
  ['Chronopost', /\b([A-Z]{2}\d{9}(?!FR\b)[A-Z]{2})\b/],
  ['Colissimo', /\b(\d[A-Z]\d{11}|6[A-Z]\d{11}|[A-Z]{2}\d{9}FR)\b/],
];
// Numéros tout en chiffres : acceptés seulement juste après un mot comme « suivi » ou « colis »
const SUIVI_CHIFFRES = /(?:num[ée]ro de (?:suivi|colis|tracking|l'envoi|d'envoi|exp[ée]dition)|n°\s*(?:de )?(?:suivi|colis|d'envoi|d'exp[ée]dition)|tracking(?: number| n°| no\.?)?|suivi(?: de colis)?|colis n°|exp[ée]dition n°)\s*[:#]?\s*([0-9]{8,14}|[A-Z0-9]{10,22})\b/i;
// Liens de suivi : le numéro est dans l'adresse
const SUIVI_LIEN = /[?&](?:tracknum|trackingNumber|tracking-id|tracking_number|code|numeroExpedition|listeNumerosLT|match|parcelNumber|shipmentNumber)=([A-Z0-9]{8,30})/i;
const COMMANDE = /(?:commande|order|achat)\s*(?:n°|no\.?|num[ée]ro|#|r[ée]f[ée]rence|id)?\s*[:#]?\s*((?=[A-Z0-9\-]*\d)[A-Z0-9][A-Z0-9\-]{4,24})\b/i;

function analyser(mail) {
  const subject = String(mail.subject || '').replace(/^(?:re|tr|fwd?)\s*:\s*/i, '').trim();
  const body = String(mail.body || '').slice(0, 30000);
  const txt = subject + '\n' + body;
  if (IGNORER.test(subject)) return null;
  const st = STATUTS.find(([, re]) => re.test(subject)) || STATUTS.find(([, re]) => re.test(body));
  if (!st) return null;

  let track = '', carrier = '';
  for (const [name, re] of TRANSPORTEURS) { const m = txt.match(re); if (m) { track = m[1].toUpperCase(); carrier = name; break; } }
  if (!track) { const m = txt.match(SUIVI_LIEN) || txt.match(SUIVI_CHIFFRES); if (m) track = m[1].toUpperCase(); }
  let order = (txt.match(COMMANDE) || [])[1] || '';
  if (order && order.toUpperCase() === track) order = '';

  const shop = boutique_(mail.from, subject);
  const r = {
    status: st[0] === 'commande' ? 'route' : st[0],
    step: st[0],
    shop,
    title: titre_(subject, shop, order),
    track, carrier, order: order.toUpperCase(),
    place: '', deadline: '', expected: '',
    at: mail.date ? new Date(mail.date).getTime() : Date.now(),
  };
  if (r.status === 'retirer') {
    const p = body.match(/(?:point relais|relais pickup|relais|consigne|locker|bureau de poste|lieu de retrait|adresse de retrait)\s*[:\-]?\s*\n?\s*([A-ZÀ-Ý0-9][^\n]{2,60})/i);
    if (p) r.place = p[1].replace(/\s{2,}/g, ' ').trim();
    const d = body.match(/(?:jusqu'?au|avant le|au plus tard le|retirer avant|disponible jusqu'au)\s*(?:le\s*)?(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/i);
    r.deadline = d ? iso_(d[1], d[2], d[3], r.at) : isoPlus_(r.at, CFG.delaiRelais);
  }
  if (r.status === 'route') {
    const e = body.match(/(?:livraison pr[ée]vue|livr[ée]e? (?:le|entre le)|arriv[ée]e? pr[ée]vue|date de livraison estim[ée]e|delivery (?:date|by))\s*[:\-]?\s*(?:le\s*)?([^\n]{4,40})/i);
    if (e) r.expected = e[1].replace(/[.,;]\s*$/, '').trim();
    if (st[0] === 'commande' && !r.expected) r.expected = 'Commandé';
  }
  return r;
}

function boutique_(from, subject) {
  let n = String(from || '').replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
  if (!n || /@/.test(n)) n = (String(from || '').match(/@([a-z0-9\-]+)\./i) || [])[1] || '';
  n = n.replace(/\b(?:no-?reply|ne-?pas-?r[ée]pondre|service client|customer service|notifications?|commandes?|orders?|livraison|shipping|team|l'équipe)\b/gi, '').replace(/\s*[-–|·]\s*$/, '').replace(/\.(fr|com|de|eu)$/i, '').trim();
  return (n || (subject.match(/\b(Amazon|Vinted|Leboncoin|Cdiscount|Fnac|Darty|Zalando|IKEA|Decathlon|AliExpress|Temu|Shein|Vertbaudet|Cultura)\b/i) || [])[1] || 'Commande').slice(0, 40);
}

function titre_(subject, shop, order) {
  const q = subject.match(/[«"“]\s*([^»"”]{3,70}?)\s*[»"”]/); // produit entre guillemets
  if (q) return q[1].trim();
  const esc = shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let t = subject
    .replace(new RegExp(esc + '(?:\\.(?:fr|com|de|eu))?', 'ig'), '')
    .replace(/(?:votre|your)?\s*(?:commande|order)\s*(?:n°|no\.?|num[ée]ro|#)?\s*[:#]?\s*[A-Z0-9\-]{5,}/ig, '')
    .replace(/^[\s:\-–|·!]+|[\s:\-–|·!]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  // Sujet générique (« Votre colis a été expédié », « Livraison prévue demain »…) : on nomme par la boutique
  if (t.length < 4 || /^(?:votre|ton|vos|tes|your)?\s*(?:colis|commande|livraison|exp[ée]dition|envoi|achat|order|package|shipment|confirmation|merci)\b/i.test(t)) t = `Colis ${shop}${order ? ' · ' + order.slice(-6) : ''}`;
  return t.slice(0, 70);
}

const pad_ = n => String(n).padStart(2, '0');
function iso_(d, m, y, at) { const ref = new Date(at); let Y = y ? (+y < 100 ? 2000 + +y : +y) : ref.getFullYear(); if (!y && +m < ref.getMonth() + 1 - 6) Y++; return `${Y}-${pad_(m)}-${pad_(d)}`; }
function isoPlus_(at, days) { const d = new Date(at + days * 864e5); return `${d.getFullYear()}-${pad_(d.getMonth() + 1)}-${pad_(d.getDate())}`; }

/* ===================== Écriture dans le dépôt privé ===================== */

const RANG = { route: 0, retirer: 1, recu: 2 };

function fusionner(data, found) {
  data.items = data.items || [];
  let added = 0, updated = 0;
  for (const r of found) {
    const now = Date.now();
    const same = data.items.find(x => (r.track && x.track && x.track.replace(/\s/g, '').toUpperCase() === r.track) || (r.order && x.order && x.order === r.order));
    if (same) {
      const patch = {};
      if (RANG[r.status] > (RANG[same.status] ?? 0)) { patch.status = r.status; if (r.status === 'recu') patch.gotAt = isoPlus_(r.at, 0); }
      for (const k of ['track', 'place', 'deadline', 'expected', 'order']) if (r[k] && !same[k]) patch[k] = r[k];
      if (r.status === 'retirer' && r.deadline && same.status !== 'recu') patch.deadline = r.deadline;
      if (Object.keys(patch).length) { Object.assign(same, patch, { updatedAt: now }); updated++; }
    } else {
      if (r.status === 'recu') continue; // déjà livré et jamais vu : inutile d'encombrer la liste
      data.items.push({
        id: 'm' + now.toString(36) + Math.random().toString(36).slice(2, 7),
        title: r.title, shop: r.shop, place: r.place, expected: r.expected, when: '', track: r.track,
        status: r.status, deadline: r.deadline, gotAt: '', price: '', forWho: '',
        notes: '', order: r.order, source: 'mail', createdAt: now, updatedAt: now,
      });
      added++;
    }
  }
  if (added || updated) data.updatedAt = Date.now();
  return { added, updated };
}

function ecrireDansColis_(found, token) {
  const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${encodeURIComponent(CFG.path)}`;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  for (let essai = 0; essai < 3; essai++) {
    const g = UrlFetchApp.fetch(`${url}?ref=${CFG.branch}`, { headers, muteHttpExceptions: true });
    let data = { app: 'colis', schema: 1, items: [], tombstones: {}, settings: { relayDays: CFG.delaiRelais }, settingsAt: 0, updatedAt: 0 }, sha;
    if (g.getResponseCode() === 200) {
      const j = JSON.parse(g.getContentText());
      sha = j.sha;
      data = JSON.parse(Utilities.newBlob(Utilities.base64Decode(j.content.replace(/\n/g, ''))).getDataAsString('UTF-8'));
    } else if (g.getResponseCode() !== 404) throw new Error('GitHub (lecture) : ' + g.getResponseCode() + ' ' + g.getContentText().slice(0, 200));
    const { added, updated } = fusionner(data, found);
    if (!added && !updated) return;
    const body = { message: `Colis depuis Gmail : ${added} ajouté(s), ${updated} mis à jour`, branch: CFG.branch, content: Utilities.base64Encode(Utilities.newBlob(JSON.stringify(data, null, 1), 'application/json').getBytes()) };
    if (sha) body.sha = sha;
    const p = UrlFetchApp.fetch(url, { method: 'put', headers, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
    if (p.getResponseCode() < 300) { Logger.log(`GitHub : ${added} ajouté(s), ${updated} mis à jour.`); return; }
    if (p.getResponseCode() !== 409 && p.getResponseCode() !== 422) throw new Error('GitHub (écriture) : ' + p.getResponseCode() + ' ' + p.getContentText().slice(0, 200));
    Utilities.sleep(1500); // le fichier a changé entre-temps (l'appli vient d'écrire) : on relit et on recommence
  }
  throw new Error('GitHub : le fichier change trop souvent, nouvel essai au prochain passage.');
}

// Pour les tests hors de Google (Node)
if (typeof module !== 'undefined') module.exports = { analyser, fusionner };
