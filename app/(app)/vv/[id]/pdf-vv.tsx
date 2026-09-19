"use client";

import { useState } from "react";
import { jsPDF, GState } from "jspdf";
import QRCode from "qrcode";

interface Props {
  reference: string;
  statut: string;
  categorie: string;
  baremeVersion: string;
  referenceDossierExterne: string | null;
  marque: string | null;
  immatriculation: string | null;
  valeurNeuve: number;
  valeurCalculee: number;
  valeurDefinitive: number | null;
  tauxTvaApplique: number | null;
  validateurNom: string | null;
  validateurFonction: string | null;
  valideLe: string | null;
}

// Masquage à l'affichage uniquement (jamais en base) — même règle que la
// page /verifier et que l'ancien système (Code.gs:307-308).
function masquerImmatriculation(immat: string | null): string {
  if (!immat) return "—";
  return immat.length > 3 ? immat.slice(0, 2) + "••••" + immat.slice(-2) : immat;
}

const ENCRE: [number, number, number] = [27, 36, 48];
const ARDOISE: [number, number, number] = [61, 90, 115];
const SIGNAL: [number, number, number] = [15, 110, 86];
const LIGNE: [number, number, number] = [216, 213, 204];
const ROUGE: [number, number, number] = [211, 47, 47];

export default function PdfVV(props: Props) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const estValide = props.statut === "valide";

  async function genererPdf() {
    setErreur(null);
    setEnCours(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210;
      const M = 20;

      const url = `${window.location.origin}/verifier/${props.reference}`;
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 });

      let y = M;

      doc.setTextColor(...ENCRE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Fiche de valeur vénale", M, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...ARDOISE);
      doc.text(`Référence : ${props.reference}`, M, y);
      y += 6;
      if (props.referenceDossierExterne) {
        doc.text(`Réf. dossier externe : ${props.referenceDossierExterne}`, M, y);
        y += 6;
      }
      doc.text(`Catégorie : ${props.categorie} — Barème ${props.baremeVersion}`, M, y);
      y += 6;
      if (props.marque) {
        doc.text(`Marque : ${props.marque}`, M, y);
        y += 6;
      }
      if (props.immatriculation) {
        doc.text(`Immatriculation : ${masquerImmatriculation(props.immatriculation)}`, M, y);
        y += 6;
      }

      y += 4;
      doc.setDrawColor(...LIGNE);
      doc.line(M, y, W - M, y);
      y += 10;

      doc.setTextColor(...ARDOISE);
      doc.setFontSize(10);
      doc.text(`Valeur à neuf : ${Number(props.valeurNeuve).toLocaleString("fr-MA")} DH`, M, y);
      y += 10;

      const montant = props.valeurDefinitive ?? props.valeurCalculee;
      const taux = props.tauxTvaApplique;
      const ht = taux !== null ? montant / (1 + taux) : null;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...SIGNAL);
      doc.text(`${Number(montant).toLocaleString("fr-MA")} DH TTC`, M, y);
      y += 7;
      if (ht !== null) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...ARDOISE);
        doc.text(`(${ht.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} DH HT)`, M, y);
        y += 8;
      }

      if (estValide) {
        y += 4;
        doc.setTextColor(...ARDOISE);
        doc.setFontSize(10);
        doc.text(
          `Validé par : ${props.validateurNom ?? "—"}${
            props.validateurFonction ? " · " + props.validateurFonction : ""
          }`,
          M,
          y
        );
        y += 6;
        if (props.valideLe) {
          doc.text(
            `Date de validation : ${new Date(props.valideLe).toLocaleDateString("fr-MA")}`,
            M,
            y
          );
        }
      }

      const qrSize = 28;
      const qrX = W - M - qrSize;
      const qrY = 297 - M - qrSize;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...ARDOISE);
      doc.text("Vérification en ligne", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });

      if (!estValide) {
        doc.setTextColor(...ROUGE);
        doc.setFont("helvetica", "bold");
        try {
          doc.setGState(new GState({ opacity: 0.16 }));
        } catch {
          // GState indisponible sur ce moteur de rendu — filigrane affiché
          // en pleine opacité plutôt que de bloquer la génération.
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
        doc.setTextColor(...ARDOISE);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Aperçu de calcul — ne pas utiliser comme pièce officielle.", W / 2, 280, {
          align: "center",
        });
      }

      const filename = estValide
        ? `fiche_vv_${props.reference}.pdf`
        : `apercu_vv_${props.reference}.pdf`;
      doc.save(filename);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la génération du PDF.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      {erreur && <p className="mb-2 text-sm text-red-700">{erreur}</p>}
      <button
        onClick={genererPdf}
        disabled={enCours}
        className="rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
      >
        {enCours
          ? "Génération…"
          : estValide
            ? "Télécharger le PDF définitif"
            : "Télécharger l'aperçu PDF"}
      </button>
    </div>
  );
}
