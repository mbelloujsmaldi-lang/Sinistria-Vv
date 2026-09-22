-- ============================================================
-- Sinistria-VV — 0017 : limitation de débit sur /verifier/[reference]
-- (Sprint 21, rapport d'audit Sprint 20 point #3)
--
-- /verifier est public par conception (QR code de la fiche PDF, aucune
-- session) et les références sont séquentielles (VV-000001, VV-000002...,
-- migration 0007) : sans limite, un balayage systématique révèle marque,
-- immatriculation masquée, valeur définitive et identité du validateur de
-- tous les dossiers validés.
--
-- Contrairement à vv_api_calls (0006, un seul appelant serveur-à-serveur)
-- et journal_audit_connexion_calls (0014, employés en nombre réduit), cette
-- page reçoit un trafic public légitime et simultané (chaque client scanne
-- SA propre fiche) : un compteur global bloquerait des utilisateurs
-- innocents à cause du trafic des autres. La limite est donc PAR IP —
-- seule variante de ce mécanisme dans le projet à avoir cette colonne.
--
-- Accès service_role uniquement (route publique, pas de session), même
-- principe que les tables de débit précédentes.
-- ============================================================

create table verifier_rate_calls (
  id bigint generated always as identity primary key,
  ip text not null,
  called_at timestamptz not null default now()
);

create index verifier_rate_calls_ip_called_at on verifier_rate_calls (ip, called_at);

alter table verifier_rate_calls enable row level security;
