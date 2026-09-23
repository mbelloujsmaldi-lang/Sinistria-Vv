"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lien de nav du shell (Sprint 26, Phase B) : pastille pleine `signal` sur
// le lien actif, gris clair (`text-line`, ≥4.5:1 sur fond ink) sinon.
//
// Registre de TOUS les hrefs de nav de premier niveau (Sprint 27, correctif
// bug réel constaté par l'utilisateur : "Nouveau calcul" ET "Registre"
// actifs en même temps sur /vv/nouveau). Un simple `pathname.startsWith(href)`
// par lien, évalué indépendamment, ne peut pas savoir qu'un href plus
// spécifique existe ailleurs. Règle : parmi tous les hrefs enregistrés qui
// correspondent au chemin courant, seul le PLUS LONG (le plus spécifique)
// est actif — ex. /vv/nouveau correspond à "/vv" et à "/vv/nouveau", mais
// seul "/vv/nouveau" (plus long) gagne.
const TOUS_LES_HREFS = [
  "/vv/nouveau",
  "/vv",
  "/validations",
  "/referentiel",
  "/audit",
  "/comptes",
  "/annonces",
  "/aide-support",
];

function correspond(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hrefLePlusSpecifique(pathname: string): string | null {
  let meilleur: string | null = null;
  for (const href of TOUS_LES_HREFS) {
    if (correspond(pathname, href) && (!meilleur || href.length > meilleur.length)) {
      meilleur = href;
    }
  }
  return meilleur;
}

export default function NavLink({
  href,
  children,
  icon,
  compteur,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  compteur?: number;
}) {
  const pathname = usePathname();
  const actif = hrefLePlusSpecifique(pathname) === href;

  return (
    <Link
      href={href}
      className={
        actif
          ? "flex items-center gap-1.5 rounded-full bg-signal px-3 py-1 text-sm font-medium text-canvas"
          : "flex items-center gap-1.5 text-sm text-line no-underline hover:text-canvas"
      }
    >
      {icon}
      {children}
      {!!compteur && (
        <span
          className={
            actif
              ? "rounded-full bg-canvas/20 px-1.5 text-[11px] font-semibold text-canvas"
              : "rounded-full bg-error px-1.5 text-[11px] font-semibold text-canvas"
          }
        >
          {compteur}
        </span>
      )}
    </Link>
  );
}
