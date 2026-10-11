-- R-Rent first-party electronic signing ledger, release gate 2026-10-10.
-- NOT APPLIED: dedicated verified R-Rent Supabase project required.
-- Not legally operative until consent revision, final PDF renderer, encrypted storage,
-- customer/company deliveries, staff authorization and legal review are independently approved.
create extension if not exists pgcrypto;

create table if not exists public.inhouse_envelopes(
 id uuid primary key default gen_random_uuid(),
 tenant text not null,
 application_id uuid,
 status text not null default 'DRAFT' check(status in('DRAFT','APPROVED','ISSUED','VIEWED','PARTIALLY_SIGNED','SIGNED_PENDING_ARTIFACT','COMPLETED','DECLINED','VOID','EXPIRED')),
 document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
 disclosure_revision text not null,
 disclosure_sha256 text not null check(disclosure_sha256 ~ '^[a-f0-9]{64}$'),
 private_pdf_object_key text not null,
 approved_contract boolean not null default false,
 approved_by uuid,
 artifact_finalizer_ready boolean not null default false,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (not approved_contract or approved_by is not null),
 check (status not in('ISSUED','VIEWED','PARTIALLY_SIGNED','SIGNED_PENDING_ARTIFACT','COMPLETED') or
        (approved_contract and approved_by is not null and private_pdf_object_key <> ''))
);
create index if not exists rr_inhouse_envelopes_tenant_idx on public.inhouse_envelopes(tenant,created_at desc);

create table if not exists public.inhouse_signers(
 envelope_id uuid not null references public.inhouse_envelopes(id),
 user_id uuid not null,
 tenant text not null,
 identity_verified boolean not null default false,
 verified_method text,
 verified_at timestamptz,
 active boolean not null default false,
 status text not null default 'INVITED' check(status in('INVITED','VIEWED','SIGNED','DECLINED','VOID')),
 signed_at timestamptz,
 primary key(envelope_id,user_id),
 check(not identity_verified or (verified_method is not null and verified_at is not null)),
 check(status<>'SIGNED' or signed_at is not null)
);
create index if not exists rr_inhouse_signers_user_idx on public.inhouse_signers(tenant,user_id) where active=true;

create table if not exists public.inhouse_signature_events(
 id uuid primary key,
 envelope_id uuid not null references public.inhouse_envelopes(id),
 user_id uuid not null,
 tenant text not null,
 document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
 consent_sha256 text not null check(consent_sha256 ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid not null,
 signature_sha256 text not null check(signature_sha256 ~ '^[a-f0-9]{64}$'),
 consent_hash text not null check(consent_hash ~ '^[a-f0-9]{64}$'),
 event_hmac text not null check(event_hmac ~ '^[a-f0-9]{64}$'),
 encrypted_payload jsonb not null,
 server_recorded_at timestamptz not null default clock_timestamp(),
 inserted_at timestamptz not null default clock_timestamp(),
 unique(tenant,envelope_id,user_id,idempotency_key),
 unique(tenant,envelope_id,user_id),
 foreign key(envelope_id,user_id) references public.inhouse_signers(envelope_id,user_id),
 check(encrypted_payload->>'alg'='A256GCM'
   and encrypted_payload ? 'kid' and encrypted_payload ? 'iv'
   and encrypted_payload ? 'ct' and encrypted_payload ? 'tag')
);

create table if not exists public.inhouse_signed_artifacts(
 envelope_id uuid primary key references public.inhouse_envelopes(id),
 tenant text not null,
 final_pdf_object_key text not null,
 final_pdf_sha256 text not null check(final_pdf_sha256 ~ '^[a-f0-9]{64}$'),
 certificate_object_key text not null,
 certificate_sha256 text not null check(certificate_sha256 ~ '^[a-f0-9]{64}$'),
 renter_delivery_receipt_ref text,
 company_delivery_receipt_ref text,
 finalized_at timestamptz,
 created_at timestamptz not null default now()
);

create or replace function public.rr_inhouse_immutable_events()
returns trigger language plpgsql as $$
begin
 raise exception 'signature evidence is append-only';
end; $$;
drop trigger if exists rr_inhouse_event_no_change on public.inhouse_signature_events;
create trigger rr_inhouse_event_no_change before update or delete on public.inhouse_signature_events
for each row execute function public.rr_inhouse_immutable_events();

-- Called ONLY by verified, server-side service role. Signature capture never
-- completes agreement delivery; that requires a separate trusted PDF finalizer.
create or replace function public.rr_record_inhouse_signature(
 p_envelope_id uuid,p_signer_user_id uuid,p_tenant text,
 p_document_sha256 text,p_consent_sha256 text,p_idempotency_key uuid,
 p_event_id uuid,p_event_at timestamptz,p_event_proof text,
 p_signature_sha256 text,p_consent_hash text,p_encrypted_payload jsonb)
returns table(recorded boolean, current_state text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_env public.inhouse_envelopes%rowtype;
        v_signer public.inhouse_signers%rowtype;
        v_remaining int;
begin
 if p_tenant <> 'ross-tax-pro-software-company' or p_event_at is null or
    abs(extract(epoch from (clock_timestamp()-p_event_at)))>120 or
    p_document_sha256 !~ '^[a-f0-9]{64}$' or p_event_proof !~ '^[a-f0-9]{64}$' or
    p_consent_hash !~ '^[a-f0-9]{64}$' or p_signature_sha256 !~ '^[a-f0-9]{64}$' or
    p_encrypted_payload->>'alg'<>'A256GCM' then
   raise exception 'invalid_signature_evidence';
 end if;
 select * into v_env from public.inhouse_envelopes
  where id=p_envelope_id and tenant=p_tenant for update;
 if not found or v_env.status not in('ISSUED','PARTIALLY_SIGNED') or
    v_env.document_sha256<>p_document_sha256 or
    v_env.disclosure_sha256<>p_consent_sha256 or
    v_env.approved_contract<>true or v_env.artifact_finalizer_ready<>true or
    v_env.private_pdf_object_key is null or v_env.expires_at<=clock_timestamp() then
    raise exception 'unavailable_or_changed_envelope';
 end if;
 select * into v_signer from public.inhouse_signers
  where envelope_id=p_envelope_id and user_id=p_signer_user_id and tenant=p_tenant for update;
 if not found or not v_signer.active or not v_signer.identity_verified or
    v_signer.status not in ('INVITED','VIEWED') then
   raise exception 'unverified_signer_or_duplicate_signature';
 end if;
 insert into public.inhouse_signature_events(
   id,envelope_id,user_id,tenant,document_sha256,consent_sha256,idempotency_key,
   signature_sha256,consent_hash,event_hmac,encrypted_payload,server_recorded_at)
 values(p_event_id,p_envelope_id,p_signer_user_id,p_tenant,p_document_sha256,p_consent_sha256,
   p_idempotency_key,p_signature_sha256,p_consent_hash,p_event_proof,p_encrypted_payload,p_event_at);
 update public.inhouse_signers set status='SIGNED',signed_at=clock_timestamp()
 where envelope_id=p_envelope_id and user_id=p_signer_user_id;
 select count(*) into v_remaining from public.inhouse_signers
 where envelope_id=p_envelope_id and active and status<>'SIGNED';
 update public.inhouse_envelopes set
   status=case when v_remaining=0 then 'SIGNED_PENDING_ARTIFACT' else 'PARTIALLY_SIGNED' end,
   updated_at=clock_timestamp()
 where id=p_envelope_id;
 return query select true,case when v_remaining=0 then 'SIGNED_PENDING_ARTIFACT' else 'PARTIALLY_SIGNED' end;
end; $$;

revoke all on function public.rr_record_inhouse_signature(
 uuid,uuid,text,text,text,uuid,uuid,timestamptz,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.rr_record_inhouse_signature(
 uuid,uuid,text,text,text,uuid,uuid,timestamptz,text,text,text,jsonb) to service_role;
alter table public.inhouse_envelopes enable row level security;
alter table public.inhouse_signers enable row level security;
alter table public.inhouse_signature_events enable row level security;
alter table public.inhouse_signed_artifacts enable row level security;
revoke all on public.inhouse_envelopes,public.inhouse_signers,
 public.inhouse_signature_events,public.inhouse_signed_artifacts from anon,authenticated;
-- NEXT SECURITY RELEASE GATE: configure dedicated private Supabase Storage bucket,
-- staff-only envelope creation, signer invite authentication, immutable PDF
-- finalizer/certificate and delivery receipts. No sample renter data seeded.
