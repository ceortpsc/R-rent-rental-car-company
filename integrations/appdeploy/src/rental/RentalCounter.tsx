import { useEffect, useState } from 'react';
import { api } from '@appdeploy/client';
import { CarFront, ClipboardCheck, FileSignature, CreditCard, ShieldCheck } from 'lucide-react';
import './counter.css';

const areas = [
  ['front','Front'],['rear','Rear'],['driver','Driver side'],
  ['passenger','Passenger side'],['roof','Roof'],['wheels','Wheels'],
  ['glass','Windshield/glass'],['interior','Interior'],['keys','Keys/accessories'],
];
const messageOf = (e: any) => e?.response?.data?.error || e?.message || 'Counter operation unavailable.';
const toDataUrl = (file: File | null): Promise<string | null> => {
  if (!file) return Promise.resolve(null);
  if (!['image/png','image/jpeg'].includes(file.type) || file.size > 190000)
    return Promise.reject(new Error('Choose a JPEG/PNG photo smaller than 190 KB.'));
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read photo.'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  });
};
export function RentalCounter() {
  const [agreements,setAgreements] = useState<any[]>([]);
  const [selected,setSelected] = useState('');
  const [caseId,setCaseId] = useState('');
  const [counter,setCounter] = useState<any>(null);
  const [document,setDocument] = useState<any>(null);
  const [readiness,setReadiness] = useState<any>(null);
  const [stripe,setStripe] = useState<any>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [vin,setVin] = useState('');
  const [odometer,setOdometer] = useState('');
  const [fuel,setFuel] = useState('8');
  const [damage,setDamage] = useState<string[]>([]);
  const [notes,setNotes] = useState('');
  const [safe,setSafe] = useState(false);
  const [confirmed,setConfirmed] = useState(false);
  const [photo,setPhoto] = useState<File | null>(null);
  const [requestId,setRequestId] = useState(() => crypto.randomUUID());
  const picked = agreements.find(a => a.id === (caseId || selected));
  async function refresh() {
    try {
      const list = (await api.get('/api/agreements')).data.items || [];
      setAgreements(list);
      if (caseId) {
        const [c,r,p,d] = await Promise.all([
          api.get('/api/rental/counter/' + caseId),
          api.get('/api/rental/counter/' + caseId + '/readiness'),
          api.get('/api/payments/status').catch(e => ({data:{verified:false,message:messageOf(e)}})),
          api.get('/api/agreements/' + caseId),
        ]);
        setCounter(c.data);setReadiness(r.data);setStripe(p.data);setDocument(d.data.agreement);
      }
    } catch (e) { setError(messageOf(e)); }
  }
  useEffect(()=>{void refresh();},[caseId]);
  async function assign() {
    if (!selected) return;
    setBusy(true);setError('');setNotice('');
    try {
      const r = await api.post('/api/rental/counter',{agreementId:selected});
      setCaseId(r.data.id);
      setNotice(r.data.reused ? 'Original counter record reopened; no duplicate rental created.' : 'Renter and vehicle assigned to the agreement. No rental released.');
    } catch(e){setError(messageOf(e));}
    finally{setBusy(false);}
  }
  async function inspect(e: React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      const image = await toDataUrl(photo);
      const r = await api.post('/api/rental/counter/' + caseId + '/inspection',{
        requestId, confirmed, vin:vin.trim().toUpperCase(), odometer:Number(odometer),
        fuelEighths:Number(fuel), zones:damage, notes, safe, photoDataUrl:image,
      });
      setNotice('Inspection saved with evidence SHA-256 ' + r.data.hash);
      setRequestId(crypto.randomUUID());setConfirmed(false);setPhoto(null);
      await refresh();
    } catch(e){setError(messageOf(e));}
    finally{setBusy(false);}
  }
  async function protectedPhoto() {
    try {
      const r = await api.get('/api/rental/counter/' + caseId + '/photo');
      const u = new URL(r.data.url);
      if (u.protocol !== 'https:') throw new Error('Invalid protected image URL.');
      window.open(u.href,'_blank','noopener,noreferrer');
    } catch(e){setError(messageOf(e));}
  }
  async function copyLink() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('doc',caseId);u.hash='agreements';
      await navigator.clipboard.writeText(u.href);
      setNotice('Protected signing link copied. Renter must sign in separately.');
    } catch { setError('Copy failed. Open the agreement and copy the link there.'); }
  }
  return <section className="rr-counter">
    <div className="r-heading"><span className="eyebrow dark">R-RENT RENTAL COUNTER</span>
      <h1>Select, inspect, sign, pay and dispatch.</h1>
      <p>Each step is authenticated and documented; no new booking or payment is fabricated.</p>
    </div>
    <div className="rr-counter-flow">
      {[[CarFront,'Vehicle & renter'],[ClipboardCheck,'Inspect damage'],[FileSignature,'Sign contract'],[CreditCard,'Pay rental'],[ShieldCheck,'Start rental']].map(([Icon,label],i)=>{
        const I = Icon as typeof CarFront;
        return <div key={i}><I size={20}/><small>0{i+1}</small><b>{String(label)}</b></div>;
      })}
    </div>
    {error && <p className="r-error" role="alert">{error}</p>}
    {notice && <p className="r-success" role="status">{notice}</p>}
    <div className="r-panel">
      <h2>1. Select vehicle and assign client</h2>
      <p>Choose an existing agreement. The server binds its assigned renter, selected car and contract version; the counter cannot silently change signed terms.</p>
      <select aria-label="Agreement to open at counter" value={selected} onChange={e=>setSelected(e.target.value)}>
        <option value="">Select customer and vehicle</option>
        {agreements.map(a=><option key={a.id} value={a.id}>{a.reference} — {a.renterName} — {a.vehicleId} — {a.status}</option>)}
      </select>
      <div className="r-actions">
        <button className="goldbtn" disabled={busy||!selected} onClick={()=>void assign()}>Assign / open counter case</button>
        <button className="outlinebtn" onClick={()=>{window.location.hash='create';}}>Create rental agreement</button>
        <button className="outlinebtn" onClick={()=>void refresh()}>Refresh records</button>
      </div>
      {picked && <p><b>{picked.renterName}</b> — {picked.vehicleId === 'bronco' ? '2026 Ford Bronco Sport' : '2026 Chevrolet Trailblazer'} — {picked.starts} to {picked.ends}</p>}
      {counter?.existingRental && <p className="rr-counter-warning">Existing active rental amendment. The original active rental remains unchanged and is not restarted.</p>}
    </div>
    {counter && <>
      <div className="r-panel">
        <h2>2. Vehicle damage and condition check</h2>
        <form onSubmit={e=>void inspect(e)}>
          <div className="rr-counter-grid">
            <label>Verified VIN<input required minLength={17} maxLength={17} value={vin} onChange={e=>setVin(e.target.value.toUpperCase())} placeholder="Full 17-character physical VIN"/></label>
            <label>Odometer<input type="number" required min={0} value={odometer} onChange={e=>setOdometer(e.target.value)}/></label>
            <label>Fuel level<select value={fuel} onChange={e=>setFuel(e.target.value)}>{Array.from({length:9},(_,i)=><option key={i} value={i}>{i}/8 full</option>)}</select></label>
            <label>Condition photograph (optional, below 190 KB)<input type="file" accept="image/png,image/jpeg" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
          </div>
          <fieldset><legend>Observed damage zones</legend>
            <div className="rr-counter-grid">{areas.map(([value,label])=><label key={value}><input type="checkbox" checked={damage.includes(value)} onChange={e=>setDamage(x=>e.target.checked?[...x,value]:x.filter(v=>v!==value))}/> {label}</label>)}</div>
          </fieldset>
          <label>Damage and condition notes<textarea rows={3} maxLength={1600} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe any dents, scratches, glass, tire or existing damage."/></label>
          <label className="r-check"><input type="checkbox" checked={safe} onChange={e=>setSafe(e.target.checked)}/> I completed the physical safety observation (separate policy and mechanical checks still apply).</label>
          <label className="r-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I personally inspected this vehicle and attest the details are accurate.</label>
          <button className="goldbtn" disabled={busy||!confirmed}>Record physical inspection</button>
        </form>
        {counter.inspection && <div className="rr-counter-evidence">
          <strong>Latest retained inspection</strong>
          <p>{counter.inspection.vin} · {counter.inspection.odometer} miles · {counter.inspection.fuelEighths}/8 fuel</p>
          <p>Damage: {counter.inspection.zones.join(', ')||'None observed'}</p>
          <code>{counter.inspection.hash}</code>
          {counter.inspection.photo && <button className="outlinebtn" onClick={()=>void protectedPhoto()}>View private condition photo</button>}
        </div>}
      </div>
      <div className="r-panel">
        <h2>3. Review disclosures and sign contract</h2>
        <p>Document {document?.reference||counter.reference}: {document?.status||'Loading'}</p>
        <button className="goldbtn" onClick={()=>{window.location.href='?doc='+encodeURIComponent(caseId)+'#agreements';}}>Open protected signing pad</button>
        <button className="outlinebtn" onClick={()=>void copyLink()}>Copy renter signing link</button>
      </div>
      <div className="r-panel">
        <h2>4. Rental charges and separate deposit authorization</h2>
        <p>{stripe?.message||'Stripe status unavailable.'}</p>
        <p>{document?.rentalRequestId ? 'Accepted rental request: '+document.rentalRequestId+'. Renter must authenticate and authorize their own Checkout sessions.' : 'No accepted rental request is linked; standalone card collection is blocked until real payment evidence can be associated.'}</p>
        <button className="outlinebtn" onClick={()=>{window.location.hash='trips';}}>Review existing payment workzone</button>
      </div>
      <div className="r-panel">
        <h2>5. Activation readiness and dispatch</h2>
        {readiness && <><div className="rr-counter-checks">{Object.entries(readiness.checks).map(([name,ok])=><div key={name}><span>{name.replace(/([A-Z])/g,' $1')}</span><b>{ok?'Verified':'Outstanding'}</b></div>)}</div>
          <p>Payment: {readiness.payment} · Activation: {readiness.activation}</p>
          <p className="rr-counter-warning">{readiness.note}</p></>}
        <button className="outlinebtn" onClick={()=>void refresh()}>Recheck all release gates</button>
        {!counter.existingRental && <button className="goldbtn" onClick={()=>{window.location.hash='ops/dispatch';}}>Open controlled vehicle dispatch</button>}
        <p><small>The rental counter does not bypass Stripe settlement, company coverage, authenticated MFA or actual physical release.</small></p>
      </div>
    </>}
  </section>;
}
