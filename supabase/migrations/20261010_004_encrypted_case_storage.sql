-- R-Rent secure-case and envelope privacy migration v0.4.1. NOT APPLIED.
-- A pre-existing environment may have plaintext descriptions and recipient arrays.
-- Inventory those rows, encrypt with vault-managed keys, and review/complete backfill
-- before validating constraints or activating the encrypted features.
alter table public.support_cases
 add column if not exists description_envelope jsonb;
-- Enforce ciphertext for all NEW/UPDATED records without silently modifying historical PII.
alter table public.support_cases
 drop constraint if exists rr_support_description_encrypted;
alter table public.support_cases
 add constraint rr_support_description_encrypted
 check (
  description='[ENCRYPTED DATA — SEE PRIVATE ENVELOPE]'
  and description_envelope is not null
  and description_envelope->>'alg'='A256GCM'
  and description_envelope ? 'kid'
  and description_envelope ? 'ct'
  and description_envelope ? 'tag'
  and description_envelope ? 'iv'
 ) not valid;
-- The prior envelope table contains recipients_json. Its content must now be a sealed AEAD object.
alter table public.envelopes
 drop constraint if exists rr_envelope_recipient_ciphertext;
alter table public.envelopes
 add constraint rr_envelope_recipient_ciphertext check (
  recipients_json is not null
  and jsonb_typeof(recipients_json)='object'
  and recipients_json->>'alg'='A256GCM'
  and recipients_json ? 'kid'
  and recipients_json ? 'ct'
  and recipients_json ? 'iv'
  and recipients_json ? 'tag'
 ) not valid;
-- NEVER log plaintext recipient or case message in inserts, error telemetry, audit or status.
-- No automatic backfill/deletion: encrypted migration needs private keys, legal review,
-- encrypted backup evidence, and a controlled one-way transition plan.
