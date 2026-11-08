import { useEffect, useState } from 'react';
import { api } from '@appdeploy/client';
import {
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Car,
  ClipboardList,
  ShieldCheck,
  RefreshCw,
  Wrench,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  BRANCHES,
  CLASSES,
  GATES,
  STATUS_LABELS,
  money,
} from '../../shared/rental';
import type { Reservation, Trip } from '../../shared/rental';
import { PriceBook, AddOnChoices } from './PriceBook';
import { RentalCounter } from './RentalCounter';
import { EngineeringMap } from './EngineeringMap';
import { OperationsOverview } from '../brand/BrandExperience';
import { PaymentsPanel, SettlementPanel } from './PaymentsPanel';
import './rental.css';

type User = { userId: string; email?: string; name?: string };
type Props = {
  user: User | null;
  signIn: () => void;
  page: 'reserve' | 'trips' | 'operations';
};
const messageOf = (e: any) =>
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  'Unable to complete the request. Please retry.';
function futureLocal(days: number) {
  return (
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + days * 86400000)) + 'T10:00'
  );
}
function newTrip() {
  return {
    addOnCodes: [],
    pickupBranch: 'killeen',
    returnBranch: 'killeen',
    vehicleClass: 'compact_suv',
    pickupLocal: futureLocal(1),
    returnLocal: futureLocal(4),
  };
}
function dollars(s: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(s.trim()))
    throw new Error(
      'Enter dollar amounts with no more than two decimal places.',
    );
  return Math.round(Number(s) * 100);
}
function TripFields({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const set = (key: string, val: string) => onChange({ ...value, [key]: val });
  return (
    <div className="r-form-grid">
      <label>
        <MapPin size={17} /> Pickup location
        <select value={value.pickupBranch} onChange={e => set('pickupBranch', e.target.value)}>
          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {value.pickupBranch === 'custom' && <input required maxLength={180}
          aria-label="Requested pickup address, city or airport"
          placeholder="Address, city or airport"
          value={value.pickupLocation || ''} onChange={e => set('pickupLocation', e.target.value)} />}
      </label>
      <label>
        <MapPin size={17} /> Return location
        <select value={value.returnBranch} onChange={e => set('returnBranch', e.target.value)}>
          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {value.returnBranch === 'custom' && <input required maxLength={180}
          aria-label="Requested return address, city or airport"
          placeholder="Address, city or airport"
          value={value.returnLocation || ''} onChange={e => set('returnLocation', e.target.value)} />}
      </label>
      <label>
        <CalendarDays size={17} /> Pickup · Central Time
        <input required type="datetime-local" step={60} value={value.pickupLocal}
          onChange={e => set('pickupLocal', e.target.value)} />
      </label>
      <label>
        <CalendarDays size={17} /> Return · Central Time
        <input required type="datetime-local" step={60} value={value.returnLocal}
          onChange={e => set('returnLocal', e.target.value)} />
      </label>
      <label>
        <Car size={17} /> Vehicle class
        <select value={value.vehicleClass} onChange={e => set('vehicleClass', e.target.value)}>
          {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <p className="r-field-note">Any future pickup date and time and any later return date may be requested, including extended stays. Times are entered in Central Time; another location's time zone will be confirmed by staff. One-way service, locations, vehicles and pickup hours remain subject to written approval.</p>
    </div>
  );
}
function TripSummary({ trip }: { trip: Trip }) {
  return (
    <div className="r-trip-summary">
      <span>
        <MapPin size={17} />{' '}
        {trip.pickupLocation || BRANCHES.find((b) => b.id === trip.pickupBranch)?.name || trip.pickupBranch}
        {' → '}
        {trip.returnLocation || BRANCHES.find((b) => b.id === trip.returnBranch)?.name || trip.returnBranch}
      </span>
      <span>
        <Car size={17} />{' '}
        {CLASSES.find((c) => c.id === trip.vehicleClass)?.name}
      </span>
      <span>
        <CalendarDays size={17} /> {trip.pickupLocal.replace('T', ' ')} →{' '}
        {trip.returnLocal.replace('T', ' ')} CT
      </span>
      {!!trip.addOnCodes?.length && (
        <span>Requested extras: {trip.addOnCodes.join(', ')}</span>
      )}
      <span>
        {trip.days} billable 24-hour day{trip.days === 1 ? '' : 's'}
      </span>
    </div>
  );
}
function QuoteSummary({ quote, days }: { quote: any; days: number }) {
  return (
    <div className="r-quote">
      <div>
        <span>
          {days} days × {money(quote.dailyRateCents)}
        </span>
        <b>{money(quote.baseCents)}</b>
      </div>
      <div>
        <span>Quoted taxes</span>
        <b>{money(quote.taxCents)}</b>
      </div>
      <div>
        <span>Disclosed fees</span>
        <b>{money(quote.feeCents)}</b>
      </div>
      <div className="r-total">
        <span>Rental estimate</span>
        <b>{money(quote.rentalTotalCents)}</b>
      </div>
      <div>
        <span>Refundable deposit / hold</span>
        <b>{money(quote.depositCents)}</b>
      </div>
      <div>
        <span>Estimated rental + hold</span>
        <b>{money(quote.authorizationTotalCents)}</b>
      </div>
      <p>{quote.notes}</p>
      <small>
        Quote only. No payment has been authorized or charged by R-Rent.
      </small>
    </div>
  );
}
export function RentalExperience({ user, signIn, page }: Props) {
  const [access, setAccess] = useState<{ id: string; admin: boolean } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    setAccess(null);
    if (user)
      void api
        .get('/api/account')
        .then((r) => {
          if (active)
            setAccess({
              id: user.userId,
              admin: (r.data.roles || []).some((role: string) =>
                ['owner', 'executive_manager'].includes(role),
              ),
            });
        })
        .catch(() => {
          if (active) setAccess({ id: user.userId, admin: false });
        });
    return () => {
      active = false;
    };
  }, [user?.userId]);
  const admin = access?.id === user?.userId && access?.admin === true;
  return (
    <main className="rental-shell">
      {page === 'reserve' ? (
        <Booking key={user?.userId || 'visitor'} user={user} signIn={signIn} />
      ) : page === 'trips' ? (
        <TripList
          key={user?.userId || 'visitor'}
          user={user}
          signIn={signIn}
          admin={false}
        />
      ) : !user ? (
        <SignInGate signIn={signIn} title="Rental operations" />
      ) : access?.id !== user.userId ? (
        <p role="status">Checking account permissions…</p>
      ) : !admin ? (
        <div className="r-panel">
          <h2>Administrator access required</h2>
          <p>
            This workspace requires a verified company owner or executive office manager.
          </p>
        </div>
      ) : (
        <Operations user={user} />
      )}
    </main>
  );
}
function SignInGate({ signIn, title }: { signIn: () => void; title: string }) {
  return (
    <div className="r-panel r-empty">
      <ShieldCheck size={34} />
      <h2>{title}</h2>
      <p>Sign in to securely access your rental information.</p>
      <button className="goldbtn" onClick={signIn}>
        Sign in securely <ArrowRight size={17} />
      </button>
    </div>
  );
}
function Booking({ user, signIn }: { user: User | null; signIn: () => void }) {
  const [trip, setTrip] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('r-rent-trip-draft');
      return saved ? { ...newTrip(), ...JSON.parse(saved) } : newTrip();
    } catch {
      return newTrip();
    }
  });
  const [result, setResult] = useState<any>(null),
    [request, setRequest] = useState<any>(null);
  const [name, setName] = useState(user?.name || ''),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [optionsReady, setOptionsReady] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void api
      .get('/api/rental/options')
      .then(() => {
        if (active) setOptionsReady(true);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const editTrip = (value: any) => {
    setTrip(value);
    setResult(null);
    setAck(false);
    setError('');
    try {
      sessionStorage.setItem('r-rent-trip-draft', JSON.stringify(value));
    } catch {
      /* Non-sensitive convenience only. */
    }
  };
  async function search(e: any) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult((await api.post('/api/rental/search', trip)).data);
    } catch (e) {
      setResult(null);
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: any) {
    e.preventDefault();
    if (!user) {
      signIn();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/api/rental/requests', {
        trip,
        renterName: name,
        acknowledged: ack,
        commandId: crypto.randomUUID(),
      });
      setRequest(r.data);
      sessionStorage.removeItem('r-rent-trip-draft');
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (request && user)
    return (
      <RequestDetail
        id={request.id}
        user={user}
        admin={false}
        back={() => {
          setRequest(null);
          setResult(null);
        }}
      />
    );
  return (
    <>
      <div className="r-heading">
        <span className="eyebrow dark">PLAN YOUR NEXT DRIVE</span>
        <h1>Your trip. Your pace.</h1>
        <p>
          Choose your dates and vehicle class. We’ll prepare a personal rental
          quote.
        </p>
      </div>
      <div className="r-steps" aria-label="Request progress">
        <b className="active">01 · Trip details</b>
        <b className={result ? 'active' : ''}>02 · Review your request</b>
        <b>03 · Staff quote</b>
      </div>
      <div className="r-layout">
        <section className="r-panel">
          <form className="r-booking-panel" onSubmit={search}>
            <div className="r-booking-brand"><img src="/brand/r-rent-lockup-dark.svg" alt="R-Rent | RTPSC Rent-A-Car" /><span>Driven for a brighter tomorrow</span></div>
            <h2>Where are you headed?</h2>
            <p className="r-booking-motto">RENT. EXPLORE. GO FURTHER.</p>
            <TripFields value={trip} onChange={editTrip} />
            <AddOnChoices
              value={trip.addOnCodes || []}
              onChange={(addOnCodes) => editTrip({ ...trip, addOnCodes })}
            />
            <button className="goldbtn" disabled={busy || !optionsReady}>
              Review rental options <ArrowRight size={16} />
            </button>
          </form>
          {!optionsReady && (
            <button
              className="textbutton"
              onClick={() => {
                setError('');
                setRetry((r) => r + 1);
              }}
            >
              Retry rental service
            </button>
          )}
          {error && (
            <p className="r-error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <div className="r-review">
              <span className="r-badge">WRITTEN QUOTE REQUIRED</span>
              <h3>{result.candidates[0]?.name}</h3>
              <p>{result.candidates[0]?.example} class preference</p>
              <TripSummary trip={result.trip} />
              <p>{result.message}</p>
              {result.estimate && (
                <div className="r-quote">
                  <div>
                    <span>Published base + selected extras, before tax</span>
                    <b>
                      {money(
                        result.estimate.baseCents + result.estimate.extrasCents,
                      )}
                    </b>
                  </div>
                  {result.estimate.lines.map((line: any) => (
                    <div key={line.code}>
                      <span>
                        {line.label} × {line.quantity}
                      </span>
                      <b>{money(line.amountCents)}</b>
                    </div>
                  ))}
                  <div>
                    <span>Separate refundable authorization</span>
                    <b>{money(result.estimate.depositCents)}</b>
                  </div>
                  <small>
                    Estimate only. Written quote confirms taxes and charges.
                  </small>
                </div>
              )}
              {!user ? (
                <button className="goldbtn" onClick={signIn}>
                  Sign in to submit request
                </button>
              ) : (
                <form onSubmit={submit}>
                  <label>
                    Full name
                    <input
                      required
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <p className="r-caption">Request attached to {user.email}</p>
                  <label className="r-check">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                    />{' '}
                    I understand this is a rental request. Availability, price,
                    driver eligibility and vehicle release require approval.
                  </label>
                  <button
                    className="goldbtn"
                    disabled={busy || !ack || !name.trim()}
                  >
                    Submit rental request <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
        <aside>
          <div className="r-panel r-dark">
            <Car size={28} />
            <h2>A clear path to pickup.</h2>
            <ol>
              <li>Choose dates and vehicle class</li>
              <li>Receive your written quote</li>
              <li>Review requirements and agreement</li>
              <li>Complete verified pickup arrangements</li>
            </ol>
          </div>
          <div className="r-panel">
            <MapPin size={22} />
            <h3>Central Texas pickup</h3>
            <p>{BRANCHES[0].note}</p>
            <p className="r-caption">
              All trip times are shown in America/Chicago. No card or license
              details are collected here.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function TripList({
  user,
  signIn,
  admin,
}: {
  user: User | null;
  signIn: () => void;
  admin: boolean;
}) {
  const [items, setItems] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load(next?: string) {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.get(
        (admin ? '/api/rental/admin/requests' : '/api/rental/requests') +
          (next ? '?cursor=' + encodeURIComponent(next) : ''),
      );
      setItems((v) => (next ? [...v, ...r.data.items] : r.data.items));
      setCursor(r.data.nextCursor);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.userId, admin]);
  if (!user) return <SignInGate signIn={signIn} title="My trips" />;
  if (selected)
    return (
      <RequestDetail
        key={selected}
        id={selected}
        user={user}
        admin={admin}
        back={() => {
          setSelected(null);
          void load();
        }}
      />
    );
  return (
    <>
      <div className="r-heading r-row">
        <div>
          <span className="eyebrow dark">
            {admin ? 'RENTAL MANAGEMENT WORKSPACE' : 'YOUR RENTAL JOURNEY'}
          </span>
          <h1>{admin ? 'Reservation desk' : 'My trips'}</h1>
          <p>
            {admin
              ? 'Open each request to review current status, prepare a quote and record inspections.'
              : 'View requests, review quotes and manage your dates.'}
          </p>
        </div>
        <button
          className="outlinebtn"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {error && (
        <p className="r-error" role="alert">
          {error}
        </p>
      )}
      {!items.length && (
        <div className="r-panel r-empty">
          <ClipboardList size={34} />
          <h3>{busy ? 'Loading requests…' : 'No rental requests yet'}</h3>
          <p>
            {admin
              ? 'Customer requests will appear here after submission.'
              : 'Use Start reservation to send your first request.'}
          </p>
        </div>
      )}
      <div className="r-request-grid">
        {items.map((item) => (
          <button
            className="r-request-card"
            key={item.id}
            onClick={() => setSelected(item.id)}
          >
            <span className="r-badge">
              {item.reference || 'RENTAL REQUEST'}
            </span>
            <h3>
              {admin
                ? item.renterName
                : CLASSES.find((c) => c.id === item.trip.vehicleClass)?.name}
            </h3>
            {admin && <p>{item.renterEmail}</p>}
            <TripSummary trip={item.trip} />
            <span className="r-open">
              Open current status <ArrowRight size={16} />
            </span>
          </button>
        ))}
      </div>
      {cursor && (
        <button
          className="outlinebtn"
          disabled={busy}
          onClick={() => void load(cursor)}
        >
          Load more requests
        </button>
      )}
    </>
  );
}
function RequestDetail({
  id,
  user,
  admin,
  back,
}: {
  id: string;
  user: User;
  admin: boolean;
  back: () => void;
}) {
  const [r, setR] = useState<Reservation | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [edit, setEdit] = useState(false),
    [trip, setTrip] = useState<any>(newTrip),
    [cancel, setCancel] = useState(false),
    [ack, setAck] = useState(false);
  const [quote, setQuote] = useState({
    daily: '',
    tax: '',
    fee: '',
    deposit: '',
    notes: '',
  });
  const [inspection, setInspection] = useState({
    kind: 'pickup',
    vehicleId: 'trailblazer',
    odometer: '',
    fuelEighths: '8',
    notes: '',
  });
  const [agreementId, setAgreementId] = useState(''),
    [reason, setReason] = useState('');
  async function load() {
    setBusy(true);
    setError('');
    try {
      const x = (await api.get('/api/rental/requests/' + id)).data;
      setR(x);
      setTrip(x.trip);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id, user.userId]);
  async function act(action: string, values: any = {}) {
    if (!r) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post('/api/rental/requests/' + id + '/events', {
        action,
        ...values,
        revision: r.revision,
        commandId: crypto.randomUUID(),
      });
      setR(result.data);
      setTrip(result.data.trip);
      setEdit(false);
      setCancel(false);
      setAck(false);
      setNotice(
        result.data.conflict
          ? 'Concurrent edits require staff reconciliation.'
          : 'Saved. Your request history has been updated.',
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function createAgreement() {
    if (!r) return;
    setBusy(true);
    setError('');
    try {
      const doc = await api.post('/api/agreements', { rentalRequestId: r.id });
      await act('link_agreement', { agreementId: doc.data.id });
      setNotice(
        'Agreement created and linked. Open Agreements to issue it for renter signature.',
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  const closed =
    !r || ['CANCELLED', 'DECLINED', 'REVIEW_CONFLICT'].includes(r.status);
  const own = r?.renterId === user.userId;
  async function sendQuote(e: any) {
    e.preventDefault();
    try {
      await act('quote', {
        dailyRateCents: dollars(quote.daily),
        taxCents: dollars(quote.tax),
        feeCents: dollars(quote.fee),
        depositCents: dollars(quote.deposit),
        notes: quote.notes,
      });
    } catch (e) {
      setError(messageOf(e));
    }
  }
  return (
    <>
      <div className="r-row">
        <button className="textbutton" onClick={back}>
          <ArrowLeft size={16} /> Back to requests
        </button>
        <button
          className="outlinebtn"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} /> Refresh status
        </button>
      </div>
      {error && (
        <p role="alert" className="r-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="r-success">
          {notice}
        </p>
      )}
      {!r ? (
        <div className="r-panel">
          <p>{busy ? 'Loading request…' : 'Request unavailable.'}</p>
        </div>
      ) : (
        <>
          <div className="r-heading">
            <span className="r-badge">
              {STATUS_LABELS[r.status] || r.status}
            </span>
            <h1>{(r as any).reference || 'Rental request'}</h1>
            <p>
              {r.renterName} · {r.renterEmail}
            </p>
          </div>
          <div className="r-layout">
            <section>
              <div className="r-panel">
                <h2>Trip details</h2>
                <TripSummary trip={r.trip} />
                <p className="r-caption">Request ID: {r.id}</p>
                {r.message && <p>{r.message}</p>}
                {!closed && (
                  <div className="r-actions">
                    <button
                      className="outlinebtn"
                      disabled={busy}
                      onClick={() => setEdit(!edit)}
                    >
                      Change trip
                    </button>
                    <button
                      className="textbutton"
                      disabled={busy}
                      onClick={() => setCancel(true)}
                    >
                      Cancel request
                    </button>
                  </div>
                )}
                {edit && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act('change', { trip });
                    }}
                  >
                    <TripFields value={trip} onChange={setTrip} />
                    <p className="r-caption">
                      Changing dates or class clears the existing quote and
                      acceptance.
                    </p>
                    <button className="goldbtn" disabled={busy}>
                      Save trip changes
                    </button>
                  </form>
                )}
                {cancel && (
                  <div className="r-confirm">
                    <p>
                      Cancel this rental request? No payment refund is
                      triggered.
                    </p>
                    <button
                      className="goldbtn"
                      disabled={busy}
                      onClick={() => void act('cancel')}
                    >
                      Confirm cancellation
                    </button>{' '}
                    <button
                      className="textbutton"
                      onClick={() => setCancel(false)}
                    >
                      Keep request
                    </button>
                  </div>
                )}
              </div>
              <div className="r-panel">
                <h2>Your quote</h2>
                {r.quote ? (
                  <QuoteSummary quote={r.quote} days={r.trip.days} />
                ) : (
                  <p>
                    A written quote will appear after staff review. No rate or
                    availability has been confirmed.
                  </p>
                )}
                {own && r.status === 'QUOTED' && (
                  <>
                    <label className="r-check">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                      />{' '}
                      I have reviewed the quote and understand acceptance does
                      not confirm a vehicle, execute the rental agreement or
                      authorize payment.
                    </label>
                    <button
                      className="goldbtn"
                      disabled={busy || !ack}
                      onClick={() => void act('accept', { acknowledged: ack })}
                    >
                      Accept quote for review
                    </button>
                  </>
                )}
              </div>
              {own && r.status === 'ACCEPTED_PENDING_REVIEW' && (
                <div className="r-panel">
                  <h2>Prepare for pickup</h2>
                  <p>
                    Arrival readiness is a customer acknowledgment. Staff
                    separately verify your license, coverage, payment and
                    agreement.
                  </p>
                  {r.checkIn ? (
                    <p className="r-success">
                      <CheckCircle2 size={16} /> Arrival requirements
                      acknowledged
                    </p>
                  ) : (
                    <button
                      className="outlinebtn"
                      disabled={busy}
                      onClick={() =>
                        void act('checkin', { acknowledged: true })
                      }
                    >
                      I understand the pickup requirements
                    </button>
                  )}
                </div>
              )}
              {admin && !closed && (
                <div className="r-panel">
                  <h2>Owner actions</h2>
                  <details open={!r.quote}>
                    <summary>Prepare or revise quote</summary>
                    <form onSubmit={sendQuote}>
                      <div className="r-form-grid">
                        {[
                          ['daily', 'Daily rate ($)'],
                          ['tax', 'Total quoted taxes ($)'],
                          ['fee', 'Disclosed fees ($)'],
                          ['deposit', 'Refundable deposit / hold ($)'],
                        ].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <input
                              required
                              inputMode="decimal"
                              value={(quote as any)[key]}
                              onChange={(e) =>
                                setQuote({ ...quote, [key]: e.target.value })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <label>
                        Pricing basis, fees and conditions
                        <textarea
                          required
                          maxLength={1000}
                          value={quote.notes}
                          onChange={(e) =>
                            setQuote({ ...quote, notes: e.target.value })
                          }
                        />
                      </label>
                      <p className="r-caption">
                        Enter verified quote amounts. Zero tax requires a
                        documented basis. Revision clears prior acceptance.
                      </p>
                      <button className="goldbtn" disabled={busy}>
                        Save written quote
                      </button>
                    </form>
                  </details>
                  <details>
                    <summary>Decline request</summary>
                    <label>
                      Reason
                      <textarea
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                    <button
                      className="outlinebtn"
                      disabled={busy || !reason.trim()}
                      onClick={() => void act('decline', { reason })}
                    >
                      Decline with reason
                    </button>
                  </details>
                  {r.status === 'ACCEPTED_PENDING_REVIEW' && (
                    <>
                      <button
                        className="goldbtn"
                        disabled={busy || !!r.agreementId}
                        onClick={() => void createAgreement()}
                      >
                        Create agreement from accepted quote
                      </button>
                      <details>
                        <summary>Link existing agreement</summary>
                        <p>
                          Use the existing Agreements workspace to prepare the
                          contract. Its renter, vehicle and dates must match
                          this request.
                        </p>
                        <label>
                          Agreement ID
                          <input
                            value={agreementId}
                            onChange={(e) => setAgreementId(e.target.value)}
                          />
                        </label>
                        <button
                          className="outlinebtn"
                          disabled={busy || !agreementId.trim()}
                          onClick={() =>
                            void act('link_agreement', { agreementId })
                          }
                        >
                          Link agreement
                        </button>
                      </details>
                      <details>
                        <summary>Record pickup or return inspection</summary>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void act('inspection', {
                              ...inspection,
                              odometer: Number(inspection.odometer),
                              fuelEighths: Number(inspection.fuelEighths),
                            });
                          }}
                        >
                          <div className="r-form-grid">
                            <label>
                              Inspection type
                              <select
                                value={inspection.kind}
                                onChange={(e) =>
                                  setInspection({
                                    ...inspection,
                                    kind: e.target.value,
                                  })
                                }
                              >
                                <option value="pickup">
                                  Pickup inspection
                                </option>
                                <option value="return">
                                  Return inspection
                                </option>
                              </select>
                            </label>
                            <label>
                              Vehicle
                              <select
                                value={inspection.vehicleId}
                                onChange={(e) =>
                                  setInspection({
                                    ...inspection,
                                    vehicleId: e.target.value,
                                  })
                                }
                              >
                                {CLASSES.map((c) => (
                                  <option key={c.vehicleId} value={c.vehicleId}>
                                    {c.example}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Odometer miles
                              <input
                                required
                                type="number"
                                min="0"
                                step="1"
                                value={inspection.odometer}
                                onChange={(e) =>
                                  setInspection({
                                    ...inspection,
                                    odometer: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Fuel eighths
                              <select
                                value={inspection.fuelEighths}
                                onChange={(e) =>
                                  setInspection({
                                    ...inspection,
                                    fuelEighths: e.target.value,
                                  })
                                }
                              >
                                {Array.from({ length: 9 }, (_, i) => (
                                  <option key={i} value={i}>
                                    {i}/8
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label>
                            Condition notes
                            <textarea
                              required
                              maxLength={1500}
                              value={inspection.notes}
                              onChange={(e) =>
                                setInspection({
                                  ...inspection,
                                  notes: e.target.value,
                                })
                              }
                            />
                          </label>
                          <p className="r-caption">
                            Records an inspection only; this does not release
                            the vehicle or settle a rental.
                          </p>
                          <button className="goldbtn" disabled={busy}>
                            Save inspection record
                          </button>
                        </form>
                      </details>
                    </>
                  )}
                </div>
              )}
              <PaymentsPanel requestId={r.id} own={!!own} admin={admin} />
              {r.inspection && (
                <div className="r-panel">
                  <h2>Inspection records</h2>
                  {Object.entries(r.inspection).map(
                    ([kind, v]: [string, any]) => (
                      <div key={kind}>
                        <h3>{kind === 'pickup' ? 'Pickup' : 'Return'}</h3>
                        <p>
                          {v.vehicleId} · {v.odometer} miles · fuel{' '}
                          {v.fuelEighths}/8
                        </p>
                        <p>{v.notes}</p>
                        <small>{new Date(v.at).toLocaleString()}</small>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
            <aside>
              <div className="r-panel r-dark">
                <ShieldCheck size={26} />
                <h2>Before keys are released</h2>
                <ul>
                  {GATES.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <p>
                  These requirements remain pending until supported by verified
                  records. Your request is not a confirmed booking.
                </p>
              </div>
              {r.agreementId && (
                <div className="r-panel">
                  <h3>Linked agreement</h3>
                  <p className="r-caption">{r.agreementId}</p>
                  <p>
                    Open Agreements to review the contract and signature status.
                  </p>
                </div>
              )}
              <div className="r-panel">
                <h3>Request history</h3>
                <ol className="r-timeline">
                  <li>
                    <b>Request received</b>
                    <small>{new Date(r.createdAt).toLocaleString()}</small>
                  </li>
                  {r.events?.map((event) => (
                    <li key={event.id}>
                      <b>{event.action.replaceAll('_', ' ')}</b>
                      <small>{new Date(event.at).toLocaleString()}</small>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function Operations({ user }: { user: User }) {
  const [tab, setTab] = useState('requests');
  return (
    <>
      <OperationsOverview />
      <div className="r-tabs">
        <button className={tab === 'counter' ? 'selected' : ''} onClick={() => setTab('counter')}>
          <ClipboardList size={17} /> Rental counter
        </button>
        <button
          className={tab === 'requests' ? 'selected' : ''}
          onClick={() => setTab('requests')}
        >
          <ClipboardList size={17} /> Reservation desk
        </button>
        <button
          className={tab === 'fleet' ? 'selected' : ''}
          onClick={() => setTab('fleet')}
        >
          <Wrench size={17} /> Fleet records
        </button>
        <button
          className={tab === 'settlements' ? 'selected' : ''}
          onClick={() => setTab('settlements')}
        >
          Payments & settlements
        </button>
        <button
          className={tab === 'prices' ? 'selected' : ''}
          onClick={() => setTab('prices')}
        >
          Prices, add-ons & fees
        </button>
        <button
          className={tab === 'map' ? 'selected' : ''}
          onClick={() => setTab('map')}
        >
          <GitBranch size={17} /> Logic & directory
        </button>
      </div>
      {tab === 'counter' ? (
        <RentalCounter />
      ) : tab === 'prices' ? (
        <PriceBook />
      ) : tab === 'settlements' ? (
        <SettlementPanel />
      ) : tab === 'requests' ? (
        <TripList user={user} signIn={() => {}} admin />
      ) : tab === 'fleet' ? (
        <FleetLog />
      ) : (
        <EngineeringMap />
      )}
    </>
  );
}
function FleetLog() {
  const [vehicle, setVehicle] = useState('trailblazer'),
    [kind, setKind] = useState('INSPECTION'),
    [notes, setNotes] = useState(''),
    [entries, setEntries] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function load(next?: string) {
    setBusy(true);
    setError('');
    try {
      const r = await api.get(
        '/api/rental/admin/fleet/' +
          vehicle +
          (next ? '?cursor=' + encodeURIComponent(next) : ''),
      );
      setEntries((v) => (next ? [...v, ...r.data.items] : r.data.items));
      setCursor(r.data.nextCursor);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setEntries([]);
    setNotice('');
    void load();
  }, [vehicle]);
  async function save(e: any) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/rental/admin/fleet/' + vehicle, { kind, notes });
      setNotes('');
      setNotice('Fleet record saved.');
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="r-heading">
        <span className="eyebrow dark">FLEET OPERATIONS</span>
        <h1>Keep every vehicle ready.</h1>
        <p>
          Maintenance, cleaning and inspection records with actor and time
          evidence.
        </p>
      </div>
      <div className="r-layout">
        <section className="r-panel">
          <label>
            Vehicle
            <select
              disabled={busy}
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              {CLASSES.map((c) => (
                <option key={c.vehicleId} value={c.vehicleId}>
                  {c.example}
                </option>
              ))}
            </select>
          </label>
          <form onSubmit={save}>
            <label>
              Record type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {[
                  'INSPECTION',
                  'MAINTENANCE',
                  'CLEANING',
                  'OUT_OF_SERVICE',
                  'REVIEW_COMPLETE',
                ].map((k) => (
                  <option key={k} value={k}>
                    {k.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Work performed / findings
              <textarea
                required
                maxLength={1500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button className="goldbtn" disabled={busy || !notes.trim()}>
              Save fleet record
            </button>
          </form>
          {error && (
            <p role="alert" className="r-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="r-success">
              {notice}
            </p>
          )}
          <p className="r-caption">
            A fleet log does not change bookable availability. No sample records
            are seeded.
          </p>
        </section>
        <section className="r-panel">
          <div className="r-row">
            <h2>Vehicle history</h2>
            <button
              className="textbutton"
              disabled={busy}
              onClick={() => void load()}
            >
              Refresh
            </button>
          </div>
          {!entries.length && (
            <p>{busy ? 'Loading records…' : 'No recorded fleet activity.'}</p>
          )}
          {[...entries]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((entry) => (
              <article className="r-log" key={entry.id}>
                <b>{entry.kind.replaceAll('_', ' ')}</b>
                <p>{entry.notes}</p>
                <small>{new Date(entry.at).toLocaleString()}</small>
              </article>
            ))}
          {cursor && (
            <button
              className="outlinebtn"
              disabled={busy}
              onClick={() => void load(cursor)}
            >
              Load older records
            </button>
          )}
        </section>
      </div>
    </>
  );
}
