/**
 * Tests de non-regression — executer avec `npx tsx lib/test-calcul-vv.ts`
 *
 * 5 cas verifies contre des exemples fournis par l'utilisateur ou tires
 * directement du document officiel FMSAR 2023 (section "VVADE : exemples
 * illustratifs 2023"), chiffre par chiffre.
 */
import { calculerValeurVenale } from "./calcul-vv";

let echecs = 0;

function verifier(nom: string, obtenu: number, attendu: number, tolerance = 0.5) {
  const ok = Math.abs(obtenu - attendu) <= tolerance;
  console.log(`${ok ? "OK  " : "ECHEC"} ${nom} : obtenu=${obtenu} attendu=${attendu}`);
  if (!ok) echecs++;
}

// Cas 0 — exemple de reference initial (sans correctifs)
{
  const r = calculerValeurVenale({
    valeurNeuve: 200000,
    dateMiseCirculation: new Date("2024-03-15"),
    dateSinistre: new Date("2026-09-15"),
    categorie: "leger_pu7_particulier",
    carburant: "diesel",
    baremeVersion: "2023",
    puissanceFiscale: 6,
  });
  verifier("Cas 0 - VVADE sans correctif (VN 200k, 2a6m)", r.vvadeSansCorrectif, 129200);
}

// Cas 1 — exemple illustratif FMSAR 2023 #1
{
  const r = calculerValeurVenale({
    valeurNeuve: 100000,
    dateMiseCirculation: new Date("2024-09-15"),
    dateSinistre: new Date("2026-09-15"),
    categorie: "leger_pu7_particulier",
    carburant: "diesel",
    baremeVersion: "2023",
    puissanceFiscale: 6,
    kilometrageTotal: 40000,
    entretien: "aucun",
  });
  verifier("Cas 1 - VVADE sans correctif", r.vvadeSansCorrectif, 68000);
  verifier("Cas 1 - correctif lambda %", r.correctifLambdaPct * 100, 7.5);
  verifier("Cas 1 - VVADE finale", r.vvadeFinale, 73100);
}

// Cas 2 — exemple illustratif FMSAR 2023 #2
{
  const r = calculerValeurVenale({
    valeurNeuve: 120000,
    dateMiseCirculation: new Date("2022-09-15"),
    dateSinistre: new Date("2026-09-15"),
    categorie: "leger_pu7_location",
    carburant: "diesel",
    baremeVersion: "2023",
    puissanceFiscale: 6,
    kilometrageTotal: 100000,
    entretien: "concessionnaire_puis_reseau_agree",
  });
  verifier("Cas 2 - VVADE sans correctif", r.vvadeSansCorrectif, 55080);
  verifier("Cas 2 - correctif beta %", r.correctifBetaPct * 100, 7.5);
  verifier("Cas 2 - correctif lambda %", r.correctifLambdaPct * 100, 5);
  verifier("Cas 2 - VVADE finale", r.vvadeFinale, 61965);
}

// Cas 3 — exemple illustratif FMSAR 2023 #3
{
  const r = calculerValeurVenale({
    valeurNeuve: 200000,
    dateMiseCirculation: new Date("2023-09-15"),
    dateSinistre: new Date("2026-09-15"),
    categorie: "leger_pu8_12_particulier",
    carburant: "essence",
    baremeVersion: "2023",
    puissanceFiscale: 9,
    kilometrageTotal: 120000,
    entretien: "concessionnaire_continu",
  });
  verifier("Cas 3 - VVADE sans correctif", r.vvadeSansCorrectif, 102000);
  verifier("Cas 3 - correctif beta %", r.correctifBetaPct * 100, 15);
  verifier("Cas 3 - correctif lambda %", r.correctifLambdaPct * 100, -10);
  verifier("Cas 3 - VVADE finale", r.vvadeFinale, 107100);
}

// Cas 4 — exemple illustratif FMSAR 2023 #4 (camion tracteur, plafond lambda)
{
  const r = calculerValeurVenale({
    valeurNeuve: 960000,
    dateMiseCirculation: new Date("2022-09-15"),
    dateSinistre: new Date("2026-09-15"),
    categorie: "bus_camion_tracteur",
    carburant: "diesel",
    baremeVersion: "2023",
    puissanceFiscale: 34,
    kilometrageTotal: 200000,
    typeKilometrage: "camions_tracteurs",
    entretien: "concessionnaire_continu",
  });
  verifier("Cas 4 - VVADE sans correctif", r.vvadeSansCorrectif, 342720);
  verifier("Cas 4 - correctif beta %", r.correctifBetaPct * 100, 15);
  verifier("Cas 4 - correctif lambda % (plafonne)", r.correctifLambdaPct * 100, 15);
  verifier("Cas 4 - VVADE finale", r.vvadeFinale, 445536);
}

console.log("");
console.log(echecs === 0 ? "TOUS LES TESTS PASSENT" : `${echecs} ECHEC(S)`);
