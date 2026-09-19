"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { construireFiche, LIMITE_BAS, type DonneesFiche } from "@/lib/fiche-pdf";
import { rasteriserLogo } from "@/lib/logo-pdf";

export default function PdfVV({ donnees }: { donnees: DonneesFiche }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const estValide = donnees.statut === "valide";

  async function genererPdf() {
    setErreur(null);
    setEnCours(true);
    try {
      const url = `${window.location.origin}/verifier/${donnees.reference}`;
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 });
      const logoPng = await rasteriserLogo();
      const { doc, bas } = construireFiche(donnees, qrDataUrl, logoPng);
      if (bas > LIMITE_BAS) {
        throw new Error("La fiche dépasse une page — génération annulée.");
      }
      doc.save(
        estValide ? `fiche_vv_${donnees.reference}.pdf` : `apercu_vv_${donnees.reference}.pdf`
      );
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
