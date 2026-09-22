import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LABELS_ROLE, type UserRole } from "@/lib/roles";
import { chargerTableauDeBord } from "@/lib/analyse";
import { LABELS_STATUT } from "../vv/statut-badge";

const DH = (v: number) => `${Math.round(v).toLocaleString("fr-MA")} DH`;

// Accueil (Sprint 24, Phase C) — absorbe le tableau de bord analytique du
// Sprint 16 (ex-/analyse/dashboard, retirée avec redirection permanente),
// en plus du bloc profil déjà présent ici depuis le Sprint 1. Une seule
// page d'accueil, plus de doublon conceptuel entre les deux "dashboard".
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, role, bureau")
    .eq("id", user.id)
    .single();

  const d = await chargerTableauDeBord(supabase);
  const maxCat = Math.max(1, ...d.repartitionCategorie.map((c) => c.nb));
  const maxStatut = Math.max(1, ...d.repartitionStatut.map((s) => s.nb));
  const maxHist = Math.max(1, ...d.histogramme.map((b) => b.nb));

  const C = d.carburant;
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const pctDiesel = C.total ? (C.diesel / C.total) * 100 : 0;
  const pctEssence = C.total ? (C.essence / C.total) * 100 : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="rounded border border-line bg-white p-6">
        <p className="text-sm text-slate">Bienvenue,</p>
        <h1 className="mb-4 text-lg font-medium text-ink">
          {profil?.nom ?? user.email}
        </h1>

        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate">Rôle</dt>
          <dd className="text-ink">
            {profil?.role ? LABELS_ROLE[profil.role as UserRole] : "—"}
          </dd>
          <dt className="text-slate">Bureau</dt>
          <dd className="text-ink">{profil?.bureau ?? "—"}</dd>
        </dl>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/vv/nouveau"
            className="block rounded bg-signal py-2 text-center text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Nouveau calcul
          </Link>
          <Link
            href="/vv"
            className="block rounded border border-line py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-slate-50"
          >
            Voir les calculs
          </Link>
        </div>
      </div>

      {d.nbDossiers === 0 ? (
        <p className="rounded border border-line bg-white p-6 text-center text-sm text-slate">
          Aucun dossier enregistré pour le moment.
        </p>
      ) : (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Kpi label="Dossiers" value={String(d.nbDossiers)} />
            <Kpi label="VV cumulée" value={DH(d.vvCumulee)} sousLabel={`sur ${d.nbValides} validé${d.nbValides > 1 ? "s" : ""}`} />
            <Kpi label="VV moyenne" value={DH(d.vvMoyenne)} sousLabel={`sur ${d.nbValides} validé${d.nbValides > 1 ? "s" : ""}`} />
            <Kpi
              label="Âge moyen"
              value={d.ageMoyenAns === null ? "—" : `${d.ageMoyenAns.toFixed(1)} ans`}
              sousLabel={`sur ${d.nbValides} validé${d.nbValides > 1 ? "s" : ""}`}
            />
            <Kpi
              label="Taux de rejet"
              value={`${d.tauxRejetPct.toFixed(0)} %`}
              sousLabel={`sur ${d.nbTraites} traité${d.nbTraites > 1 ? "s" : ""}`}
              alerte={d.tauxRejetPct > 20}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Répartition par catégorie */}
            <div className="rounded border border-line bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate">
                Répartition par catégorie
              </p>
              <div className="space-y-2">
                {d.repartitionCategorie.map((c) => (
                  <div key={c.cle}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="truncate text-ink" title={c.libelle}>
                        {c.libelle}
                      </span>
                      <span className="font-medium text-signal">{c.nb}</span>
                    </div>
                    <div className="h-1.5 rounded bg-canvas">
                      <div
                        className="h-1.5 rounded bg-signal"
                        style={{ width: `${(c.nb / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut carburant */}
            <div className="flex items-center gap-5 rounded border border-line bg-white p-4">
              <svg viewBox="0 0 120 120" width="112" height="112" className="-rotate-90 shrink-0">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#D8D5CC" strokeWidth="14" />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke="#0F6E56"
                  strokeWidth="14"
                  strokeDasharray={`${(pctDiesel / 100) * CIRC} ${CIRC}`}
                />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke="#3D5A73"
                  strokeWidth="14"
                  strokeDasharray={`${(pctEssence / 100) * CIRC} ${CIRC}`}
                  strokeDashoffset={-(pctDiesel / 100) * CIRC}
                />
              </svg>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate">Carburant</p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-signal" /> Diesel{" "}
                  <b className="font-mono text-signal">{C.diesel}</b>
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate" /> Essence{" "}
                  <b className="font-mono text-slate">{C.essence}</b>
                </p>
                {C.autre > 0 && (
                  <p className="mt-1.5 text-xs text-slate">
                    + {C.autre} sans carburant Diesel/Essence renseigné
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Répartition par statut */}
          <div className="rounded border border-line bg-white p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate">
              Répartition par statut
            </p>
            <div className="space-y-2">
              {d.repartitionStatut.map((s) => (
                <div key={s.statut}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink">{LABELS_STATUT[s.statut] ?? s.statut}</span>
                    <span className="font-medium text-signal">{s.nb}</span>
                  </div>
                  <div className="h-1.5 rounded bg-canvas">
                    <div
                      className="h-1.5 rounded bg-signal"
                      style={{ width: `${(s.nb / maxStatut) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Histogramme */}
          <div className="rounded border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-slate">
                Distribution des valeurs vénales (dossiers validés)
              </p>
              <p className="text-xs text-slate">en DH</p>
            </div>
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {d.histogramme.map((b) => (
                <div key={b.libelle} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-ink">{b.nb || ""}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-signal"
                      style={{ height: `${b.nb > 0 ? Math.max((b.nb / maxHist) * 100, 6) : 0}%` }}
                    />
                  </div>
                  <span className="text-center text-[11px] text-slate">{b.libelle}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frise des sinistres */}
          <div className="rounded border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-slate">
                Frise des sinistres
              </p>
              <p className="text-xs text-slate">
                {d.frise.length} événement{d.frise.length > 1 ? "s" : ""}
              </p>
            </div>
            {d.frise.length === 0 ? (
              <p className="text-sm text-slate">Aucune date de sinistre exploitable.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.frise.map((p) => (
                  <li
                    key={p.numero}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line pb-2 last:border-0"
                  >
                    <span className="text-ink">
                      {new Date(p.dateSinistre).toLocaleDateString("fr-MA")} — {p.label}
                      {p.reference && <span className="text-slate"> ({p.reference})</span>}
                    </span>
                    <span className="font-mono font-medium text-signal">{DH(p.valeur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-slate">
        Service de calcul de valeur vénale, isolé et appelable — sans donnée de dossier partagée.
      </p>
    </main>
  );
}

function Kpi({
  label,
  value,
  sousLabel,
  alerte,
}: {
  label: string;
  value: string;
  sousLabel?: string;
  alerte?: boolean;
}) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold ${alerte ? "text-red-700" : "text-ink"}`}>
        {value}
      </p>
      {sousLabel && <p className="mt-0.5 text-[11px] text-slate">{sousLabel}</p>}
    </div>
  );
}
