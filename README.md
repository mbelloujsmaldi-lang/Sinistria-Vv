# Sinistria-VV — Sprint 1

Premier module de la plateforme Sinistria. Ce Sprint pose le socle :
authentification, 8 rôles hiérarchiques, table `dossiers` (centrale pour
tous les futurs modules Sinistria), et le squelette du moteur de calcul
de valeur vénale.

## Ce qui est inclus

- `supabase/migrations/0001_init.sql` — schéma complet : rôles, `profiles`,
  `dossiers`, `vv_calculations`, avec Row Level Security reflétant la
  hiérarchie (Technicien → Directeur → Administrateur technique).
- `lib/calcul-vv.ts` — moteur de calcul (dégressif sur solde restant,
  prorata mensuel, plafond VN), taux et référentiels **validés contre les
  documents officiels FMSAR 2019 et 2023** (voir section ci-dessous).
- `app/login`, `app/dashboard` — authentification et tableau de bord
  minimal prouvant que Auth + rôles + RLS fonctionnent ensemble.
- `middleware.ts` — protection des routes.

## Démarrage

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com)
   (le plan gratuit suffit largement pour démarrer).
2. Dans l'éditeur SQL de Supabase, exécuter le contenu de
   `supabase/migrations/0001_init.sql`.
3. Créer un premier compte utilisateur via Supabase Auth (tableau de bord
   Supabase > Authentication > Add user), puis lui créer une ligne dans
   `profiles` avec `role = 'admin_technique'`.
4. Copier `.env.local.example` en `.env.local` et renseigner l'URL et la
   clé anon de votre projet (Project Settings > API).
5. Installer les dépendances et lancer le serveur :

   ```bash
   npm install
   npm run dev
   ```

6. Ouvrir [http://localhost:3000](http://localhost:3000) — vous serez
   redirigé vers `/login`.

## Moteur de calcul — validé contre les documents officiels

`lib/calcul-vv.ts` a été relu et vérifié chiffre par chiffre contre les
deux documents FMSAR officiels ("La valeur vénale à dire d'expert", Mai
2019 et Juin 2023, disponibles en PDF) :
- Les matrices de taux dégressifs (par catégorie, puissance fiscale,
  carburant, année) correspondent exactement aux deux versions du barème.
- Les coefficients β (entretien) et les référentiels λ (kilométrage)
  correspondent exactement, **y compris la différence clé entre versions** :
  le référentiel 2023 est unique par carburant quelle que soit la puissance
  fiscale (simplification explicite du document 2023), alors que le
  référentiel 2019 varie par palier de puissance fiscale. Ce n'est pas une
  incohérence du code — c'est une différence réelle entre les deux
  documents, et le code applique la bonne logique par version.
- `lib/test-calcul-vv.ts` (16/16 tests) valide, chiffre par chiffre, les 4
  exemples illustratifs officiels du document 2023.

**Point encore ouvert** : le plafond de ±15% sur le correctif λ est
explicite dans le document 2023 ; le document 2019 ne mentionne aucun
plafond pour λ. Le code applique ±15% aux deux versions par prudence
métier — à confirmer si un dossier 2019 doit un jour dépasser ce seuil.

**Écart identifié avec le prototype existant** : le calculateur "Vv
Expertise Auto" (Apps Script, en production avec des dossiers réels)
applique encore le référentiel λ dépendant de la puissance fiscale même
pour des calculs marqués "2023" — c'est-à-dire qu'il n'a pas été mis à
jour suite à la simplification introduite par le document 2023. Ce n'est
pas un bug de Sinistria-VV ; c'est une dette technique du prototype
existant, à garder à l'esprit si les deux systèmes sont un jour comparés.

## Sprint 2 — interface de saisie

- `app/vv/nouveau/page.tsx` + `app/vv/nouveau/formulaire-vv.tsx` — formulaire
  de saisie (valeur à neuf, dates, catégorie, carburant, puissance fiscale,
  correctifs optionnels entretien/kilométrage/commercial) branché sur
  `calculerValeurVenale()`. Accessible depuis le bouton "Nouveau calcul de
  valeur vénale" du tableau de bord.
- `supabase/migrations/0002_vv_calculations_champs_complets.sql` — étend
  `vv_calculations` avec les paramètres d'entrée complets (`carburant`,
  `puissance_fiscale`, `kilometrage_total`, `type_kilometrage`, `entretien`,
  `correctif_commercial_pct`) et les résultats intermédiaires
  (`correctif_beta_pct`/`_montant`, `correctif_lambda_pct`/`_montant`,
  `vvade_sans_correctif`), pour qu'un calcul validé par un supérieur
  hiérarchique reste rejouable à l'identique. **À exécuter dans l'éditeur SQL
  Supabase avant d'utiliser le formulaire.**
- Le correctif commercial (±25%, saisie manuelle experte, jamais calculé
  automatiquement) n'apparaît dans le formulaire que pour les catégories
  utilitaires/commerciales (véhicules "location", bus, camions,
  semi-remorques) — masqué pour les véhicules particuliers et les
  motocycles.
- Le barème (2019/2023) est un choix explicite du formulaire, jamais une
  valeur fixe.
- Sinistria-VV reste un service de calcul isolé.

## Sprint 3 — retrait de `dossiers` (décision architecturale)

Sinistria-Site possède déjà un système de dossier complet et mature
(sociétaire, véhicule, sinistre, workflow proposition/décision/validation).
VV n'a pas besoin de dupliquer `client_nom`, `vehicule_immatriculation`,
`statut`, etc. — même en lecture seule, car cela rouvre le problème de
synchronisation que la vision "VV = service de calcul isolé" vise à éviter.
VV n'a besoin de connaître ni le nom du client ni l'immatriculation pour
faire ou rejouer un calcul.

- `supabase/migrations/0003_retrait_dossiers.sql` — supprime la table
  `dossiers` (et le type `dossier_statut`) de la base VV, retire
  `vv_calculations.dossier_id` et le remplace par
  `reference_dossier_externe text` : une référence texte libre fournie par
  l'appelant (ex. Sinistria-Site), sans foreign key locale. Sert uniquement
  de piste d'audit, sans que VV possède ou gère le dossier. **À exécuter
  dans l'éditeur SQL Supabase.**
- Aucun mécanisme de synchronisation construit ni prévu : VV reste
  consultable/appelable indépendamment ; c'est Sinistria-Site qui stocke,
  le cas échéant, le résultat du calcul sur son propre dossier.
- `profiles` / les 8 rôles restent propres à VV — ce n'est pas la même
  catégorie de problème : c'est la hiérarchie de validation interne du
  calcul VV, pas une donnée de dossier partagée.

## Sprint 3 — écran de validation (calqué sur le prototype réel "Vv Expertise Auto")

`supabase/migrations/0004_workflow_validation.sql` ajoute le workflow
calcule → soumis → valide/rejeté, avec écart et justification, plus un
journal d'audit — les mêmes champs que le prototype Apps Script existant,
déjà validé sur 34+ dossiers réels. **À exécuter dans l'éditeur SQL
Supabase.**

- `vv_calculations` gagne : `statut`, `ecart_dh`, `ecart_pct`,
  `justification_ecart`, `valide_le`, `motif_rejet`, `soumis_par`,
  `soumis_le` (`valeur_definitive` et `validee_par` existaient déjà depuis
  0001_init.sql — réutilisés tels quels).
- Nouvelle table `vv_calculations_historique` (qui, quoi, ancienne →
  nouvelle valeur, observation, horodatage) — RLS : lecture pour tout
  utilisateur authentifié, écriture uniquement pour l'auteur de la ligne.
- Nouvelles policies RLS sur `vv_calculations` : le créateur peut soumettre
  son propre calcul (`calcule` → `soumis`) ; les rôles Responsable et
  au-dessus peuvent valider ou rejeter (`soumis` → `valide`/`rejete`).
- `app/vv/page.tsx` — liste des calculs avec statut, valeur calculée,
  valeur définitive.
- `app/vv/[id]/page.tsx` + `actions-vv.tsx` — détail d'un calcul, historique,
  et actions contextuelles selon le rôle : soumettre (créateur), valider
  avec valeur définitive + justification, ou retourner pour correction avec
  motif (Responsable+). L'application des droits réels se fait par RLS
  côté serveur ; `lib/roles.ts` ne sert qu'à l'affichage.

## Sprint 4 — API d'intégration pour Sinistria-Site

`POST /api/calculer` — appel serveur-à-serveur (Sinistria-Site en Apps
Script via `UrlFetchApp`, donc pas de session Supabase Auth). Authentifié
par une clé unique partagée (`Authorization: Bearer <VV_API_KEY>`), pas de
gestion multi-clés ni de rate limiting pour l'instant (un seul appelant).

- `supabase/migrations/0005_api_integration.sql` — rend `created_by`
  nullable sur `vv_calculations`. `NULL` a un sens unique dans tout le
  système : "créé via l'API, pas par un humain authentifié" — toute
  création manuelle passe par un `userId` réel, donc pas d'ambiguïté
  possible. Conséquence naturelle : le bouton "Soumettre à validation" ne
  s'affiche jamais pour ces lignes (comparaison `userId === created_by`
  échoue toujours sur `null`) — aucun changement d'affichage nécessaire
  ailleurs, vérifié (aucun autre endroit du code n'affiche "créé par" pour
  un calcul). **À exécuter dans l'éditeur SQL Supabase.**
- Requête : JSON correspondant à `ParametresCalcul` (`lib/calcul-vv.ts`)
  + `referenceDossierExterne` (obligatoire pour un appel API — c'est la
  seule trace du dossier Sinistria-Site). Validation stricte de chaque
  champ (enums, nombres positifs, dates, cohérence dates, plafond
  correctif commercial ±25% et restriction aux catégories
  commerciales) — jamais de valeur par défaut silencieuse ; `400` avec
  message clair sur le premier champ invalide.
- Réponse `200` : le corps EST `ResultatCalcul` mis à plat (`ageEnMois`,
  `vvadeSansCorrectif`, `correctifBetaPct`/`Montant`,
  `correctifLambdaPct`/`Montant`, `correctifCommercialMontant`,
  `vvadeFinale`, `plafonneAVN`), avec `id` ajouté en plus (id de la ligne
  créée dans `vv_calculations`) — pas d'enveloppe `{ resultat: {...} }`,
  conformément au contrat Sprint 4 et à ce qu'attend le code Apps Script
  côté Sinistria-Site. Chaque appel réussi crée une ligne dans
  `vv_calculations` (même traçabilité qu'une saisie manuelle), **sans**
  entrer dans le workflow de validation interne VV.
- Réponse d'erreur : `{ erreur: "message" }` (`400`/`401`/`500`).
- `lib/supabase/admin.ts` — client `service_role` (bypass RLS), réservé
  aux routes serveur sans session utilisateur. Nécessite
  `SUPABASE_SERVICE_ROLE_KEY` en variable d'environnement (jamais exposée
  au client).
- **Deux bugs d'intégration trouvés et corrigés en testant réellement
  l'appel** (pas en relisant le code) :
  1. `proxy.ts` protégeait toutes les routes (y compris `/api/*`) par la
     session Supabase Auth, donc un appel sans cookie de session était
     redirigé vers `/login` (HTML) au lieu d'atteindre la route — `/api`
     est maintenant exclu du matcher.
  2. La réponse `200` était enveloppée (`{ id, resultat }`) au lieu d'être
     `ResultatCalcul` à plat comme spécifié — trouvé en comparant au code
     Apps Script réel écrit côté Sinistria-Site, corrigé.
- Testé de bout en bout (curl) : 401 sans clé/mauvaise clé, 400 sur champ
  manquant/enum invalide/correctif commercial hors catégorie autorisée,
  200 avec un des exemples officiels FMSAR 2023 (résultat exact : 73 100
  DH) et forme de réponse à plat vérifiée, ligne bien créée en base avec
  `created_by = null` et `reference_dossier_externe` renseigné.

## Sprint 5 — déploiement production

- `GET /api/health` — endpoint public (sans authentification), renvoie
  `{ "status": "ok" }`. Sert à vérifier rapidement qu'un déploiement
  répond, avant même de tester `/api/calculer`.
- `.env.local.example` liste les 4 variables requises : URL et clé anon
  Supabase, `SUPABASE_SERVICE_ROLE_KEY`, `VV_API_KEY` — c'est la référence
  exacte à reporter dans Vercel.
- `npm run build` passe sans erreur ni warning bloquant (vérifié).
- Pas de domaine personnalisé dans ce sprint : l'URL `*.vercel.app` par
  défaut suffit pour le premier test réel avec Sinistria-Site. Pas
  d'authentification supplémentaire au-delà de `VV_API_KEY`.

### Déployer sur Vercel — étapes

**1. Pousser le code sur GitHub**

Git n'est pas installé sur cette machine — installez-le d'abord :
[git-scm.com/download/win](https://git-scm.com/download/win) (ou
`winget install Git.Git` dans un terminal). Redémarrez le terminal après
installation, puis :

```bash
git init
git add .
git commit -m "Sinistria-VV — Sprint 1 à 5"
```

Créez ensuite un dépôt vide sur [github.com/new](https://github.com/new)
(sans README/gitignore générés automatiquement), puis :

```bash
git remote add origin https://github.com/<votre-compte>/<nom-du-repo>.git
git branch -M main
git push -u origin main
```

`.gitignore` exclut déjà `.env.local` et `node_modules` — vérifiez que
`git status` avant le commit ne liste aucun de ces deux.

**2. Importer le projet sur Vercel**

1. Sur [vercel.com](https://vercel.com), connectez-vous avec votre compte
   GitHub.
2. **Add New → Project**, sélectionnez le dépôt que vous venez de créer.
   Vercel détecte automatiquement Next.js — ne changez aucun réglage de
   build.
3. Avant de cliquer *Deploy*, ouvrez **Environment Variables** et ajoutez
   les 4 variables de `.env.local` (mêmes noms, mêmes valeurs) :
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `VV_API_KEY`.
4. Cliquez **Deploy**. Vercel donne une URL du type
   `https://<nom-du-projet>.vercel.app`.

**3. Vérifier**

```bash
curl https://<votre-projet>.vercel.app/api/health
# {"status":"ok"}
```

Puis testez `/api/calculer` avec la même requête curl que celle validée
en local (voir section Sprint 4), en remplaçant `localhost:3000` par
l'URL Vercel.

### Redéploiements futurs

Tout `git push` sur la branche `main` redéploie automatiquement — aucune
action manuelle sur Vercel après la configuration initiale.
