"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  depuisLignes,
  nettoyer,
  SELECT_REFERENTIEL,
  trouverMarque,
  trouverModele,
  type MarqueRef,
} from "@/lib/referentiel-vehicules";

const CHAMP =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal disabled:bg-canvas disabled:text-slate";

const BOUTON_AJOUT =
  "mt-1 rounded border border-signal px-2 py-1 text-xs font-medium text-signal hover:bg-signal-bg disabled:opacity-60";

interface Props {
  marque: string;
  modele: string;
  onMarque: (v: string) => void;
  onModele: (v: string) => void;
  // Appelé quand le couple marque + modèle correspond à un modèle du
  // référentiel : vn = prix de référence (ou null s'il n'en a pas). Le
  // formulaire décide seul s'il peut l'utiliser (jamais d'écrasement).
  onModeleReconnu: (vn: number | null, libelle: string) => void;
}

// Sélection marque -> modèle avec recherche (autocomplétion) et ajout à la
// volée d'une marque ou d'un modèle absent du référentiel (Sprint 14).
// Tout profil actif peut ajouter ; renommer/supprimer/prix VN restent
// réservés aux responsables et au-dessus (RLS, migration 0013).
export default function VehiculePicker({ marque, modele, onMarque, onModele, onModeleReconnu }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [marques, setMarques] = useState<MarqueRef[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicule_marques")
      .select(SELECT_REFERENTIEL)
      .order("nom");
    if (error) {
      setErreur("Référentiel indisponible : la marque et le modèle seront enregistrés tels que saisis.");
    } else {
      setMarques(depuisLignes(data as Parameters<typeof depuisLignes>[0]));
      setErreur(null);
    }
    setCharge(true);
  }, [supabase]);

  useEffect(() => {
    charger();
  }, [charger]);

  const marqueRef = useMemo(() => trouverMarque(marques, marque), [marques, marque]);
  const modeleRef = useMemo(() => trouverModele(marqueRef, modele), [marqueRef, modele]);

  // Suggestion de VN : signalée dès que le couple est reconnu ; le formulaire
  // applique la règle « seulement si le champ est vide ».
  const idModele = modeleRef?.id;
  const vnModele = modeleRef?.vn_reference ?? null;
  useEffect(() => {
    if (marqueRef && modeleRef) {
      onModeleReconnu(vnModele, `${marqueRef.nom} ${modeleRef.nom}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idModele, vnModele]);

  function changerMarque(v: string) {
    setInfo(null);
    onMarque(v);
    const nouvelle = trouverMarque(marques, v);
    // Un modèle qui n'appartient pas à la nouvelle marque est retiré.
    if (modele && !trouverModele(nouvelle, modele)) onModele("");
  }

  async function ajouterMarque() {
    const nom = nettoyer(marque);
    if (!nom) return;
    setOccupe(true);
    setErreur(null);
    const { error } = await supabase.from("vehicule_marques").insert({ nom });
    setOccupe(false);
    if (error && error.code !== "23505") {
      setErreur(`Ajout impossible : ${error.message}`);
      return;
    }
    await charger();
    onMarque(nom);
    setInfo(error ? "Cette marque existe déjà." : `Marque ajoutée : ${nom}`);
  }

  async function ajouterModele() {
    const nom = nettoyer(modele);
    if (!nom || !marqueRef) return;
    setOccupe(true);
    setErreur(null);
    const { error } = await supabase
      .from("vehicule_modeles")
      .insert({ marque_id: marqueRef.id, nom });
    setOccupe(false);
    if (error && error.code !== "23505") {
      setErreur(`Ajout impossible : ${error.message}`);
      return;
    }
    await charger();
    onModele(nom);
    setInfo(error ? "Ce modèle existe déjà." : `Modèle ajouté : ${nom} (${marqueRef.nom})`);
  }

  const marqueSaisie = nettoyer(marque);
  const modeleSaisi = nettoyer(modele);
  const modelesListe = marqueRef?.modeles ?? [];

  return (
    <>
      <div>
        <label htmlFor="vv-marque" className="mb-1 block text-sm text-ink">
          Marque
        </label>
        <input
          id="vv-marque"
          list="vv-marques-liste"
          autoComplete="off"
          placeholder="Rechercher ou saisir une marque"
          value={marque}
          onChange={(e) => changerMarque(e.target.value)}
          className={CHAMP}
        />
        <datalist id="vv-marques-liste">
          {marques.map((m) => (
            <option key={m.id} value={m.nom} />
          ))}
        </datalist>
        {marqueSaisie && !marqueRef && charge && !erreur && (
          <button type="button" onClick={ajouterMarque} disabled={occupe} className={BOUTON_AJOUT}>
            Ajouter la marque « {marqueSaisie} »
          </button>
        )}
      </div>

      <div>
        <label htmlFor="vv-modele" className="mb-1 block text-sm text-ink">
          Modèle
        </label>
        <input
          id="vv-modele"
          list="vv-modeles-liste"
          autoComplete="off"
          placeholder={marqueRef ? "Rechercher ou saisir un modèle" : "Choisissez d'abord une marque"}
          value={modele}
          disabled={!marqueRef && !erreur}
          onChange={(e) => {
            setInfo(null);
            onModele(e.target.value);
          }}
          className={CHAMP}
        />
        <datalist id="vv-modeles-liste">
          {modelesListe.map((m) => (
            <option key={m.id} value={m.nom} />
          ))}
        </datalist>
        {marqueRef && modeleSaisi && !modeleRef && !erreur && (
          <button type="button" onClick={ajouterModele} disabled={occupe} className={BOUTON_AJOUT}>
            Ajouter le modèle « {modeleSaisi} » à {marqueRef.nom}
          </button>
        )}
      </div>

      {(info || erreur) && (
        <p
          role={erreur ? "alert" : "status"}
          className={`text-xs sm:col-span-2 ${erreur ? "text-red-700" : "text-slate"}`}
        >
          {erreur ?? info}
        </p>
      )}
      {!erreur && charge && ((marqueSaisie && !marqueRef) || (marqueRef && modeleSaisi && !modeleRef)) && (
        <p className="text-xs text-slate sm:col-span-2">
          Hors référentiel : la saisie sera enregistrée telle quelle sur ce calcul, ou ajoutez-la au
          référentiel avec le bouton ci-dessus.
        </p>
      )}
    </>
  );
}
