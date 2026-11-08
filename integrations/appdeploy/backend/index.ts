import {
  router,
  json,
  error,
  db,
  requireAuth,
  requireAdminEmailAllowlist,
  ai,
} from '@appdeploy/sdk';
import { createHash } from 'node:crypto';
import { accountFor, enrollRenter } from './rentAccess';
import { pricingRoutes } from './rental/pricing';
import { rentalRoutes, loadRequest } from './rental/routes';
import { counterRoutes } from './rental/counter';
import {
  paymentRoutes,
  verifyLivePaymentForAgreement,
} from './rental/payments';
import { CLASSES } from '../shared/rental';
import { marketRoutes, marketCatalog, withAccountPolicy } from './market';
import { operationsRoutes } from './ops/routes';

const ADMIN_EMAILS = ['ceo@rosstaxsoftware.com', 'admin@rosstaxsoftware.com'];
// Both authenticated identities may represent the company in signed rental records.
const OWNER_EMAILS = ADMIN_EMAILS;
const TABLE = 'r_rent_agreements_v1';
const vehicles = [
  {
    id: 'trailblazer',
    name: '2026 Chevrolet Trailblazer',
    trim: 'LT — configuration pending inspection',
    transmission: 'Automatic',
    description:
      'Compact crossover · black interior · representative illustration only',
    asset: '/resources/r-rent-vehicle-hero.jpg',
  },
  {
    id: 'bronco',
    name: '2026 Ford Bronco Sport',
    trim: 'Big Bend',
    transmission: 'Automatic',
    description:
      'Adventure SUV · black interior · representative illustration only',
    asset: '/resources/r-rent-vehicle-hero.jpg',
  },
];
const feeIndex = [
  {
    label: 'Base daily rental',
    rate: 'Actual rate entered in each quote',
    type: 'Rental',
  },
  {
    label: 'Texas gross rental receipts tax',
    rate: '10% for 1–30 days; 6.25% for 31–180 days, subject to exclusions',
    type: 'Statutory',
  },
  {
    label: 'Applicable local rental tax',
    rate: 'Verify by pickup jurisdiction and disclose before acceptance',
    type: 'Statutory',
  },
  {
    label: 'Security deposit / authorization',
    rate: 'Amount disclosed on individual agreement; not a fee if fully refunded',
    type: 'Refundable hold',
  },
  {
    label: 'Optional damage waiver',
    rate: 'Must be separately offered, priced, disclosed, and signed',
    type: 'Optional',
  },
  {
    label: 'Additional driver',
    rate: 'Published price index and accepted written quote control',
    type: 'Optional',
  },
  {
    label: 'Late return / rental extension',
    rate: 'As specified in signed quote, subject to applicable law',
    type: 'Conditional',
  },
  {
    label: 'Excess mileage, fuel, tolls and violations',
    rate: 'Only when applicable, with pricing and supporting records',
    type: 'Conditional',
  },
  {
    label: 'Excess cleaning / smoking remediation',
    rate: 'Itemized actual charges only if disclosed and substantiated',
    type: 'Conditional',
  },
  {
    label: 'Lost key or documented physical damage',
    rate: 'Documented actual cost under agreed liability provisions',
    type: 'Conditional',
  },
];
const contractSections = [
  {
    heading: '1. Parties and vehicle',
    body: 'This Rental Agreement is between Ross Tax Pro Software Company, operating through its R-Rent Vehicle Rental Division (Company), and the identified renter. The individual transaction schedule identifies the vehicle, authorized drivers, pickup and return location, rental period, mileage terms, and charges. This template is not an executed rental agreement until its transaction schedule is complete and both parties have affirmatively signed.',
  },
  {
    heading: '2. Eligibility and authorized operation',
    body: 'Only Company-approved, properly licensed and insured drivers may operate the vehicle. Each driver must satisfy applicable age, license, identity and screening criteria, comply with traffic law, and use the vehicle with reasonable care. No document-upload acknowledgment establishes DMV authenticity or insurance coverage without independent verification.',
  },
  {
    heading: '3. Charges, taxes and payment',
    body: 'The transaction schedule controls the agreed daily rate and rental period. All mandatory charges must be prominently and separately shown on the face of the agreement and in advertising or price quotes as required by Texas Business & Commerce Code §91.055. Optional services require affirmative choice. The stated amount is a preliminary estimate unless all applicable state and local taxes, fees and payment terms have been confirmed. Authorizations, captured payments, refunds and deposits must be supported by payment-provider evidence.',
  },
  {
    heading: '4. Vehicle condition and return',
    body: 'The renter and Company will complete a condition and odometer inspection at release and return, with date-stamped photographs where permitted. The renter must return the vehicle at the agreed time and location with all keys, equipment and supplied documents. Changes to dates, driver, vehicle or price require an agreed written amendment.',
  },
  {
    heading: '5. Insurance, claims and prohibited uses',
    body: 'Prior to release, Company must independently confirm applicable commercial rental fleet coverage and any required renter-provided policy eligibility, including territorial, driver and rental vehicle restrictions. Submission of an insurance card or declarations page is not an insurer guarantee. The renter must promptly report collision, theft, injuries or loss to Company and appropriate authorities, and cooperate with legitimate claims handling. No clause waives a right that may not lawfully be waived.',
  },
  {
    heading: '6. Optional damage waiver',
    body: 'A damage waiver is OPTIONAL and is not insurance. No waiver is purchased by default; a waiver may be sold only when the renter agrees in writing at or before agreement execution. The statutorily required Texas Chapter 91 notice must be separately delivered. Exclusions and waivers are governed by Texas Business & Commerce Code Chapter 91, including §§91.051–91.057. When applicable, unused waiver charges must be refunded as required by §91.057.',
  },
  {
    heading: '7. Cancellation, extension and disputes',
    body: 'Cancellation and refund conditions, deadlines, authorized extensions, late-return charges, deposit release, evidence retention and complaint channels must be shown to the renter before acceptance. Disputed assessments are reviewed using documented records. The Company shall not charge unquoted mandatory fees or assert an unverified damage or fraud finding as final.',
  },
  {
    heading: '8. Privacy and electronic contracting',
    body: 'Electronic records, signatures, timestamps and contract integrity evidence are collected only for legitimate rental contracting and compliance. Each signer must consent to transact electronically and have an opportunity to download or print the record. The signing event must be attributable to an authenticated signer, retained, and logically associated with the unchanged agreement version. Texas Business & Commerce Code Chapter 322 applies. Unredacted license and insurance images must not be transmitted in ordinary emails.',
  },
  {
    heading: '9. Execution and precedence',
    body: 'By individually signing, each party agrees to the completed transaction schedule and attached signed addenda. Unsigned optional addenda are not elected. If the transaction schedule conflicts with a generic clause, the parties must resolve the conflict and execute a corrected version. R-Rent corporate seals, labels, or an AI-generated review do not replace company approval, lawful insurance, or electronic signature evidence.',
  },
];
const waiverNotice =
  'NOTICE: Your rental agreement offers, for an additional charge, an optional waiver to cover all or a part of your responsibility for damage to or loss of the vehicle. Before deciding whether to purchase the waiver, you may wish to determine whether your own automobile insurance or credit card agreement provides you coverage for rental vehicle damage or loss and determine the amount of the deductible under your own insurance coverage. The purchase of the waiver is not mandatory. The waiver is not insurance.';
const addenda = [
  {
    id: 'drivers',
    name: 'Authorized Additional Driver Addendum',
    description: 'Names and verification of each additional driver',
  },
  {
    id: 'pickup',
    name: 'Vehicle Inspection and Release Checklist',
    description: 'Dated pickup condition, fuel and mileage records',
  },
  {
    id: 'return',
    name: 'Vehicle Return and Damage Report',
    description: 'Dated return condition and disputed-charge evidence',
  },
  {
    id: 'extension',
    name: 'Rental Extension and Rate Amendment',
    description: 'Revised dates, rates, and separately stated fees',
  },
  {
    id: 'insurance',
    name: 'Insurance and Coverage Verification',
    description: 'Company and renter policies, exclusions, and proof review',
  },
  {
    id: 'damagewaiver',
    name: 'Optional Damage Waiver Election',
    description: 'Separate optional notice and separate signed election',
  },
  {
    id: 'payments',
    name: 'Security Deposit and Payment Authorization',
    description: 'Provider evidence, hold/capture, refunds and release rules',
  },
  {
    id: 'tolls',
    name: 'Mileage, Fuel, Tolls and Cleaning Schedule',
    description: 'Condition-dependent charges disclosed before contract',
  },
  {
    id: 'privacy',
    name: 'Electronic Consent and Privacy Disclosure',
    description: 'Signer consent and electronic delivery acknowledgments',
  },
];
const normalize = (s: unknown) =>
  String(s || '')
    .trim()
    .toLowerCase();
const isOwner = (email: unknown) => OWNER_EMAILS.includes(normalize(email));
const daysBetween = (start: string, end: string) =>
  Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
const hash = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
const allow = (a: any, u: any) =>
  isOwner(u?.email) ||
  (typeof a.renterId === 'string' && a.renterId === u?.userId) ||
  (a.agreementKind === 'EXISTING_RENTAL_ADDENDUM' &&
    a.status !== 'DRAFT' && !!normalize(u?.email) &&
    normalize(a.renterEmail) === normalize(u?.email));
const cents = (n: unknown) => Math.round(Number(n) * 100) / 100;
const stableSummary = (a: any) => ({
  schemaVersion: 1,
  company: 'Ross Tax Pro Software Company — R-Rent',
  renterName: a.renterName,
  renterEmail: a.renterEmail,
  ...(a.renterId ? { renterId: a.renterId } : {}),
  vehicleId: a.vehicleId,
  starts: a.starts,
  ends: a.ends,
  dailyRate: a.dailyRate,
  days: a.days,
  estimatedBase: a.estimatedBase,
  stateTax: a.stateTax,
  deposit: a.deposit,
  selectedAddenda: a.selectedAddenda,
  ...(a.agreementKind === 'EXISTING_RENTAL_ADDENDUM' ? {
    agreementKind: a.agreementKind,
    originalAgreementRef: a.originalAgreementRef,
    odometerMiles: a.odometerMiles,
    exteriorColor: a.exteriorColor,
    interiorColor: a.interiorColor,
    proposedInsuranceDaily: a.proposedInsuranceDaily,
    insuranceElection: a.insuranceElection,
    adminFee: a.adminFee,
  } : {}),
  clauses: contractSections,
  waiverNotice,
  approval: 'Pending independent verification',
  ...(a.schemaVersion === 2
    ? {
        quotedFees: a.quotedFees,
        quoteNotes: a.quoteNotes,
        rentalRequestId: a.rentalRequestId,
        paymentTerms: a.paymentTerms,
      }
    : {}),
});
const getDoc = async (id: string) => {
  const [record] = await db.get<any>(TABLE, [id]);
  return record ? { ...record, id } : null;
};
export const handler = router({
  ...operationsRoutes,
  ...withAccountPolicy({
  ...marketRoutes,
  ...rentalRoutes,
  ...counterRoutes,
  ...pricingRoutes,
  ...paymentRoutes,
  'GET /api/_healthcheck': [
    async () =>
      json({ ok: true, product: 'R-Rent', time: new Date().toISOString() }),
  ],
  'GET /api/account': [
    requireAuth(),
    async ({ user }) => json(await accountFor(user!)),
  ],
  'POST /api/account/register': [
    requireAuth(),
    async ({ user, body }) => {
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'acceptedTerms')) return error('Only the account acknowledgment may be submitted. Roles and identity come from the server.', 400);
      try {
        return json(
          await enrollRenter(user!, (body as any)?.acceptedTerms === true),
        );
      } catch (e: any) {
        return error(e.message || 'Enrollment failed', 400);
      }
    },
  ],
  'GET /api/catalog': [
    async () =>
      json({
        vehicles: (await marketCatalog()).listings.map(item => ({ id: item.id, name: item.name, trim: item.trim, transmission: 'Automatic (reported)', description: item.headline, asset: item.illustrativePhoto, rateCents: item.rateCents })),
        feeIndex,
        addenda,
        waiverNotice,
        contractSections,
        brand: {
          colors: ['#0C1D34', '#631E27', '#BF9B56', '#F5F0E8', '#D9D9D9'],
          canvaMediaIds: ['MAHXYV7EYmo', 'MAHXYanibeM', 'MAHXYcbl-L0'],
        },
      }),
  ],
  'GET /api/agreements': [
    requireAuth(),
    async ({ user }) => {
      const page = await db.list<any>(TABLE, { limit: 100 });
      return json({
        items: page.items
          .filter((a) => allow(a, user))
          .map((a) => ({
            id: a.id,
            reference: a.reference,
            renterName: a.renterName,
            renterEmail: a.renterEmail,
            vehicleId: a.vehicleId,
            starts: a.starts,
            ends: a.ends,
            status: a.status,
            ownerSignature: a.ownerSignature,
            renterSignature: a.renterSignature,
            createdAt: a.createdAt,
          })),
      });
    },
  ],
  'POST /api/agreements': [
    requireAuth(),
    requireAdminEmailAllowlist(OWNER_EMAILS),
    async ({ body, user }) => {
      let b = (body || {}) as any;
      let request: any = null;
      if (b.rentalRequestId) {
        try {
          request = await loadRequest(String(b.rentalRequestId), user!);
        } catch {
          return error('Rental request not found.', 404);
        }
        if (
          request.status !== 'ACCEPTED_PENDING_REVIEW' ||
          request.conflict ||
          !request.quote
        )
          return error(
            'Accept a current quote before creating its agreement.',
            409,
          );
        if (request.agreementId)
          return error('This request already has a linked agreement.', 409);
        const paymentRecords = await db.list<any>(
          'r_rent_payment_sessions_v1:' + request.id,
          { limit: 1 },
        );
        if (paymentRecords.items.length)
          return error(
            'Reconcile existing payment sessions before creating another agreement.',
            409,
          );
        b = {
          rentalRequestId: request.id,
          renterName: request.renterName,
          renterEmail: request.renterEmail,
          vehicleId: CLASSES.find((c) => c.id === request.trip.vehicleClass)
            ?.vehicleId,
          starts: request.trip.pickupAt,
          ends: request.trip.returnAt,
          dailyRate: request.quote.dailyRateCents / 100,
          deposit: request.quote.depositCents / 100,
        };
      }
      const vehicle = vehicles.find((v) => v.id === b.vehicleId);
      const days = daysBetween(String(b.starts || ''), String(b.ends || ''));
      const dailyRate = Number(b.dailyRate);
      const deposit = Number(b.deposit || 0);
      const amendment = b.agreementKind === 'EXISTING_RENTAL_ADDENDUM';
      const originalAgreementRef = String(b.originalAgreementRef || '').trim();
      const proposedInsuranceDaily = Number(b.proposedInsuranceDaily || 0);
      const adminFee = Number(b.adminFee || 0);
      const odometerMiles = Number(b.odometerMiles || 0);
      if (
        !vehicle ||
        !String(b.renterName || '').trim() ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.renterEmail || '')) ||
        !Number.isFinite(days) ||
        days < 1 ||
        days > 180 ||
        !Number.isFinite(dailyRate) ||
        dailyRate <= 0 ||
        !Number.isFinite(deposit) ||
        deposit < 0 ||
        (amendment && (
          originalAgreementRef.length < 6 || originalAgreementRef.length > 100 ||
          !Number.isSafeInteger(odometerMiles) || odometerMiles < 0 ||
          !Number.isFinite(proposedInsuranceDaily) || proposedInsuranceDaily < 0 ||
          !Number.isFinite(adminFee) || adminFee < 0
        ))
      )
        return error(
          'Supply renter name/email, approved vehicle, 1–180 rental days, a positive daily rate and valid deposit.',
          400,
        );
      const base = cents(days * dailyRate);
      const stateTax = request
        ? request.quote.taxCents / 100
        : cents(base * (days <= 30 ? 0.1 : 0.0625));
      const quotedFees = request ? request.quote.feeCents / 100 : 0;
      const now = new Date().toISOString();
      const reference =
        'RR-' +
        now.replace(/[-:.TZ]/g, '').slice(0, 14) +
        '-' +
        Math.floor(Math.random() * 900 + 100);
      const record: any = {
        reference,
        ...(amendment ? {
          agreementKind: 'EXISTING_RENTAL_ADDENDUM',
          originalAgreementRef,
          odometerMiles,
          exteriorColor: String(b.exteriorColor || '').slice(0,40),
          interiorColor: String(b.interiorColor || '').slice(0,40),
          proposedInsuranceDaily: cents(proposedInsuranceDaily),
          insuranceElection: 'NOT_ELECTED_PENDING_VERIFICATION',
          adminFee: cents(adminFee),
          schemaVersion: 3,
        } : {}),
        ...(request
          ? {
              schemaVersion: 2,
              rentalRequestId: request.id,
              quotedFees,
              quoteNotes: request.quote.notes,
              paymentTerms:
                'Rental charges and refundable deposit authorizations are separate. A deposit is an authorization hold, subject to processor expiration. Capture requires documented charges under this agreement. Uncaptured holds are released through the processor; refunds of captured payments require a separate refund. Actual bank availability is determined by the processor and issuer. Payment does not authorize vehicle release.',
            }
          : {}),
        ownerId: user!.userId,
        ...(request ? { renterId: request.renterId } : {}),
        renterName: String(b.renterName).trim(),
        renterEmail: normalize(b.renterEmail),
        vehicleId: vehicle.id,
        starts: String(b.starts),
        ends: String(b.ends),
        dailyRate,
        days,
        estimatedBase: base,
        stateTax,
        deposit,
        estimatedTotal: cents(base + stateTax + quotedFees + deposit),
        selectedAddenda: [
          'pickup',
          'return',
          'insurance',
          'payments',
          'privacy',
          ...(amendment ? ['extension'] : []),
        ],
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        verification: {
          license: false,
          insurance: false,
          payment: false,
          localTax: false,
          companyCoverage: false,
        },
        evidence: [],
        events: [{ action: 'created', by: user!.userId, at: now }],
        ownerSignature: null,
        renterSignature: null,
        waiverElection: 'DECLINED',
        localTaxNotice:
          'Local tax not yet verified; final quote requires manual review',
      };
      record.contentHash = hash(stableSummary(record));
      const [id] = await db.add(TABLE, [record]);
      if (!id) return error('Unable to save agreement.', 500);
      return json({ id, reference, contentHash: record.contentHash });
    },
  ],
  'GET /api/agreements/:id': [
    requireAuth(),
    async ({ params, user }) => {
      const doc = await getDoc(params.id);
      if (!doc) return error('Agreement not found.', 404);
      if (!allow(doc, user))
        return error('Not authorized for this agreement.', 403);
      return json({
        agreement: doc,
        contractSections,
        waiverNotice,
        addenda,
        feeIndex,
      });
    },
  ],
  'POST /api/agreements/:id/request': [
    requireAuth(),
    requireAdminEmailAllowlist(OWNER_EMAILS),
    async ({ params, user }) => {
      const a = await getDoc(params.id);
      if (!a) return error('Not found', 404);
      if (a.status !== 'DRAFT') return error('Only drafts may be issued.', 409);
      if (!a.renterId && a.agreementKind !== 'EXISTING_RENTAL_ADDENDUM')
        return error('Create this agreement from an authenticated rental request to bind its signer account. Email-only legacy drafts cannot be issued.', 409);
      const now = new Date().toISOString();
      const { id, ...saved } = a;
      saved.status = 'AWAITING_RENTER_SIGNATURE';
      saved.sentAt = now;
      saved.updatedAt = now;
      saved.events = [
        ...saved.events,
        {
          action: 'signature_request_issued',
          at: now,
          by: user!.userId,
          method: 'manual_secure_link',
        },
      ];
      const [ok] = await db.update(TABLE, [{ id, record: saved }]);
      if (!ok) return error('Unable to issue request', 500);
      return json({
        status: saved.status,
        id,
        method: 'copy link; no email transmission connected',
      });
    },
  ],
  'POST /api/agreements/:id/sign': [
    requireAuth(),
    async ({ params, body, user, event }) => {
      const a = await getDoc(params.id);
      if (!a) return error('Not found', 404);
      if (!allow(a, user)) return error('Not authorized', 403);
      const b = (body || {}) as any;
      const owner = isOwner(user!.email);
      if (a.status === 'DRAFT')
        return error('Owner must issue the agreement first.', 409);
      if (a.status === 'COMPLETED')
        return error('Already signed by both parties.', 409);
      if (
        !b.electronicConsent ||
        !b.intentToSign ||
        !b.printableAcknowledgment ||
        !String(b.typedName || '').trim()
      )
        return error(
          'Electronic consent, record-access acknowledgment, signature intent and full typed name are required.',
          400,
        );
      const pngData = String(b.signaturePng || '');
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(pngData) || pngData.length > 125000 || pngData.length < 300)
        return error('Draw a signature in the signing pad. PNG format is required.', 400);
      const signatureBytes = Buffer.from(pngData.slice('data:image/png;base64,'.length), 'base64');
      if (signatureBytes.length > 95000 || signatureBytes.length < 120 ||
          signatureBytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a')
        return error('Invalid or oversized signature image.', 400);
      const legalName = owner
        ? normalize(user!.email) === 'admin@rosstaxsoftware.com'
          ? 'Condre Ross'
          : 'Condre Dvon Ross'
        : a.renterName;
      if (normalize(b.typedName) !== normalize(legalName))
        return error('Typed name must match the named signer.', 400);
      if (owner && !a.renterSignature)
        return error('Renter must sign before the owner countersigns.', 409);
      if (owner && a.rentalRequestId) {
        try {
          a.verification.payment = await verifyLivePaymentForAgreement(
            a,
            user!,
          );
        } catch {
          return error(
            'Live payment evidence could not be verified. Refresh payment status and retry.',
            409,
          );
        }
      }
      if (
        owner &&
        (!a.verification ||
          [
            'license',
            'insurance',
            'payment',
            'localTax',
            'companyCoverage',
          ].some((key) => a.verification[key] !== true))
      )
        return error(
          'Owner countersignature blocked: independent driver, insurance, payment, local tax and commercial fleet verification must be completed before execution.',
          409,
        );
      if (owner && a.ownerSignature)
        return error('Owner has already signed.', 409);
      if (!owner && a.renterSignature)
        return error('Renter has already signed.', 409);
      if (hash(stableSummary(a)) !== a.contentHash)
        return error('Document integrity check failed.', 409);
      const at = new Date().toISOString();
      const proof = {
        typedName: legalName,
        email: normalize(user!.email),
        userId: user!.userId,
        at,
        method: 'authenticated-drawn-and-typed-e-sign',
        representativeTitle: owner
          ? normalize(user!.email) === 'admin@rosstaxsoftware.com'
            ? 'Executive Office Manager / Authorized Representative'
            : 'CEO / Authorized Representative'
          : null,
        signaturePng: pngData,
        signatureSha256: createHash('sha256').update(signatureBytes).digest('hex'),
        consent: true,
        documentHash: a.contentHash,
        signerRole: owner ? 'company' : 'renter',
        userAgent: String(event?.headers?.['user-agent'] || '').slice(0, 150),
      };
      const { id, ...saved } = a;
      if (owner) saved.ownerSignature = proof;
      else saved.renterSignature = proof;
      saved.status =
        saved.ownerSignature && saved.renterSignature
          ? 'SIGNED_PENDING_RELEASE_GATES'
          : 'AWAITING_OWNER_SIGNATURE';
      saved.updatedAt = at;
      saved.events = [
        ...saved.events,
        {
          action: 'electronic_signature',
          at,
          role: proof.signerRole,
          userId: proof.userId,
          documentHash: a.contentHash,
        },
      ];
      const [ok] = await db.update(TABLE, [{ id, record: saved }]);
      if (!ok) return error('Signature persistence failed', 500);
      return json({
        signerRole: proof.signerRole,
        at,
        status: saved.status,
        documentHash: a.contentHash,
      });
    },
  ],
  'POST /api/agreements/:id/evidence': [
    requireAuth(),
    requireAdminEmailAllowlist(OWNER_EMAILS),
    async ({ params, body, user }) => {
      const a = await getDoc(params.id);
      if (!a) return error('Agreement not found.', 404);
      if (a.ownerSignature)
        return error('Executed agreements cannot be altered.', 409);
      const b = body as any;
      if (
        !(['license', 'insurance', 'localTax', 'companyCoverage'].includes(b?.category) ||
          (a.agreementKind === 'EXISTING_RENTAL_ADDENDUM' && b?.category === 'payment')) ||
        b.reviewed !== true ||
        typeof b.evidenceReference !== 'string' ||
        b.evidenceReference.trim().length < 8 ||
        b.evidenceReference.length > 1000
      )
        return error(
          'Category, reviewer attestation and evidence reference are required. Do not submit raw license or policy numbers.',
          400,
        );
      const evidence = {
        category: b.category,
        reference: b.evidenceReference.trim(),
        method: 'staff_document_review',
        by: user!.userId,
        at: new Date().toISOString(),
      };
      const { id, ...record } = a;
      record.verification = { ...record.verification, [b.category]: true };
      record.evidence = [...(record.evidence || []), evidence];
      record.events = [
        ...(record.events || []),
        {
          action: 'staff_evidence_review',
          category: b.category,
          by: user!.userId,
          at: evidence.at,
        },
      ];
      record.updatedAt = evidence.at;
      const [ok] = await db.update(TABLE, [{ id, record }]);
      if (!ok) return error('Evidence record could not be saved.', 500);
      return json({
        recorded: true,
        category: b.category,
        method: evidence.method,
      });
    },
  ],
  'POST /api/agreements/:id/assist': [
    requireAuth(),
    async ({ params, user }) => {
      const a = await getDoc(params.id);
      if (!a) return error('Not found', 404);
      if (!allow(a, user)) return error('Not authorized', 403);
      const flags = [
        'license',
        'insurance',
        'payment',
        'localTax',
        'companyCoverage',
      ].filter((k) => !a.verification[k]);
      const risk = {
        signatureState: a.status,
        missingVerification: flags,
        optionalWaiver: a.waiverElection,
        days: a.days,
        localTaxPending: !a.verification.localTax,
      };
      try {
        const response = await ai.generate({
          system:
            'You are R-Rent pre-sign compliance assist. Use only supplied flags. Do not claim verification, legal approval, processed payment, binding execution, or insurance validity. Do not invent renter identity. Output a short numbered checklist and prioritize blockers. Avoid asking for unredacted IDs or card numbers.',
          prompt:
            'Assess this transaction readiness without personal data: ' +
            JSON.stringify(risk),
          maxTokens: 350,
          thinkingMode: 'FAST',
        });
        return json({
          analysis: response.text,
          flags,
          automatedDecision: 'HUMAN_REVIEW_REQUIRED',
        });
      } catch (e) {
        return json({
          analysis:
            'Pre-sign checks: ' +
            (flags.length
              ? flags.join(', ') + ' require verified evidence.'
              : 'Owner must still inspect the completed record and authorise release.') +
            ' AI service unavailable; rules remain active.',
          flags,
          automatedDecision: 'HUMAN_REVIEW_REQUIRED',
        });
      }
    },
  ],
  }),
});
