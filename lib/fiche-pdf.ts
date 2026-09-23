import { jsPDF, GState } from "jspdf";
import { moisEntre } from "./calcul-vv";
import { libelleBareme, libelleCategorie, LABELS_ENTRETIEN_FICHE } from "./libelles-vv";
import { LOGO_ECART_BADGE_PDF, LOGO_RATIO, LOGO_TEXTE_FIN } from "./logo-metrics";

// Fiche de valeur vénale — UNE SEULE PAGE A4, quelle que soit la donnée.
// Mise en page à budget vertical fixe : chaque section a une hauteur
// bornée (valeurs trop longues réduites puis tronquées avec "…", jamais
// passées à la ligne), et la fonction renvoie la position du bas de
// contenu pour que l'appelant/les tests puissent vérifier qu'il reste
// au-dessus du pied de page. Polices standard (WinAnsi) : pas de
// β/λ/≤/≥ — remplacés par beta/lambda/<=/>=.

export interface DonneesFiche {
  reference: string;
  numero: number;
  statut: string;
  enregistreLe: string | null;
  referenceDossierExterne: string | null;
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  categorie: string;
  baremeVersion: string;
  carburant: string | null;
  puissanceFiscale: number | null;
  dateMiseCirculation: string;
  dateSinistre: string;
  valeurNeuve: number;
  kilometrageTotal: number | null;
  entretien: string | null;
  vvadeSansCorrectif: number | null;
  correctifBetaPct: number | null;
  correctifBetaMontant: number | null;
  correctifLambdaPct: number | null;
  correctifLambdaMontant: number | null;
  correctifCommercialPct: number | null;
  valeurCalculee: number;
  valeurDefinitive: number | null;
  ecartDh: number | null;
  ecartPct: number | null;
  tauxTvaApplique: number | null;
  createurNom: string | null;
  validateurNom: string | null;
  validateurFonction: string | null;
  valideLe: string | null;
}

type RGB = [number, number, number];
const ENCRE: RGB = [27, 36, 48];
const ARDOISE: RGB = [61, 90, 115];
const SIGNAL: RGB = [15, 110, 86];
const SIGNAL_BG: RGB = [225, 245, 238];
const LIGNE: RGB = [216, 213, 204];
const CANEVAS: RGB = [246, 245, 241];
const ROUGE: RGB = [211, 47, 47];

const W = 210;
const H = 297;
const M = 15;
const CW = W - 2 * M;
const ROW = 7.2;
export const LIMITE_BAS = H - 16;

function nombre(n: number, decimales?: number): string {
  const d = decimales ?? (Number.isInteger(n) ? 0 : 2);
  const [entier, dec] = Math.abs(n).toFixed(d).split(".");
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + groupe + (dec ? "," + dec : "");
}

function pct(fraction: number, decimales = 1): string {
  const v = fraction * 100;
  return (v > 0 ? "+" : "") + nombre(v, decimales) + " %";
}

function dateFr(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function ajuster(doc: jsPDF, texte: string, largeur: number): string {
  doc.setFont("helvetica", "bold");
  for (let fs = 9; fs >= 6.5; fs -= 0.5) {
    doc.setFontSize(fs);
    if (doc.getTextWidth(texte) <= largeur) return texte;
  }
  let t = texte;
  while (t.length > 1 && doc.getTextWidth(t + "…") > largeur) t = t.slice(0, -1);
  return t + "…";
}

function ligne(doc: jsPDF, label: string, valeur: string, x: number, y: number, w: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...ARDOISE);
  doc.text(label, x, y);
  const dispo = w - doc.getTextWidth(label) - 3;
  const txt = ajuster(doc, valeur, dispo);
  doc.setTextColor(...ENCRE);
  doc.text(txt, x + w, y, { align: "right" });
  doc.setDrawColor(...LIGNE);
  doc.setLineWidth(0.2);
  doc.line(x, y + 1.9, x + w, y + 1.9);
  return y + ROW;
}

function section(doc: jsPDF, titre: string, x: number, y: number): number {
  doc.setDrawColor(...SIGNAL);
  doc.setLineWidth(0.6);
  doc.line(x, y + 1, x + 4, y + 1);
  doc.setTextColor(...SIGNAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(titre.toUpperCase(), x + 6, y + 2.2);
  return y + 6.5;
}

function ou(v: string | null | undefined, defaut = "—"): string {
  return v && v.trim() ? v.trim() : defaut;
}

export function construireFiche(
  d: DonneesFiche,
  qrDataUrl: string,
  logoPng: string | null = null
): { doc: jsPDF; bas: number } {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const estValide = d.statut === "valide";
  const taux = d.tauxTvaApplique;

  // ---- En-tête clair : wordmark Sinistria + badge "Vv", filet signal ----
  // Le wordmark (encre sur transparent) est fourni rasterisé en PNG par
  // l'appelant (voir lib/logo-pdf.ts) ; sans lui, un repli dessiné à la
  // main reproduit le même motif.
  const logoH = 15;
  const logoW = logoH * LOGO_RATIO;
  let pillX: number;
  if (logoPng) {
    doc.addImage(logoPng, "PNG", M, 6, logoW, logoH);
    pillX = M + logoW * LOGO_TEXTE_FIN + LOGO_ECART_BADGE_PDF * logoH;
  } else {
    doc.setFillColor(...ENCRE);
    doc.roundedRect(M, 6.8, 13, 13, 3, 3, "F");
    doc.setTextColor(247, 246, 241);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("S", M + 6.5, 16.2, { align: "center" });
    doc.setTextColor(...ENCRE);
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.text("Sinistria", M + 16, 16.2);
    pillX = M + 16 + doc.getTextWidth("Sinistria") + 2;
  }
  doc.setFillColor(...SIGNAL_BG);
  doc.roundedRect(pillX, 11, 9, 6.4, 1.2, 1.2, "F");
  doc.setTextColor(...SIGNAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Vv", pillX + 4.5, 15.6, { align: "center" });
  doc.setTextColor(...ARDOISE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    estValide ? "Fiche de valeur vénale — Définitive" : "Fiche de valeur vénale — Aperçu de calcul",
    M,
    25.2
  );
  doc.setFillColor(...SIGNAL);
  doc.rect(0, 28, W, 1.6, "F");

  const bx = W - M - 46;
  doc.setDrawColor(...(estValide ? SIGNAL : ARDOISE));
  doc.setLineWidth(0.5);
  doc.roundedRect(bx, 7, 46, 14, 1.5, 1.5, "S");
  doc.setTextColor(...(estValide ? SIGNAL : ARDOISE));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(estValide ? "DOCUMENT VALIDÉ" : "DOCUMENT DE CALCUL", bx + 23, 11.6, { align: "center" });
  doc.setTextColor(...ENCRE);
  doc.setFont("courier", "bold");
  doc.setFontSize(10.5);
  doc.text(d.reference, bx + 23, 17.4, { align: "center" });

  // ---- Ligne dossier ----
  let y = 38;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...ARDOISE);
  doc.text("DOSSIER", M, y);
  doc.setFont("courier", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...ENCRE);
  doc.text(`N° ${d.numero}`, M + 18, y + 0.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...ARDOISE);
  doc.text(`enregistré le ${dateFr(d.enregistreLe)}`, W - M, y + 0.4, { align: "right" });

  // ---- Identification du véhicule ----
  const colW = (CW - 8) / 2;
  const xL = M;
  const xR = M + colW + 8;
  y = section(doc, "Identification du véhicule", M, 45);
  ligne(doc, "Immatriculation", ou(d.immatriculation), xL, y, colW);
  y = ligne(doc, "Marque", ou(d.marque), xR, y, colW);
  ligne(doc, "Modèle", ou(d.modele), xL, y, colW);
  y = ligne(doc, "Carburant", d.carburant ? d.carburant[0].toUpperCase() + d.carburant.slice(1) : "—", xR, y, colW);
  ligne(doc, "Puissance fiscale", d.puissanceFiscale != null ? `${nombre(d.puissanceFiscale)} CV` : "—", xL, y, colW);
  y = ligne(doc, "Réf. dossier externe", ou(d.referenceDossierExterne), xR, y, colW);
  y = ligne(doc, "Catégorie du barème", libelleCategorie(d.categorie, d.baremeVersion), M, y, CW);

  // ---- Données du dossier | Éléments de calcul ----
  y += 5;
  const y0 = y;
  let yL = section(doc, "Données du dossier", xL, y0);
  yL = ligne(doc, "Date de mise en circulation", dateFr(d.dateMiseCirculation), xL, yL, colW);
  yL = ligne(doc, "Date du sinistre", dateFr(d.dateSinistre), xL, yL, colW);
  yL = ligne(doc, "Valeur à neuf (VN, TTC)", `${nombre(d.valeurNeuve)} DH`, xL, yL, colW);
  yL = ligne(
    doc,
    "Kilométrage total",
    d.kilometrageTotal != null ? `${nombre(d.kilometrageTotal)} km` : "Non renseigné",
    xL,
    yL,
    colW
  );
  yL = ligne(
    doc,
    "Historique d'entretien",
    d.entretien ? (LABELS_ENTRETIEN_FICHE[d.entretien] ?? d.entretien) : "Non renseigné",
    xL,
    yL,
    colW
  );

  let yR = section(doc, "Éléments de calcul", xR, y0);
  yR = ligne(doc, "Barème appliqué", libelleBareme(d.baremeVersion), xR, yR, colW);
  const mois = moisEntre(new Date(d.dateMiseCirculation), new Date(d.dateSinistre));
  yR = ligne(doc, "Âge exact", `${nombre(mois / 12, 2)} ans (${mois} mois)`, xR, yR, colW);
  if (d.vvadeSansCorrectif != null && d.valeurNeuve > 0) {
    yR = ligne(doc, "Facteur résiduel", `${nombre((d.vvadeSansCorrectif / d.valeurNeuve) * 100, 2)} %`, xR, yR, colW);
    yR = ligne(doc, "VVADE sans correctif", `${nombre(d.vvadeSansCorrectif)} DH`, xR, yR, colW);
  }
  if (d.correctifBetaPct != null && d.correctifBetaMontant != null) {
    yR = ligne(doc, "Correctif entretien (beta)", `${pct(d.correctifBetaPct)} (${nombre(d.correctifBetaMontant)} DH)`, xR, yR, colW);
  }
  if (d.kilometrageTotal == null) {
    yR = ligne(doc, "Correctif km (lambda)", "Non appliqué (km non renseigné)", xR, yR, colW);
  } else if (d.correctifLambdaPct != null && d.correctifLambdaMontant != null) {
    yR = ligne(doc, "Correctif km (lambda)", `${pct(d.correctifLambdaPct)} (${nombre(d.correctifLambdaMontant)} DH)`, xR, yR, colW);
  }
  const commPct = d.correctifCommercialPct ?? 0;
  const commMontant =
    commPct !== 0 && d.vvadeSansCorrectif != null
      ? Math.round(d.vvadeSansCorrectif * commPct) / 100
      : null;
  if (commMontant != null) {
    yR = ligne(doc, "Correctif commercial", `${pct(commPct / 100)} (${nombre(commMontant)} DH)`, xR, yR, colW);
  }

  // ---- Bloc valeur retenue (TTC proéminent, HT en complément) ----
  y = Math.max(yL, yR) + 3;
  const vvH = 38;
  doc.setFillColor(...SIGNAL_BG);
  doc.roundedRect(M, y, CW, vvH, 2, 2, "F");
  doc.setDrawColor(...SIGNAL);
  doc.setLineWidth(0.8);
  doc.roundedRect(M, y, CW, vvH, 2, 2, "S");

  const retenue = estValide && d.valeurDefinitive != null ? d.valeurDefinitive : d.valeurCalculee;
  doc.setTextColor(...ARDOISE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    estValide ? "VALEUR DÉFINITIVE RETENUE" : "VALEUR VÉNALE CALCULÉE",
    W / 2,
    y + 6.5,
    { align: "center" }
  );
  doc.setTextColor(...SIGNAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.text(`${nombre(retenue)} DH TTC`, W / 2, y + 17.5, { align: "center" });
  if (taux != null) {
    doc.setTextColor(...ARDOISE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`(${nombre(retenue / (1 + taux), 2)} DH HT — TVA ${nombre(taux * 100, 0)} %)`, W / 2, y + 23, {
      align: "center",
    });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...ARDOISE);
  if (estValide) {
    const ecart = d.ecartDh ?? (d.valeurDefinitive != null ? d.valeurDefinitive - d.valeurCalculee : 0);
    const txt = ecart
      ? `valeur calculée : ${nombre(d.valeurCalculee)} DH (écart ${ecart > 0 ? "+" : ""}${nombre(ecart)} DH${
          d.ecartPct != null ? ` / ${d.ecartPct > 0 ? "+" : ""}${nombre(d.ecartPct, 1)} %` : ""
        })`
      : "identique à la valeur calculée par le barème";
    doc.text(txt, W / 2, y + 28.2, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ENCRE);
    doc.setFontSize(7.5);
    doc.text(
      `Validé par : ${ou(d.validateurNom)}${d.validateurFonction ? "  -  " + d.validateurFonction : ""}`,
      M + 5,
      y + vvH - 3.2
    );
    if (d.valideLe) doc.text(`le ${dateFr(d.valideLe)}`, W - M - 5, y + vvH - 3.2, { align: "right" });
  }
  y += vvH + 6;

  // ---- Mode de calcul (composition réelle, additive) ----
  const termes: string[] = [];
  if (d.vvadeSansCorrectif != null) {
    termes.push(
      `${nombre(d.valeurNeuve)} x ${nombre((d.vvadeSansCorrectif / d.valeurNeuve) * 100, 4)} % = ${nombre(d.vvadeSansCorrectif)} DH (dégressif)`
    );
  }
  if (d.correctifBetaMontant != null) termes.push(`beta ${d.correctifBetaMontant >= 0 ? "+" : ""}${nombre(d.correctifBetaMontant)} DH`);
  if (d.kilometrageTotal != null && d.correctifLambdaMontant != null)
    termes.push(`lambda ${d.correctifLambdaMontant >= 0 ? "+" : ""}${nombre(d.correctifLambdaMontant)} DH`);
  if (commMontant != null) termes.push(`commercial ${commMontant >= 0 ? "+" : ""}${nombre(commMontant)} DH`);
  const somme =
    d.vvadeSansCorrectif != null && d.correctifBetaMontant != null && d.correctifLambdaMontant != null
      ? d.vvadeSansCorrectif + d.correctifBetaMontant + d.correctifLambdaMontant + (commMontant ?? 0)
      : null;
  const plafonne = somme != null && somme > d.valeurNeuve + 0.005;
  const formule =
    "VVADE = VN x facteur résiduel (dégressif) + correctifs entretien / km / commercial, plafonnée à VN.\n" +
    `VVADE = ${termes.length ? termes.join("  ") : "(détails de calcul non disponibles)"}  =  ${nombre(d.valeurCalculee)} DH TTC${plafonne ? "  [plafonnée à VN]" : ""}`;

  y = section(doc, "Mode de calcul", M, y);
  doc.setFont("courier", "normal");
  let fs = 7.6;
  doc.setFontSize(fs);
  let lignes = doc.splitTextToSize(formule, CW - 10) as string[];
  while (lignes.length > 6 && fs > 6) {
    fs -= 0.4;
    doc.setFontSize(fs);
    lignes = doc.splitTextToSize(formule, CW - 10) as string[];
  }
  const lh = fs * 0.5;
  const boxH = lignes.length * lh + 7;
  doc.setFillColor(...CANEVAS);
  doc.roundedRect(M, y, CW, boxH, 1.5, 1.5, "F");
  doc.setTextColor(...ENCRE);
  lignes.forEach((l, i) => doc.text(l, M + 5, y + 5 + i * lh));
  y += boxH + 12;

  // ---- Signatures + QR ----
  // "L'expert" est réservé au Directeur (c'est lui l'expert, par
  // définition) : son nom n'y figure QUE s'il est bien le validateur du
  // dossier. Tout autre validateur (Responsable, Adjoint directeur...)
  // signe comme "Le responsable" à la place — jamais les deux emplacements
  // en même temps, et jamais le créateur (qui n'a rien validé).
  const sigW = 62;
  const validateurEstDirecteur = estValide && d.validateurFonction === "Directeur";
  const blocs: { x: number; titre: string; nom: string }[] = [
    { x: M, titre: "L'expert", nom: validateurEstDirecteur ? ou(d.validateurNom, "") : "" },
    {
      x: M + sigW + 8,
      titre: "Le responsable",
      nom: estValide && !validateurEstDirecteur ? ou(d.validateurNom, "") : "",
    },
  ];
  blocs.forEach((b) => {
    doc.setTextColor(...ARDOISE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(b.titre, b.x + sigW / 2, y, { align: "center" });
    doc.setDrawColor(...ENCRE);
    doc.setLineWidth(0.4);
    doc.line(b.x, y + 15, b.x + sigW, y + 15);
    doc.setFontSize(6.5);
    doc.text("SIGNATURE & CACHET", b.x + sigW / 2, y + 18.6, { align: "center" });
    if (b.nom) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...ENCRE);
      doc.text(ajuster(doc, b.nom, sigW - 4), b.x + sigW / 2, y + 23.4, { align: "center" });
    }
  });
  const qr = 27;
  const qx = W - M - qr;
  doc.addImage(qrDataUrl, "PNG", qx, y - 4, qr, qr);
  doc.setTextColor(...ARDOISE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Vérification en ligne", qx + qr / 2, y - 4 + qr + 3.2, { align: "center" });
  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  doc.text(d.reference, qx + qr / 2, y - 4 + qr + 6.4, { align: "center" });
  const bas = y - 4 + qr + 6.4;

  // ---- Pied de page ----
  doc.setDrawColor(...LIGNE);
  doc.setLineWidth(0.3);
  doc.line(M, H - 12, W - M, H - 12);
  doc.setTextColor(...ARDOISE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    estValide
      ? "Sinistria Vv — barème FMSAR, méthode dégressive"
      : "Aperçu de calcul — ne pas utiliser comme pièce officielle",
    M,
    H - 8
  );
  doc.text(`généré le ${dateFr(new Date().toISOString())}`, W - M, H - 8, { align: "right" });

  // ---- Filigrane brouillon (dernier, par-dessus) ----
  if (!estValide) {
    doc.setTextColor(...ROUGE);
    doc.setFont("helvetica", "bold");
    try {
      doc.setGState(new GState({ opacity: 0.16 }));
    } catch {
      // GState indisponible : filigrane en pleine opacité plutôt que de
      // bloquer la génération.
    }
    doc.setFontSize(46);
    doc.text("BROUILLON", W / 2, 150, { align: "center", angle: 30 });
    doc.setFontSize(18);
    doc.text("NON OFFICIEL", W / 2, 168, { align: "center", angle: 30 });
    try {
      doc.setGState(new GState({ opacity: 1 }));
    } catch {
      // idem
    }
  }

  return { doc, bas };
}

