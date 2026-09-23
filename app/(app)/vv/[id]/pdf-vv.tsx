"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { construireFiche, LIMITE_BAS, type DonneesFiche } from "@/lib/fiche-pdf";
import { rasteriserLogo } from "@/lib/logo-pdf";
import { IconTelecharger, IconImprimer } from "../../nav-icons";

// "Imprimer" (Sprint 27) — réutilise EXACTEMENT le même document que
// "Télécharger le PDF" (construireFiche), ouvert dans un nouvel onglet
// puis imprimé directement : évite de maintenir une seconde mise en page
// "impression" séparée de la fiche PDF déjà soignée.
async function construireDocument(donnees: DonneesFiche) {
  const url = `${window.location.origin}/verifier/${donnees.reference}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 });
  const logoPng = await rasteriserLogo();
  const { doc, bas } = construireFiche(donnees, qrDataUrl, logoPng);
  if (bas > LIMITE_BAS) {
    throw new Error("La fiche dépasse une page — génération annulée.");
  }
  return doc;
}

export default function PdfVV({ donnees }: { donnees: DonneesFiche }) {
  const [enCours, setEnCours] = useState<"telecharger" | "imprimer" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const estValide = donnees.statut === "valide";

  async function telecharger() {
    setErreur(null);
    setEnCours("telecharger");
    try {
      const doc = await construireDocument(donnees);
      doc.save(
        estValide ? `fiche_vv_${donnees.reference}.pdf` : `apercu_vv_${donnees.reference}.pdf`
      );
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la génération du PDF.");
    } finally {
      setEnCours(null);
    }
  }

  async function imprimer() {
    setErreur(null);
    setEnCours("imprimer");
    try {
      const doc = await construireDocument(donnees);
      const blobUrl = doc.output("bloburl");
      const fenetre = window.open(blobUrl as unknown as string, "_blank");
      // Certains navigateurs bloquent l'impression tant que le PDF n'a pas
      // fini de se charger dans le nouvel onglet — laisser l'utilisateur
      // lancer l'impression depuis la visionneuse PDF native plutôt que
      // d'appeler .print() sur une fenêtre pas encore prête (peu fiable
      // d'un navigateur à l'autre pour un contenu PDF intégré).
      if (!fenetre) {
        throw new Error("Le navigateur a bloqué l'ouverture de l'aperçu — autorisez les popups.");
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la génération du PDF.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div>
      {erreur && <p className="mb-2 text-sm text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          onClick={telecharger}
          disabled={enCours !== null}
          className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
        >
          <IconTelecharger className="h-4 w-4 shrink-0" />
          {enCours === "telecharger"
            ? "Génération…"
            : estValide
              ? "Télécharger le PDF définitif"
              : "Télécharger l'aperçu PDF"}
        </button>
        <button
          onClick={imprimer}
          disabled={enCours !== null}
          className="inline-flex items-center gap-2 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
        >
          <IconImprimer className="h-4 w-4 shrink-0" />
          {enCours === "imprimer" ? "Préparation…" : "Imprimer"}
        </button>
      </div>
    </div>
  );
}
