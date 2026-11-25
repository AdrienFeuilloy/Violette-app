/* =====================================================================
   Passerelle Paperasse → Budget  (BÊTA)            passerelle-budget.js
   ---------------------------------------------------------------------
   Principe : chaque app reste seule propriétaire de son fichier.
     • Paperasse écrit  JSON_PAPERASSE.json   (documents, montants, échéances)
     • Budget    écrit  JSON_PASSERELLE.json  (accusés : « j'ai bien importé X »)
   Ce module, importé par les deux apps :
     • transforme les documents Paperasse en « mouvements » pour le budget ;
     • dit à Budget ce qui est nouveau / modifié depuis le dernier import ;
     • permet à Budget de confirmer l'import (Paperasse affiche alors ✓).

   Utilisation côté Budget :
     import { Passerelle } from './passerelle-budget.js';
     const p = new Passerelle();                 // reprend les réglages GitHub du hub
     const { nouveaux, modifies } = await p.aImporter();
     // … créer / mettre à jour les opérations dans l'appli Budget …
     await p.confirmer(nouveaux.map(m => ({ key: m.key, budgetId: 'id-dans-budget' })));
   ===================================================================== */

export const PASSERELLE_VERSION = '0.1.0-beta';

/* À affiner avec tes vraies catégories de budget */
export const CATEGORIES_BUDGET = {
  facture: 'Logement & Charges',
  garantie: 'Shopping',
  contrat: 'Abonnements',
  sante: 'Santé',
  admin: 'Divers',
  banque: 'Logement & Charges',
  logement: 'Logement & Charges',
  vehicule: 'Transport',
  famille: 'Bébé',
  travail: 'Divers',
  autre: 'Divers',
};

const isISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };

/**
 * Transforme un document Paperasse en mouvements budgétaires.
 * Clé stable : `pap:<idDocument>:<date d'échéance ou du document>`
 *  → une échéance « prévue » puis « payée » garde la même clé (Budget met à jour au lieu de dupliquer).
 */
export function mouvementsDuDocument(doc) {
  if (!doc || doc.budget === 'exclu' || doc.status === 'archive') return [];
  const out = [];
  const base = {
    docId: doc.id,
    libelle: doc.title || 'Document',
    tiers: doc.issuer || '',
    categoriePaperasse: doc.category || 'autre',
    categorieBudget: CATEGORIES_BUDGET[doc.category] || CATEGORIES_BUDGET.autre,
    reference: doc.reference || '',
    recurrence: doc.renewal || '',          // '', mensuel, trimestriel, semestriel, annuel
    sens: 'depense',                         // beta : tout est dépense (remboursements → plus tard)
    lien: `./paperasse.html#doc=${encodeURIComponent(doc.id)}`,
  };
  // 1) Paiements déjà effectués (enregistrés par le bouton « Fait » de Paperasse)
  for (const p of doc.payments || []) {
    const ref = p.dueDate || p.date;
    if (!num(p.amount)) continue;
    out.push({ ...base, key: `pap:${doc.id}:${ref}`, statut: 'payee', date: p.date, echeance: p.dueDate || '', montant: num(p.amount) });
  }
  const amount = num(doc.amount);
  if (amount > 0) {
    // 2) Échéance à venir / en retard
    if (isISO(doc.dueDate) && doc.status === 'a_traiter') {
      const key = `pap:${doc.id}:${doc.dueDate}`;
      if (!out.some(m => m.key === key)) out.push({ ...base, key, statut: 'prevue', date: doc.dueDate, echeance: doc.dueDate, montant: amount });
    }
    // 3) Document sans échéance (achat, facture déjà réglée) → dépense à la date du document
    else if (!isISO(doc.dueDate) && !(doc.payments || []).length && isISO(doc.docDate)) {
      out.push({ ...base, key: `pap:${doc.id}:${doc.docDate}`, statut: 'payee', date: doc.docDate, echeance: '', montant: amount });
    }
  }
  return out;
}

export function tousLesMouvements(paperasseData) {
  return (paperasseData?.docs || []).flatMap(mouvementsDuDocument).sort((a, b) => a.date.localeCompare(b.date));
}

/* Empreinte d'un mouvement : si elle change (montant, date, statut…), Budget doit le mettre à jour */
export const empreinte = m => [m.statut, m.date, m.montant, m.libelle, m.categorieBudget].join('|');

/* ---------- Accès GitHub (réglages communs du hub) ---------- */
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
function utf8ToB64(str) { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); }
function b64ToUtf8(b64) { const bin = atob(b64.replace(/\s/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }

export class Passerelle {
  constructor(opts = {}) {
    const hub = { ...(read('violette_github', {}) || {}), ...Object.fromEntries(Object.entries(read('hub.github', {}) || {}).filter(([, v]) => v)) };
    const pap = read('paperasse.settings.v1', {}) || {};
    this.cfg = {
      owner: opts.owner ?? pap.owner ?? hub.owner, repo: opts.repo ?? pap.repo ?? hub.repo, branch: opts.branch ?? pap.branch ?? hub.branch ?? 'main', token: opts.token ?? pap.token ?? hub.token,
      paperassePath: opts.paperassePath ?? pap.path ?? 'JSON_PAPERASSE.json',
      passerellePath: opts.passerellePath ?? 'JSON_PASSERELLE.json',
    };
  }
  get enLigne() { const c = this.cfg; return !!(c.owner && c.repo && c.token); }
  _url(p) { const c = this.cfg; return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${p.split('/').map(encodeURIComponent).join('/')}`; }
  _h(accept = 'application/vnd.github+json') { return { Authorization: `Bearer ${this.cfg.token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }; }
  async _get(p) {
    const q = `?ref=${encodeURIComponent(this.cfg.branch)}`;
    const r = await fetch(this._url(p) + q, { headers: this._h(), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    const j = await r.json();
    let text = j.content && j.encoding === 'base64' ? b64ToUtf8(j.content) : await (await fetch(this._url(p) + q, { headers: this._h('application/vnd.github.raw+json'), cache: 'no-store' })).text();
    return { sha: j.sha, json: text.trim() ? JSON.parse(text) : null };
  }
  async _put(p, obj, sha, message) {
    const body = { message, content: utf8ToB64(JSON.stringify(obj, null, 1)), branch: this.cfg.branch }; if (sha) body.sha = sha;
    const r = await fetch(this._url(p), { method: 'PUT', headers: { ...this._h(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; throw e; }
  }

  /** Données Paperasse : version la plus récente entre GitHub et cet appareil */
  async lirePaperasse() {
    const local = read('paperasse.data.v1', null);
    if (!this.enLigne) return local;
    try { const r = await this._get(this.cfg.paperassePath); const remote = r?.json; if (!remote) return local; return (local?.updatedAt || 0) > (remote.updatedAt || 0) ? local : remote; }
    catch { return local; }
  }
  /** Accusés d'import écrits par Budget */
  async lireAccuses() {
    const local = read('passerelle.acks.v1', { acks: {} });
    if (!this.enLigne) return local;
    try { const r = await this._get(this.cfg.passerellePath); const remote = r?.json || { acks: {} }; return { ...remote, acks: { ...remote.acks, ...local.acks } }; }
    catch { return local; }
  }

  /** Ce que Budget doit créer ou mettre à jour */
  async aImporter() {
    const [data, acc] = await Promise.all([this.lirePaperasse(), this.lireAccuses()]);
    const toutes = tousLesMouvements(data);
    const nouveaux = [], modifies = [];
    for (const m of toutes) {
      const a = acc.acks?.[m.key];
      if (!a) nouveaux.push(m);
      else if (a.empreinte !== empreinte(m)) modifies.push({ ...m, budgetId: a.budgetId });
    }
    const cles = new Set(toutes.map(m => m.key));
    const supprimes = Object.entries(acc.acks || {}).filter(([k, a]) => !cles.has(k) && !a.supprime).map(([key, a]) => ({ key, budgetId: a.budgetId }));
    return { nouveaux, modifies, supprimes, toutes };
  }

  /**
   * Budget confirme ce qu'il a importé.
   * @param {Array<{key:string, budgetId?:string, supprime?:boolean}>} liste
   */
  async confirmer(liste) {
    if (!liste?.length) return;
    const data = await this.lirePaperasse();
    const parCle = new Map(tousLesMouvements(data).map(m => [m.key, m]));
    const maj = {};
    for (const { key, budgetId = '', supprime = false } of liste) {
      const m = parCle.get(key);
      maj[key] = { at: Date.now(), budgetId, statut: m?.statut || '', montant: m?.montant ?? null, empreinte: m ? empreinte(m) : '', supprime };
    }
    // Copie locale immédiate (même appareil) …
    const local = read('passerelle.acks.v1', { acks: {} });
    localStorage.setItem('passerelle.acks.v1', JSON.stringify({ ...local, acks: { ...local.acks, ...maj } }));
    // … puis GitHub (fusion + nouvel essai si conflit)
    if (!this.enLigne) return;
    for (let i = 0; i < 4; i++) {
      const r = await this._get(this.cfg.passerellePath);
      const cur = r?.json || { app: 'passerelle', schema: 1, acks: {} };
      const next = { ...cur, app: 'passerelle', schema: 1, version: PASSERELLE_VERSION, updatedAt: Date.now(), acks: { ...cur.acks, ...maj } };
      try { await this._put(this.cfg.passerellePath, next, r?.sha, `Passerelle budget : ${liste.length} accusé(s)`); return; }
      catch (e) { if ((e.status === 409 || e.status === 422) && i < 3) continue; throw e; }
    }
  }
}
