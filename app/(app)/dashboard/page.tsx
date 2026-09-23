import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { chargerTableauDeBord } from "@/lib/analyse";
import { LABELS_STATUT } from "../vv/statut-badge";

const DH = (v: number) => `${Math.round(v).toLocaleString("fr-MA")} DH`;

// Tableau de bord (Sprint 24, Phase C : fusionné avec l'accueil ; Sprint 29
// point 1 : re-scindé sur demande explicite — l'accueil/bienvenue devient
// /accueil, point d'entrée officiel après connexion, et cette page ne garde
// que l'analytique, avec son propre onglet de nav ("Tableau de bord",
// premier de la liste).
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const d = await chargerTableauDeBord(supabase);
  const tauxValidationPct = d.nbTraites ? (d.nbValides / d.nbTraites) * 100 : 0;
  const maxCat = Math.max(1, ...d.repartitionCategorie.map((c) => c.nb));
  const maxStatut = Math.max(1, ...d.repartitionStatut.map((s) => s.nb));
  const maxHist = Math.max(1, ...d.histogramme.map((b) => b.nb));
  const maxBureau = Math.max(1, ...d.repartitionBureau.map((b) => b.nb));
  const maxMarque = Math.max(1, ...d.topMarques.map((m) => m.nb));

  const nbBareme2023 = d.baremeUtilise.find((b) => b.version === "2023")?.nb ?? 0;
  const pctBareme2023 = d.nbDossiers ? (nbBareme2023 / d.nbDossiers) * 100 : 0;
  const marqueTop = d.topMarques[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <h1 className="text-lg font-bold text-ink">Tableau de bord</h1>

      {d.nbDossiers === 0 ? (
        <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-slate">
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
              label="Taux de validation"
              value={`${tauxValidationPct.toFixed(0)} %`}
              sousLabel={`sur ${d.nbTraites} traité${d.nbTraites > 1 ? "s" : ""}`}
              accent
            />
          </div>

          {/* Repères d'expert (Sprint 30, point 2) — ce qu'un expert VVADE
              regarde en premier : dépréciation réelle, biais de validation,
              barème dominant, marché expertisé. Remplace le donut Carburant
              (déjà lisible dans le Registre) et la Frise des sinistres
              (déjà couverte par Registre/Validations), jugés décoratifs. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="Dépréciation moyenne"
              value={d.depreciationMoyennePct === null ? "—" : `${d.depreciationMoyennePct.toFixed(0)} %`}
              sousLabel="VVADE / valeur à neuf"
            />
            <Kpi
              label="Écart moyen à la validation"
              value={
                d.ecartMoyenValidationPct === null
                  ? "—"
                  : `${d.ecartMoyenValidationPct > 0 ? "+" : ""}${d.ecartMoyenValidationPct.toFixed(1)} %`
              }
              sousLabel="vs valeur calculée"
            />
            <Kpi label="Barème 2023" value={`${pctBareme2023.toFixed(0)} %`} sousLabel="des dossiers" />
            <Kpi
              label="Véhicule le plus expertisé"
              value={marqueTop ? marqueTop.label : "—"}
              sousLabel={marqueTop ? `${marqueTop.nb} dossier${marqueTop.nb > 1 ? "s" : ""}` : undefined}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Répartition par catégorie */}
            <div className="rounded-md border border-line bg-white p-4">
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

            {/* Véhicules les plus expertisés — intelligence de marché pour
                un expert : quoi passe le plus souvent sur la table. */}
            <div className="rounded-md border border-line bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate">
                Véhicules les plus expertisés
              </p>
              {d.topMarques.length === 0 ? (
                <p className="text-sm text-slate">Aucune marque renseignée.</p>
              ) : (
                <div className="space-y-2">
                  {d.topMarques.map((m) => (
                    <div key={m.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="truncate text-ink" title={m.label}>
                          {m.label}
                        </span>
                        <span className="font-medium text-signal">{m.nb}</span>
                      </div>
                      <div className="h-1.5 rounded bg-canvas">
                        <div className="h-1.5 rounded bg-signal" style={{ width: `${(m.nb / maxMarque) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Répartition par statut */}
          <div className="rounded-md border border-line bg-white p-4">
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
          <div className="rounded-md border border-line bg-white p-4">
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

          {/* Répartition par bureau — comparaison de volume/activité entre
              bureaux (jointure vers profiles.bureau via created_by ; vaut
              même à bureau unique, la vue s'étend naturellement dès qu'un
              second bureau existe). */}
          {d.repartitionBureau.length > 1 && (
            <div className="rounded-md border border-line bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate">
                Répartition par bureau
              </p>
              <div className="space-y-2">
                {d.repartitionBureau.map((b) => (
                  <div key={b.bureau}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-ink">{b.bureau}</span>
                      <span className="font-medium text-signal">{b.nb}</span>
                    </div>
                    <div className="h-1.5 rounded bg-canvas">
                      <div className="h-1.5 rounded bg-signal" style={{ width: `${(b.nb / maxBureau) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate">
        Service de calcul de valeur vénale, isolé et appelable — sans donnée de dossier partagée.
      </p>
    </main>
  );
}

// `accent` (Sprint 26, Phase E) : fond signal plein — réservé à UNE seule
// KPI par écran ("taux de validation" sur ce tableau de bord). Les autres
// restent en carte neutre : ce n'est pas un style de carte générique.
function Kpi({
  label,
  value,
  sousLabel,
  accent,
}: {
  label: string;
  value: string;
  sousLabel?: string;
  accent?: boolean;
}) {
  if (accent) {
    return (
      <div className="rounded-md bg-signal p-4">
        <p className="text-xs text-canvas/80">{label}</p>
        <p className="mt-1 font-mono text-xl font-bold text-canvas">{value}</p>
        {sousLabel && <p className="mt-0.5 text-[11px] text-canvas/80">{sousLabel}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-ink">{value}</p>
      {sousLabel && <p className="mt-0.5 text-[11px] text-slate">{sousLabel}</p>}
    </div>
  );
}
