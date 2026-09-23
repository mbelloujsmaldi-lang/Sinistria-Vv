// Icônes de navigation (Sprint 27) — traits fins (stroke, pas de
// bibliothèque externe ajoutée, cohérent avec le reste du projet qui n'a
// aucune dépendance d'icônes). currentColor : héritent automatiquement de
// la couleur du lien (canvas actif / line inactif), pas de couleur figée.
type Props = { className?: string };
const BASE = "h-4 w-4 shrink-0";

export function IconNouveauCalcul({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6 2.5h6l3 3v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M12 2.5v3h3" strokeLinejoin="round" />
      <path d="M7.5 12h5M10 9.5v5" strokeLinecap="round" />
    </svg>
  );
}

export function IconRegistre({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="3" y="3.5" width="14" height="13" rx="1.2" />
      <path d="M3 8h14M7 3.5V16.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconValidations({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.2l2 2 4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAnalyse({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 16.5V11M10 16.5V6M16 16.5v-8" strokeLinecap="round" />
      <path d="M3 16.5h14" strokeLinecap="round" />
    </svg>
  );
}

export function IconReferentiel({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path
        d="M11 3H4.5A1.5 1.5 0 0 0 3 4.5V11l7.6 7.6a1.5 1.5 0 0 0 2.12 0l4.88-4.88a1.5 1.5 0 0 0 0-2.12L11 3Z"
        strokeLinejoin="round"
      />
      <circle cx="7.3" cy="7.3" r="1.1" />
    </svg>
  );
}

export function IconAudit({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.2l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconComptes({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="7.3" cy="6.5" r="2.5" />
      <path d="M2.5 17c.5-3 2.3-4.5 4.8-4.5s4.3 1.5 4.8 4.5" strokeLinecap="round" />
      <circle cx="14" cy="7.5" r="2" />
      <path d="M13 12.8c1.8.3 3.1 1.6 3.5 4.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconAnnonces({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M3 8.5v3a1 1 0 0 0 1 1h1.3l7.7 3V4.5l-7.7 3H4a1 1 0 0 0-1 1Z" strokeLinejoin="round" />
      <path d="M8.5 12.5v3a1.3 1.3 0 0 1-2.6 0v-2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAide({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7.8 7.8a2.2 2.2 0 1 1 3.3 1.9c-.7.4-1.1.9-1.1 1.8" strokeLinecap="round" />
      <circle cx="10" cy="14" r=".15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconProfil({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M3.5 17c.7-3.8 2.9-5.8 6.5-5.8s5.8 2 6.5 5.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronBas({ className = "h-3 w-3 shrink-0" }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5.5 8l4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDeconnexion({ className = BASE }: Props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M8 3H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6.5l4 3.5-4 3.5M8.5 10H17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
