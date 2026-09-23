"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "../_components/logo";
import AnalyseMenu from "./analyse-menu";
import NavLink from "./nav-link";
import NotificationBell from "./notification-bell";
import ProfileMenu from "./profile-menu";
import {
  IconTableauBord,
  IconNouveauCalcul,
  IconRegistre,
  IconValidations,
  IconReferentiel,
  IconAudit,
  IconComptes,
  IconAnnonces,
  IconAide,
  IconEchange,
} from "./nav-icons";

const CLE_STOCKAGE = "sinistria-sidebar-reduite";

// Barre latérale (Sprint 28) — remplace le bandeau horizontal (Sprint
// 24/26/27), jugé encore trop encombrant par l'utilisateur une fois les
// tabulations ajoutées au fil des sprints. Repliable (icônes seules) sur
// desktop, tiroir superposé sur mobile — inspiré du principe d'un exemple
// externe fourni par l'utilisateur (barre latérale d'admin classique),
// sans en reproduire l'apparence visuelle exacte.
//
// L'état replié est une préférence d'affichage PAR APPAREIL (localStorage) :
// pas une donnée à synchroniser entre appareils ni à lire côté serveur —
// lu uniquement après montage pour éviter un mismatch d'hydratation (léger
// flash au premier chargement, accepté : pas de script anti-flash pour une
// préférence aussi mineure).
export default function Sidebar({
  estAdmin,
  peutReferentiel,
  peutAudit,
  peutValiderDossiers,
  nbEnAttente,
  nom,
  roleLabel,
  bureau,
}: {
  estAdmin: boolean;
  peutReferentiel: boolean;
  peutAudit: boolean;
  peutValiderDossiers: boolean;
  nbEnAttente: number;
  nom: string;
  roleLabel: string;
  bureau: string | null;
}) {
  const [reduite, setReduite] = useState(false);
  const [ouverteMobile, setOuverteMobile] = useState(false);

  useEffect(() => {
    try {
      setReduite(localStorage.getItem(CLE_STOCKAGE) === "1");
    } catch {
      /* localStorage indisponible (navigation privée...) : reste étendue */
    }
  }, []);

  function basculerReduite() {
    setReduite((v) => {
      const suivant = !v;
      try {
        localStorage.setItem(CLE_STOCKAGE, suivant ? "1" : "0");
      } catch {
        /* préférence non sauvegardée, sans conséquence */
      }
      return suivant;
    });
  }

  return (
    <>
      {/* Déclencheur mobile — la barre est hors écran par défaut sous md,
          il faut un bouton toujours visible pour l'ouvrir. */}
      <button
        type="button"
        onClick={() => setOuverteMobile(true)}
        aria-label="Ouvrir le menu"
        className="fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md bg-ink text-canvas md:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
        </svg>
      </button>

      {ouverteMobile && (
        <div
          className="fixed inset-0 z-30 bg-ink/60 md:hidden"
          onClick={() => setOuverteMobile(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-ink transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          reduite ? "w-56 md:w-16" : "w-56"
        } ${ouverteMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* En-tête : logo + bascule repli (desktop) / fermeture (mobile).
            En mode réduit (desktop uniquement, 64px), le logo complet et
            le bouton de bascule ne tiennent pas côte à côte — empilés
            verticalement à la place, badge "Vv" au-dessus du bouton. */}
        <div
          className={`flex items-center border-b border-ink-light px-3 py-3 ${
            reduite ? "md:flex-col md:gap-2" : "justify-between"
          }`}
        >
          <Link
            href="/accueil"
            aria-label="Sinistria Vv — accueil"
            onClick={() => setOuverteMobile(false)}
            className={`flex-1 ${reduite ? "md:hidden" : ""}`}
          >
            <Logo variante="sombre" hauteur={32} />
          </Link>
          {reduite && (
            <Link
              href="/accueil"
              aria-label="Sinistria Vv — accueil"
              className="hidden h-7 w-7 items-center justify-center rounded-md bg-signal text-[11px] font-semibold text-canvas md:flex"
            >
              Vv
            </Link>
          )}
          <button
            type="button"
            onClick={basculerReduite}
            aria-label={reduite ? "Déplier le menu" : "Replier le menu"}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-line hover:bg-ink-light hover:text-canvas md:flex"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className={`h-4 w-4 transition-transform ${reduite ? "rotate-180" : ""}`}
            >
              <path d="M12.5 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOuverteMobile(false)}
            aria-label="Fermer le menu"
            className="flex h-7 w-7 items-center justify-center rounded-md text-line hover:text-canvas md:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Navigation — défilante si elle dépasse la hauteur d'écran */}
        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
          onClick={() => setOuverteMobile(false)}
        >
          <NavLink href="/dashboard" icon={<IconTableauBord />} reduit={reduite}>
            Tableau de bord
          </NavLink>
          <NavLink href="/vv/nouveau" icon={<IconNouveauCalcul />} reduit={reduite}>
            Nouveau calcul
          </NavLink>
          <NavLink href="/vv" icon={<IconRegistre />} reduit={reduite}>
            Registre
          </NavLink>
          {peutValiderDossiers && (
            <NavLink href="/validations" icon={<IconValidations />} compteur={nbEnAttente} reduit={reduite}>
              Validations
            </NavLink>
          )}
          <div className={reduite ? "hidden md:block" : ""}>
            <AnalyseMenu reduit={reduite} />
          </div>
          {reduite && (
            <div className="md:hidden">
              <AnalyseMenu reduit={false} />
            </div>
          )}
          {peutReferentiel && (
            <NavLink href="/referentiel" icon={<IconReferentiel />} reduit={reduite}>
              Marques &amp; Modèles
            </NavLink>
          )}
          {peutAudit && (
            <NavLink href="/audit" icon={<IconAudit />} reduit={reduite}>
              Journal d&apos;audit
            </NavLink>
          )}
          {estAdmin && (
            <NavLink href="/comptes" icon={<IconComptes />} reduit={reduite}>
              Comptes
            </NavLink>
          )}
          <NavLink href="/annonces" icon={<IconAnnonces />} reduit={reduite}>
            Annonces
          </NavLink>
          <NavLink href="/echange" icon={<IconEchange />} reduit={reduite}>
            Echange
          </NavLink>
          <NavLink href="/aide-support" icon={<IconAide />} reduit={reduite}>
            Aide &amp; Support
          </NavLink>
        </nav>

        {/* Pied : notifications + profil — hors de la zone défilante pour
            que leurs menus (qui s'ouvrent vers le haut) ne soient jamais
            rognés par overflow-y-auto du <nav> ci-dessus. */}
        <div className={`space-y-1 border-t border-ink-light px-2.5 py-3 ${reduite ? "md:flex md:flex-col md:items-center" : ""}`}>
          <div className={reduite ? "md:flex md:justify-center" : "flex justify-end"}>
            <NotificationBell />
          </div>
          <ProfileMenu nom={nom} roleLabel={roleLabel} bureau={bureau} reduit={reduite} />
        </div>
      </aside>
    </>
  );
}
