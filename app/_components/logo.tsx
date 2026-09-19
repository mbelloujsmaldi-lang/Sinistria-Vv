// Identité Sinistria : wordmark (fichier local public/logo) + badge "Vv".
// Seul point de définition — utilisé par la page de connexion et le
// layout partagé (dashboard, /vv/*).
export default function Logo({ hauteur = 40 }: { hauteur?: number }) {
  return (
    <span className="flex items-center">
      {/* SVG local : next/image n'apporte rien ici (pas d'optimisation SVG). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/sinistria-wordmark.svg"
        alt="Sinistria"
        height={hauteur}
        width={hauteur * 4}
        style={{ height: hauteur, width: "auto" }}
      />
      {/* Le SVG garde une marge vide à droite du mot : le badge la recouvre
          (proportionnel à la hauteur) pour rester collé au texte. */}
      <span
        className="rounded bg-signal-bg px-1.5 py-0.5 text-xs font-medium text-signal"
        style={{ marginLeft: -hauteur * 1.15 }}
      >
        Vv
      </span>
    </span>
  );
}
