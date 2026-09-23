// Registre de TOUS les hrefs de nav de premier niveau (Sprint 27, correctif
// bug réel : "Nouveau calcul" ET "Registre" actifs en même temps sur
// /vv/nouveau). Parmi tous les hrefs enregistrés qui correspondent au
// chemin courant, seul le PLUS LONG (le plus spécifique) est actif.
// Partagé entre nav-link.tsx et analyse-menu.tsx (Sprint 28) pour éviter
// deux registres divergents.
export const TOUS_LES_HREFS = [
  "/dashboard",
  "/vv/nouveau",
  "/vv",
  "/validations",
  "/referentiel",
  "/audit",
  "/comptes",
  "/annonces",
  "/echange",
  "/aide-support",
];

function correspond(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function hrefLePlusSpecifique(pathname: string): string | null {
  let meilleur: string | null = null;
  for (const href of TOUS_LES_HREFS) {
    if (correspond(pathname, href) && (!meilleur || href.length > meilleur.length)) {
      meilleur = href;
    }
  }
  return meilleur;
}
