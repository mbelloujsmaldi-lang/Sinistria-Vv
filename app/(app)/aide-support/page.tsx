import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peutGererSupport, type UserRole } from "@/lib/roles";
import CoefficientsClient from "../analyse/coefficients/coefficients-client";
import SupportUtilisateur, { type MessageUtilisateur } from "./support-utilisateur";
import SupportAdmin, { type MessageAdmin } from "./support-admin";
import OngletsAideSupport from "./onglets";

// Aide & Support (Sprint 23 ; scindée en sous-onglets Sprint 24 Phase D) —
// tout profil actif. La méthodologie réutilise le composant du Sprint 19
// (coefficients-client.tsx) tel quel : aucune table de taux ni logique de
// calcul redupliquée ici. Contenu de chaque onglet identique au Sprint 23,
// seule la présentation (onglets au lieu de sections empilées) change.
export default async function PageAideSupport() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, actif")
    .eq("id", user.id)
    .single();
  if (!profil?.actif) redirect("/dashboard");

  const role = profil.role as UserRole;
  const estSupport = peutGererSupport(role);

  const { data: mesMessages } = await supabase
    .from("support_messages")
    .select("id, sujet, message, statut, reponse, repondu_le, created_at")
    .eq("auteur_id", user.id)
    .order("created_at", { ascending: false });

  let tousLesMessages: MessageAdmin[] | null = null;
  if (estSupport) {
    const { data: brut } = await supabase
      .from("support_messages")
      .select("id, sujet, message, statut, reponse, repondu_le, created_at, auteur_id, repondu_par")
      .order("created_at", { ascending: false });

    const ids = Array.from(
      new Set((brut ?? []).flatMap((m) => [m.auteur_id, m.repondu_par].filter(Boolean) as string[]))
    );
    const { data: profils } = ids.length
      ? await supabase.from("profiles").select("id, nom").in("id", ids)
      : { data: [] as { id: string; nom: string }[] };
    const nomParId = new Map((profils ?? []).map((p) => [p.id, p.nom]));

    tousLesMessages = (brut ?? []).map((m) => ({
      ...m,
      auteurNom: nomParId.get(m.auteur_id) ?? "—",
      renduParNom: m.repondu_par ? (nomParId.get(m.repondu_par) ?? "—") : null,
    }));
  }

  const methodologie = (
    <section className="space-y-4">
      <h2 className="text-base font-medium text-ink">Méthodologie de calcul</h2>
      <div className="space-y-3 rounded border border-line bg-white p-5 text-sm leading-relaxed text-ink">
        <p>
          La valeur vénale à dire d&apos;expert (VVADE) est calculée par un{" "}
          <strong>barème dégressif appliqué au solde restant</strong> de la valeur du véhicule,
          année après année — pas un taux fixe appliqué en une seule fois sur la valeur à neuf
          d&apos;origine.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Taux dégressif par catégorie</strong> : chaque catégorie de véhicule (léger
            particulier, location/utilitaire, poids lourd...) a ses propres taux annuels de
            dépréciation pour les 5 premières années. Au-delà de la 5<sup>e</sup> année, le taux de
            la 5<sup>e</sup> année reste appliqué jusqu&apos;à la 10<sup>e</sup> ; à partir de la
            11<sup>e</sup> année, le taux devient 5&nbsp;% par an.
          </li>
          <li>
            <strong>Prorata mensuel</strong> : l&apos;année en cours au moment du sinistre est
            calculée au prorata exact du nombre de mois écoulés, jamais arrondie à l&apos;année
            pleine.
          </li>
          <li>
            <strong>Minimum de 5&nbsp;% la 1<sup>re</sup> année</strong> : si le véhicule a moins
            d&apos;un an, un abattement minimum de 5&nbsp;% est appliqué même si le prorata mensuel
            calculé donnerait moins — règle explicite du document FMSAR.
          </li>
          <li>
            <strong>Correctif entretien (β)</strong> : bonifie la valeur si un entretien suivi
            (concessionnaire, réseau agréé) est démontré. Le barème diffère entre les versions 2019
            et 2023.
          </li>
          <li>
            <strong>Correctif kilométrage (λ)</strong> : ajuste la valeur selon l&apos;écart entre
            le kilométrage réel moyen annuel et une référence par type d&apos;usage — plafonné à
            ±15&nbsp;%. Le référentiel 2023 est unique par carburant ; le référentiel 2019 varie en
            plus selon la puissance fiscale.
          </li>
          <li>
            <strong>Correctif commercial</strong> (véhicules utilitaires/commerciaux uniquement) :
            ajustement de ±25&nbsp;% maximum, à la discrétion de l&apos;expert — jamais calculé
            automatiquement.
          </li>
          <li>
            <strong>TVA</strong> : la valeur à neuf et la VVADE sont toujours exprimées TTC ;
            l&apos;équivalent HT (au taux de 20&nbsp;%) est affiché en complément.
          </li>
        </ul>
        <p className="text-xs text-slate">
          La VVADE finale ne dépasse jamais la valeur à neuf du véhicule.
        </p>
      </div>

      <p className="text-sm text-ink">
        Table des taux dégressifs, barème et catégorie par barème et catégorie, sur 25 ans :
      </p>
      <CoefficientsClient />
    </section>
  );

  const support = (
    <>
      <section className="space-y-4">
        <h2 className="text-base font-medium text-ink">Support technique</h2>
        <SupportUtilisateur messagesInitiaux={(mesMessages as MessageUtilisateur[]) ?? []} />
      </section>

      {estSupport && (
        <section className="space-y-4">
          <h2 className="text-base font-medium text-ink">Support — vue administrateur</h2>
          <SupportAdmin messagesInitiaux={tousLesMessages ?? []} />
        </section>
      )}
    </>
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-1 text-lg font-medium text-ink">Aide &amp; Support</h1>
        <p className="text-sm text-slate">
          Méthodologie de calcul de la valeur vénale et assistance technique.
        </p>
      </div>

      <OngletsAideSupport methodologie={methodologie} support={support} />
    </main>
  );
}
