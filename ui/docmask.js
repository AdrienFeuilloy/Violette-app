// Masquage d'un document avant l'envoi à l'IA (Paperasse, « Option A »).
// Tout se passe sur le téléphone : le texte du document est lu ici, puis
// - chaque date devient un repère [DATE1], [DATE2]… (la vraie date reste ici),
// - chaque montant devient [MONTANT1], [MONTANT2]… (le vrai montant reste ici),
// - les adresses e-mail deviennent [EMAIL], les adresses postales [ADRESSE], les prénoms du foyer [PERSONNE],
// - tout autre nombre de 3 chiffres ou plus (IBAN, carte, compte, sécu, téléphone, code postal, référence) devient ###.
// L'IA ne voit que les repères : elle dit lequel est la date limite ou le montant principal, sans jamais en voir la valeur.

const MONTHS = { janv: 1, janvier: 1, fevr: 2, fevrier: 2, mars: 3, avr: 4, avril: 4, mai: 5, juin: 6, juil: 7, juillet: 7, aout: 8, sept: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12 };
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.$/, '');
const pad = n => String(n).padStart(2, '0');
function iso(y, m, d) {
  y = +y; m = +m; d = +d;
  if (y < 100) y += 2000;
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : '';
}
const toNumber = s => {
  s = s.replace(/[\s  ]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{1,2}$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(/[.,]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const MONTH_RE = 'janv\\.?|janvier|f[ée]vr\\.?|f[ée]vrier|mars|avr\\.?|avril|mai|juin|juil\\.?|juillet|ao[ûu]t|sept\\.?|septembre|oct\\.?|octobre|nov\\.?|novembre|d[ée]c\\.?|d[ée]cembre';
const DATE_RES = [
  [new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MONTH_RE})\\s+(\\d{4})\\b`, 'gi'), m => iso(m[3], MONTHS[strip(m[2])], m[1])],
  [/(?<![\d.\/\-])(\d{4})-(\d{2})-(\d{2})(?![.\/\-]?\d)/g, m => iso(m[1], m[2], m[3])],
  [/(?<![\d.\/\-])(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?![.\/\-]?\d)/g, m => iso(m[3], m[2], m[1])],
];
const NUM = '\\d{1,3}(?:[ \\u00a0\\u202f.]\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
const AMOUNT_RES = [
  new RegExp(`(?:€|EUR)\\s?(${NUM})`, 'gi'),
  new RegExp(`(${NUM})\\s?(?:€|EUR\\b|euros?\\b)`, 'gi'),
  /\b(\d+,\d{2})\b/g, // « 84,50 » sans symbole : en France, c'est presque toujours un montant
];
const REF_RE = /\b(?:n[°ºo]\.?|num[ée]ro|r[ée]f[ée]rence|r[ée]f\.?)\s*(?:de\s+|du\s+)?(?:la\s+|le\s+)?(?:facture|contrat|client|dossier|commande|adh[ée]rent|police|avis)?\s*[:.]?\s*([A-Z0-9][A-Z0-9\-\/]{3,24})/i;

export function maskDocument(text, { names = [] } = {}) {
  let t = String(text || '');
  const dates = [], amounts = [];
  const reference = (t.match(REF_RE) || [])[1] || '';
  for (const [re, conv] of DATE_RES) {
    t = t.replace(re, (...m) => {
      const v = conv(m);
      if (!v) return m[0];
      let k = dates.indexOf(v); if (k < 0) { dates.push(v); k = dates.length - 1; }
      return `[DATE${k + 1}]`;
    });
  }
  for (const re of AMOUNT_RES) {
    t = t.replace(re, (all, num) => {
      const v = toNumber(num);
      if (v === null) return all;
      let k = amounts.indexOf(v); if (k < 0) { amounts.push(v); k = amounts.length - 1; }
      return `[MONTANT${k + 1}]`;
    });
  }
  t = t.replace(/[\w.+\-]+@[\w\-]+\.[\w.\-]+/g, '[EMAIL]');
  // Adresses postales et prénoms du foyer
  t = t.replace(/\b(?:\d{1,4}\s*(?:bis|ter)?\s*,?\s*)?(?:rue|avenue|av\.|boulevard|bd|chemin|all[ée]e|impasse|place|route|quai|cours|lotissement|lieu[- ]dit)\b[^\n,]{0,60}/gi, '[ADRESSE]');
  // Civilités et libellés de personne : ce qui suit devient [PERSONNE]
  const W = "[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’\\-]+";
  t = t.replace(new RegExp(`\\b(M\\.|MM\\.|Mme|Mmes|Mlle|Mr|Monsieur|Madame|Mademoiselle)\\s+((?:${W}|[A-Z]\\.)(?:[ \\t]+(?:${W}|[A-Z]\\.)){0,3})`, 'g'), '$1 [PERSONNE]');
  t = t.replace(/\b(Nom(?:\s+et\s+pr[ée]nom)?|Pr[ée]nom|Nom\s+de\s+naissance|Titulaire|Assur[ée]e?|Souscripteur|B[ée]n[ée]ficiaire|Adh[ée]rent|Patient|Destinataire|Locataire|Propri[ée]taire|Conducteur|Client|Cliente|Abonn[ée]e?|Payeur|D[ée]biteur)((?:\s*\(s\))?(?:\s+(?:du|de\s+la|de\s+l['’]|des|de)\s*[A-Za-zÀ-ÿ]+)?\s*:\s*)[^\n:]{1,60}/gi, '$1$2[PERSONNE]');
  for (const n of names.filter(n => n && n.length > 1)) t = t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[PERSONNE]');
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{2,4}){3,8}\b/g, '###'); // IBAN
  t = t.replace(/\d(?:[\s.\-\/]?\d){2,}/g, '###'); // tout nombre de 3 chiffres ou plus
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { masked: t, dates, amounts, reference };
}

// Remplace les repères de la réponse de l'IA par les vraies valeurs (restées sur le téléphone).
export function unmask(x, { dates, amounts }) {
  const pick = (v, list, prefix) => { const m = String(v || '').match(new RegExp(`${prefix}(\\d+)`)); return m ? list[+m[1] - 1] ?? '' : ''; };
  const out = { ...x };
  for (const k of ['docDate', 'dueDate', 'endDate', 'warrantyEnd']) out[k] = pick(x[k], dates, 'DATE');
  const a = pick(x.amount, amounts, 'MONTANT');
  out.amount = a === '' ? '' : String(a);
  const fill = s => String(s || '').replace(/\[DATE(\d+)\]/g, (_, n) => { const d = dates[+n - 1]; return d ? d.split('-').reverse().join('/') : ''; })
    .replace(/\[MONTANT(\d+)\]/g, (_, n) => { const v = amounts[+n - 1]; return v != null ? v.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' : ''; });
  for (const k of ['title', 'action', 'summary']) if (out[k]) out[k] = fill(out[k]);
  return out;
}
