import { db, storage, json, error, requireAuth, requireAdminEmailAllowlist } from '@appdeploy/sdk';
import type { RouterRoutes } from '@appdeploy/sdk';
import { createHash } from 'node:crypto';
import { ADMIN_EMAILS } from '../../shared/rental';
import { verifyLivePaymentForAgreement } from './payments';

const CASES = 'r_rent_counter_v1';
const INSPECTIONS = 'r_rent_counter_inspections_v1';
const DOCS = 'r_rent_agreements_v1';
const isId = (s: unknown): s is string => typeof s === 'string' && /^[a-zA-Z0-9_-]{6,100}$/.test(s);
const digest = (s: unknown) => createHash('sha256').update(JSON.stringify(s)).digest('hex');
const ZONES = ['front','rear','driver','passenger','roof','wheels','glass','interior','keys'];
const bad = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
const guarded = (fn: (ctx: any) => Promise<any>) => async (ctx: any) => {
  try { return await fn(ctx); }
  catch (e: any) {
    if (e?.status >= 400 && e.status < 500) return error(e.message, e.status);
    if (e?.name === 'AppDatabaseQuotaExceeded' || e?.statusCode === 429) return error('Storage rate limit.', 429);
    console.error('Rental counter operation error', e?.name || 'Unknown');
    return error('Rental counter unavailable. No rental was activated.', 503);
  }
};
async function findDoc(id: string) {
  const [record] = await db.get<any>(DOCS, [id], { consistent: true });
  return record ? { ...record, id } : null;
}
async function findCase(id: string) {
  if (!isId(id)) return null;
  const [record] = await db.get<any>(CASES, [id], { consistent: true });
  return record ? { ...record, id } : null;
}
async function findInspection(id: string | null) {
  if (!id) return null;
  const [record] = await db.get<any>(INSPECTIONS, [id], { consistent: true });
  return record;
}
const summary = (r: any) => ({
  id: r.id, agreementId: r.agreementId, reference: r.reference,
  renterName: r.renterName, renterEmail: r.renterEmail, vehicleId: r.vehicleId,
  agreementHash: r.agreementHash, existingRental: r.existingRental,
  originalReference: r.originalReference, latestInspectionId: r.latestInspectionId,
  assignedAt: r.assignedAt, released: false,
});
export const counterRoutes: RouterRoutes = {
  'GET /api/rental/counter': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async () => {
      const page = await db.list<any>(CASES, { limit: 40 });
      return json({ items: page.items.map(summary), hasMore: !!page.nextToken });
    }),
  ],
  'POST /api/rental/counter': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async ({ body, user }) => {
      const b = body as any;
      if (!b || !isId(b.agreementId) || Object.keys(b).some(k => k !== 'agreementId'))
        bad('Select a known agreement, not user-entered customer identity.');
      const doc = await findDoc(b.agreementId);
      if (!doc || !['bronco','trailblazer'].includes(doc.vehicleId)) bad('Agreement or vehicle not found.', 404);
      if (!doc.renterName || !doc.renterEmail || !doc.contentHash) bad('Complete exact agreement identity and version.', 409);
      const old = await findCase(doc.id);
      if (old) return json({ ...summary(old), reused: true });
      const r = {
        id: doc.id, agreementId: doc.id, reference: doc.reference,
        renterName: doc.renterName, renterEmail: doc.renterEmail,
        vehicleId: doc.vehicleId, agreementHash: doc.contentHash,
        existingRental: doc.agreementKind === 'EXISTING_RENTAL_ADDENDUM',
        originalReference: doc.originalAgreementRef || null,
        latestInspectionId: null, assignedAt: new Date().toISOString(),
        assignedBy: user!.userId, released: false,
      };
      const [ok] = await db.tx.add(CASES, [r]);
      if (!ok) bad('A counter record already exists. Refresh before retrying.', 409);
      return json({ ...summary(r), created: true }, 201);
    }),
  ],
  'GET /api/rental/counter/:id': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async ({ params }) => {
      const r = await findCase(params.id);
      if (!r) bad('Counter record not found.', 404);
      const inspection = await findInspection(r.latestInspectionId);
      return json({
        ...summary(r),
        inspection: inspection ? {
          id: inspection.id, at: inspection.at, vin: inspection.vin,
          odometer: inspection.odometer, fuelEighths: inspection.fuelEighths,
          zones: inspection.zones, notes: inspection.notes, safe: inspection.safe,
          photo: !!inspection.photoPath, hash: inspection.hash,
        } : null,
      });
    }),
  ],
  'POST /api/rental/counter/:id/inspection': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async ({ params, body, user }) => {
      const r = await findCase(params.id);
      if (!r) bad('Counter record not found.', 404);
      const a = await findDoc(r.agreementId);
      if (!a || r.agreementHash !== a.contentHash) bad('Agreement changed; reconcile it before inspection.', 409);
      const b = body as any;
      if (!b || !isId(b.requestId) || b.confirmed !== true ||
          !/^[A-HJ-NPR-Z0-9]{17}$/.test(String(b.vin || '').toUpperCase()) ||
          !Number.isSafeInteger(b.odometer) || b.odometer < 0 || b.odometer > 2000000 ||
          !Number.isSafeInteger(b.fuelEighths) || b.fuelEighths < 0 || b.fuelEighths > 8 ||
          !Array.isArray(b.zones) || b.zones.length > 9 ||
          new Set(b.zones).size !== b.zones.length ||
          b.zones.some((s: any) => !ZONES.includes(s)) ||
          typeof b.notes !== 'string' || b.notes.length > 1600 ||
          typeof b.safe !== 'boolean')
        bad('VIN, mileage, fuel, condition, safety and inspection confirmation are required.');
      if (b.zones.length && b.notes.trim().length < 8) bad('Describe the observed damage.', 400);
      const picture = b.photoDataUrl || null;
      if (picture && (typeof picture !== 'string' || picture.length > 260000 ||
          !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(picture)))
        bad('Photo must be a JPEG/PNG smaller than 190 KB.');
      const bytes = picture ? Buffer.from(picture.split(',')[1], 'base64') : null;
      if (bytes && (bytes.length > 190000 || bytes.length < 80 ||
          !(bytes.subarray(0,8).toString('hex') === '89504e470d0a1a0a' || (bytes[0] === 255 && bytes[1] === 216))))
        bad('Invalid or oversized inspection photo.');
      const entry: any = {
        id: b.requestId, caseId: r.id, agreementHash: a.contentHash,
        vin: String(b.vin).toUpperCase(), odometer: b.odometer,
        fuelEighths: b.fuelEighths, zones: b.zones, notes: b.notes.trim(),
        safe: b.safe, at: new Date().toISOString(), reviewedBy: user!.userId,
        photoPath: bytes ? 'private/rent-counter/' + r.id + '/' + b.requestId +
          (picture.startsWith('data:image/png') ? '.png' : '.jpg') : null,
        photoHash: bytes ? createHash('sha256').update(bytes).digest('hex') : null,
      };
      entry.hash = digest({
        caseId: entry.caseId, agreementHash: entry.agreementHash,
        vin: entry.vin, odometer: entry.odometer, fuelEighths: entry.fuelEighths,
        zones: entry.zones, notes: entry.notes, safe: entry.safe, photoHash: entry.photoHash,
      });
      const [old] = await db.get<any>(INSPECTIONS, [b.requestId], { consistent: true });
      if (old) {
        if (old.caseId !== r.id || old.hash !== entry.hash) bad('Inspection ID already used for different content.', 409);
        return json({ id: old.id, hash: old.hash, replay: true });
      }
      if (bytes && entry.photoPath) {
        const [saved] = await storage.write([{
          path: entry.photoPath, content: bytes.toString('base64'),
          contentType: picture.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        }]);
        if (!saved) bad('Photo storage failed. Inspection was not saved.', 503);
      }
      await db.transact([
        db.tx.add(INSPECTIONS, [entry]),
        db.tx.update(CASES, [{ id: r.id, record: { latestInspectionId: entry.id },
          if: { latestInspectionId: r.latestInspectionId } }], { patch: true }),
      ]);
      return json({ id: entry.id, hash: entry.hash, at: entry.at });
    }),
  ],
  'GET /api/rental/counter/:id/photo': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async ({ params }) => {
      const r = await findCase(params.id);
      if (!r) bad('Counter record not found.', 404);
      const inspection = await findInspection(r.latestInspectionId);
      if (!inspection?.photoPath) bad('No secure photo available.', 404);
      const [signed] = await storage.url([inspection.photoPath]);
      if (!signed?.url) bad('Secure photo temporarily unavailable.', 503);
      return json({ url: signed.url, hash: inspection.photoHash });
    }),
  ],
  'GET /api/rental/counter/:id/readiness': [
    requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS),
    guarded(async ({ params, user }) => {
      const r = await findCase(params.id);
      if (!r) bad('Counter record not found.', 404);
      const a = await findDoc(r.agreementId);
      const report = await findInspection(r.latestInspectionId);
      const exact = !!a && r.agreementHash === a.contentHash;
      const checks = {
        agreementUnchanged: exact,
        assignedVehicleAndRenter: !!a && r.renterName === a.renterName && r.renterEmail === a.renterEmail && r.vehicleId === a.vehicleId,
        physicalInspection: !!report && report.agreementHash === a?.contentHash,
        noUnresolvedDamage: !!report && report.zones.length === 0,
        vehicleSafe: !!report && report.safe === true,
        renterSigned: !!a && a.renterSignature?.documentHash === a.contentHash,
        companySigned: !!a && a.ownerSignature?.documentHash === a.contentHash,
        identityAndLicense: a?.verification?.license === true,
        renterInsurance: a?.verification?.insurance === true,
        companyFleetCoverage: a?.verification?.companyCoverage === true,
        taxesReviewed: a?.verification?.localTax === true,
        paymentLiveVerified: false,
        fleetAllocationVerified: false,
      };
      let payment = 'UNVERIFIED';
      if (a?.rentalRequestId && checks.renterSigned && checks.companySigned) {
        try {
          checks.paymentLiveVerified = await verifyLivePaymentForAgreement(a, user!);
          payment = checks.paymentLiveVerified ? 'LIVE_STRIPE_VERIFIED' : 'PAYMENT_NOT_CONFIRMED';
        } catch { payment = 'LIVE_STRIPE_UNAVAILABLE'; }
      }
      return json({
        checks, payment,
        outstanding: Object.entries(checks).filter(([,value])=>!value).map(([key])=>key),
        activation: r.existingRental ? 'ORIGINAL_ACTIVE_RENTAL_NOT_RESTARTED' : 'PENDING_OPERATIONS_DISPATCH',
        mayActivateFromCounter: false,
        note: 'Activation requires separate authenticated operations dispatch, actual fleet allocation, approved commercial coverage, verified payment, and any required MFA.',
      });
    }),
  ],
};
