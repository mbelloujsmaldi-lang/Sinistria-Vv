import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatutBadge } from "./statut-badge";
import { LABELS_CATEGORIE } from "@/lib/analyse";
import type { CategorieVehicule } from "@/lib/calcul-vv";
import {
  chargerOptionsFiltres,
  chargerRegistre,
  type FiltresRegistre,
} from "@/lib/registre";

const CHAMP =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-signal focus:ring-1 focus:ring-signal";

const DH = (v: number | null) => (v === null ? "—" : `${Number(v).toLocaleString("fr-MA")} DH`);
const DATE = (v: string) => new Date(v).toLocaleDateString("fr-MA");

// Nombre total de colonnes du tableau (pour le colSpan de la ligne vide) :
// Réf./Immat./Marque/Modèle/Catégorie/Barème/Carburant/Date MEC/Date
// sinistre/VN/Val. calculée/Val. définitive/Statut/Réf. dossier/Détail.
const NB_COLONNES = 15;

// Recherche et filtres du Registre (Sprint 25) — filtrage SERVEUR : chaque
// recherche/filtre/tri est un paramètre d'URL, la requête Supabase filtre
// directement (comme /audit, Sprint 15). Une vue filtrée est partageable
// par lien, contrairement à l'ancien système (filtrage JS en mémoire).
export default async function ListeCalculsVVPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const uneVal = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtres: FiltresRegistre = {
    q: uneVal(sp.q) || undefined,
    carburant: uneVal(sp.carburant) || undefined,
    bareme: uneVal(sp.bareme) || undefined,
    categorie: uneVal(sp.categorie) || undefined,
    marque: uneVal(sp.marque) || undefined,
    modele: uneVal(sp.modele) || undefined,
    depuisMec: uneVal(sp.depuisMec) || undefined,
    jusquMec: uneVal(sp.jusquMec) || undefined,
    tri: uneVal(sp.tri) || undefined,
    ordre: uneVal(sp.ordre) === "asc" ? "asc" : "desc",
  };
  const pageDemandee = parseInt(uneVal(sp.page), 10);

  const [options, resultat] = await Promise.all([
    chargerOptionsFiltres(supabase),
    chargerRegistre(supabase, filtres, Number.isFinite(pageDemandee) ? pageDemandee : 1),
  ]);
  let { lignes, correspondances, total, page, totalPages } = resultat;

  // Page demandée au-delà du nombre réel de pages (filtre changé entre-temps,
  // lien obsolète...) : recharger sur la dernière page valide plutôt que
  // d'afficher "aucun résultat" alors que le filtre correspond bien à des
  // dossiers.
  if (page > totalPages) {
    const rechargee = await chargerRegistre(supabase, filtres, totalPages);
    lignes = rechargee.lignes;
    page = rechargee.page;
  }

  // Puces de filtres actifs — chacune retire uniquement son propre
  // paramètre en conservant les autres (tri/ordre inclus).
  const paramsBase = new URLSearchParams();
  Object.entries(filtres).forEach(([k, v]) => {
    if (v && k !== "tri" && k !== "ordre") paramsBase.set(k, v);
  });
  if (filtres.tri) paramsBase.set("tri", filtres.tri);
  if (filtres.ordre === "asc") paramsBase.set("ordre", "asc");

  const cles: (keyof FiltresRegistre)[] = [
    "q",
    "carburant",
    "bareme",
    "categorie",
    "marque",
    "modele",
    "depuisMec",
    "jusquMec",
  ];
  const libellesPuce: Record<(typeof cles)[number], string> = {
    q: `Recherche : « ${filtres.q ?? ""} »`,
    carburant: `Carburant : ${filtres.carburant ?? ""}`,
    bareme: `Barème : ${filtres.bareme ?? ""}`,
    categorie: `Catégorie : ${options.categories.find((c) => c.cle === filtres.categorie)?.libelle ?? filtres.categorie ?? ""}`,
    marque: `Marque : ${filtres.marque ?? ""}`,
    modele: `Modèle : ${filtres.modele ?? ""}`,
    depuisMec: `MEC depuis : ${filtres.depuisMec ?? ""}`,
    jusquMec: `MEC jusqu'au : ${filtres.jusquMec ?? ""}`,
    tri: "",
    ordre: "",
  };
  const puces = cles
    .filter((cle) => filtres[cle])
    .map((cle) => ({ cle, label: libellesPuce[cle] }));

  function urlSans(cle: keyof FiltresRegistre): string {
    const params = new URLSearchParams(paramsBase);
    params.delete(cle);
    const s = params.toString();
    return s ? `/vv?${s}` : "/vv";
  }

  function urlTri(colonne: string): string {
    const params = new URLSearchParams(paramsBase);
    const dejaActif = filtres.tri === colonne;
    const prochainOrdre = dejaActif && filtres.ordre === "asc" ? "desc" : "asc";
    params.set("tri", colonne);
    if (prochainOrdre === "asc") params.set("ordre", "asc");
    else params.delete("ordre");
    return `/vv?${params.toString()}`;
  }

  const paramsExport = new URLSearchParams(paramsBase);

  // Pagination (page=N) — un paramètre de plus, cohérent avec le reste :
  // absent de paramsBase, donc un changement de filtre ou de tri revient
  // naturellement à la page 1 (rien ne le reporte). Seule la navigation de
  // page à page le fixe explicitement.
  function urlPage(n: number): string {
    const params = new URLSearchParams(paramsBase);
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return s ? `/vv?${s}` : "/vv";
  }

  function numerosPagination(courante: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const voisins = new Set<number>([1, total, courante, courante - 1, courante + 1]);
    const nums = Array.from(voisins)
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let precedent = 0;
    for (const n of nums) {
      if (precedent && n - precedent > 1) out.push("…");
      out.push(n);
      precedent = n;
    }
    return out;
  }
  const pagesAffichees = numerosPagination(page, totalPages);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-ink">Registre des calculs de valeur vénale</h1>
        <Link
          href="/vv/nouveau"
          className="rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light"
        >
          Nouveau calcul
        </Link>
      </div>

      <form
        method="get"
        className="mb-4 grid gap-3 rounded border border-line bg-white p-4 sm:grid-cols-3 lg:grid-cols-7"
      >
        <div className="sm:col-span-3 lg:col-span-2">
          <label htmlFor="q" className="mb-1 block text-xs text-slate">
            Recherche
          </label>
          <input
            id="q"
            name="q"
            defaultValue={filtres.q ?? ""}
            className={CHAMP}
            placeholder="Immat., marque, modèle, catégorie, n°…"
          />
        </div>
        <div>
          <label htmlFor="carburant" className="mb-1 block text-xs text-slate">
            Carburant
          </label>
          <select id="carburant" name="carburant" defaultValue={filtres.carburant ?? ""} className={CHAMP}>
            <option value="">Tous</option>
            {options.carburants.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bareme" className="mb-1 block text-xs text-slate">
            Barème
          </label>
          <select id="bareme" name="bareme" defaultValue={filtres.bareme ?? ""} className={CHAMP}>
            <option value="">Tous</option>
            {options.baremes.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="categorie" className="mb-1 block text-xs text-slate">
            Catégorie
          </label>
          <select id="categorie" name="categorie" defaultValue={filtres.categorie ?? ""} className={CHAMP}>
            <option value="">Toutes</option>
            {options.categories.map((c) => (
              <option key={c.cle} value={c.cle}>
                {c.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="marque" className="mb-1 block text-xs text-slate">
            Marque
          </label>
          <select id="marque" name="marque" defaultValue={filtres.marque ?? ""} className={CHAMP}>
            <option value="">Toutes</option>
            {options.marques.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="modele" className="mb-1 block text-xs text-slate">
            Modèle
          </label>
          <select id="modele" name="modele" defaultValue={filtres.modele ?? ""} className={CHAMP}>
            <option value="">Tous</option>
            {options.modeles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="depuisMec" className="mb-1 block text-xs text-slate">
            MEC depuis
          </label>
          <input
            id="depuisMec"
            name="depuisMec"
            type="date"
            defaultValue={filtres.depuisMec ?? ""}
            className={CHAMP}
          />
        </div>
        <div>
          <label htmlFor="jusquMec" className="mb-1 block text-xs text-slate">
            MEC jusqu&apos;au
          </label>
          <input
            id="jusquMec"
            name="jusquMec"
            type="date"
            defaultValue={filtres.jusquMec ?? ""}
            className={CHAMP}
          />
        </div>
        {filtres.tri && <input type="hidden" name="tri" value={filtres.tri} />}
        {filtres.ordre === "asc" && <input type="hidden" name="ordre" value="asc" />}
        <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-2">
          <button
            type="submit"
            className="flex-1 rounded bg-signal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-light"
          >
            Filtrer
          </button>
          <a href="/vv" className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas">
            Réinitialiser
          </a>
        </div>
      </form>

      {puces.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {puces.map((p) => (
            <a
              key={p.cle}
              href={urlSans(p.cle)}
              className="inline-flex items-center gap-1.5 rounded-full border border-signal bg-signal-bg px-3 py-1 text-xs text-signal hover:bg-signal/10"
            >
              {p.label}
              <span aria-hidden>✕</span>
            </a>
          ))}
        </div>
      )}

      <p className="mb-3 text-sm text-slate">
        {correspondances} / {total} dossier{total > 1 ? "s" : ""}
        {" · "}
        <a
          href={`/api/registre/export?${paramsExport.toString()}`}
          className="text-signal underline hover:text-signal-light"
        >
          Exporter en CSV ({correspondances} ligne{correspondances > 1 ? "s" : ""})
        </a>
      </p>

      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full min-w-[1600px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase text-slate">
            <tr>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("numero")} className="inline-flex items-center gap-1 hover:text-ink">
                  Réf.
                  {filtres.tri === "numero" && <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("immatriculation")} className="inline-flex items-center gap-1 hover:text-ink">
                  Immat.
                  {filtres.tri === "immatriculation" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("marque")} className="inline-flex items-center gap-1 hover:text-ink">
                  Marque
                  {filtres.tri === "marque" && <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("modele")} className="inline-flex items-center gap-1 hover:text-ink">
                  Modèle
                  {filtres.tri === "modele" && <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">Catégorie</th>
              <th className="px-3 py-2 font-medium">Barème</th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("carburant")} className="inline-flex items-center gap-1 hover:text-ink">
                  Carburant
                  {filtres.tri === "carburant" && <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a
                  href={urlTri("date_mise_circulation")}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  Date MEC
                  {filtres.tri === "date_mise_circulation" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("date_sinistre")} className="inline-flex items-center gap-1 hover:text-ink">
                  Date sinistre
                  {filtres.tri === "date_sinistre" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("valeur_neuve")} className="inline-flex items-center gap-1 hover:text-ink">
                  VN
                  {filtres.tri === "valeur_neuve" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("valeur_calculee")} className="inline-flex items-center gap-1 hover:text-ink">
                  Val. calculée
                  {filtres.tri === "valeur_calculee" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("valeur_definitive")} className="inline-flex items-center gap-1 hover:text-ink">
                  Val. définitive
                  {filtres.tri === "valeur_definitive" && (
                    <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>
                  )}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">
                <a href={urlTri("statut")} className="inline-flex items-center gap-1 hover:text-ink">
                  Statut
                  {filtres.tri === "statut" && <span aria-hidden>{filtres.ordre === "asc" ? "▲" : "▼"}</span>}
                </a>
              </th>
              <th className="px-3 py-2 font-medium">Réf. dossier</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ink">{l.reference}</td>
                <td className="px-3 py-2 text-ink">{l.immatriculation || "—"}</td>
                <td className="px-3 py-2 text-ink">{l.marque || "—"}</td>
                <td className="px-3 py-2 text-ink">{l.modele || "—"}</td>
                <td className="px-3 py-2 text-slate">
                  {LABELS_CATEGORIE[l.categorie as CategorieVehicule] ?? l.categorie}
                </td>
                <td className="px-3 py-2 text-slate">{l.bareme_version}</td>
                <td className="px-3 py-2 text-slate">{l.carburant || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate">{DATE(l.date_mise_circulation)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate">{DATE(l.date_sinistre)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink">{DH(l.valeur_neuve)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink">{DH(l.valeur_calculee)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink">{DH(l.valeur_definitive)}</td>
                <td className="px-3 py-2">
                  <StatutBadge statut={l.statut} />
                </td>
                <td className="px-3 py-2 text-slate">{l.reference_dossier_externe || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/vv/${l.id}`} className="text-signal underline">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={NB_COLONNES} className="px-4 py-6 text-center text-slate">
                  Aucun calcul ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-slate">
            Page {page} sur {totalPages} ({correspondances} dossier{correspondances > 1 ? "s" : ""})
          </p>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <a
                href={urlPage(page - 1)}
                className="rounded border border-line px-2.5 py-1 text-ink hover:bg-canvas"
              >
                ← Précédent
              </a>
            ) : (
              <span className="rounded border border-line px-2.5 py-1 text-slate opacity-50">← Précédent</span>
            )}
            {pagesAffichees.map((n, i) =>
              n === "…" ? (
                <span key={`ellipse-${i}`} className="px-1.5 text-slate">
                  …
                </span>
              ) : (
                <a
                  key={n}
                  href={urlPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`rounded px-2.5 py-1 ${
                    n === page
                      ? "bg-signal font-medium text-white"
                      : "border border-line text-ink hover:bg-canvas"
                  }`}
                >
                  {n}
                </a>
              )
            )}
            {page < totalPages ? (
              <a
                href={urlPage(page + 1)}
                className="rounded border border-line px-2.5 py-1 text-ink hover:bg-canvas"
              >
                Suivant →
              </a>
            ) : (
              <span className="rounded border border-line px-2.5 py-1 text-slate opacity-50">Suivant →</span>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate">
        <Link href="/dashboard" className="underline hover:text-ink">
          ← Retour au tableau de bord
        </Link>
      </p>
    </main>
  );
}
