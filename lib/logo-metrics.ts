// Géométrie du wordmark public/logo/sinistria-wordmark.svg (viewBox 540x160),
// partagée par le composant Logo et la fiche PDF pour placer le badge "Vv".
// LOGO_TEXTE_FIN = fin de l'encre du mot "Sinistria" (420,25 sur 540), mesurée
// par balayage de pixels sur le rendu réel (Georgia, faute de Source Serif 4
// dans un <img> SVG). À remesurer si le SVG ou sa police change.
export const LOGO_VB_LARGEUR = 540;
export const LOGO_VB_HAUTEUR = 160;
export const LOGO_RATIO = LOGO_VB_LARGEUR / LOGO_VB_HAUTEUR;
export const LOGO_TEXTE_FIN = 420.25 / LOGO_VB_LARGEUR;

// Écart entre la fin du mot et le badge, en fraction de la hauteur du logo :
// identique à celui validé au Sprint 10 (0,3125 · h).
export const LOGO_ECART_BADGE = 0.3125;

// Même chose pour la fiche PDF (3 mm pour un logo de 15 mm, comme au Sprint 10).
export const LOGO_ECART_BADGE_PDF = 0.2;

// Décalage horizontal du badge par rapport au bord droit du SVG (× hauteur) :
// négatif, car le SVG garde une marge vide à droite du mot.
export const LOGO_MARGE_BADGE = LOGO_ECART_BADGE - (1 - LOGO_TEXTE_FIN) * LOGO_RATIO;
