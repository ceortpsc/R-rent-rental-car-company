(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 const money=c=>'$'+(c/100).toFixed(2);
 const common={reference:'DEMO-DRAFT-001'};
 const sampleItems=[
  {description:'Vehicle rental - 7 days x $59.00',amount_cents:41300},
  {description:'Proposed coverage (unbound) - 7 x $9.50',amount_cents:6650},
  {description:'Extension fee',amount_cents:5000},
  {description:'Provisional motor vehicle rental tax',amount_cents:4630},
  {description:'Refundable security deposit',amount_cents:5000}
 ];
 const schemas={
  invoice:{kind:'invoice',...common,customer:'Sample customer (not a real renter)',date:'YYYY-MM-DD',
   due_date:'After company review',vehicle:'2026 Chevrolet Trailblazer - VIN pending',
   period:'Seven billed days - exact timestamps pending',items:sampleItems},
  receipt:{kind:'receipt',...common,customer:'Sample customer',date:'YYYY-MM-DD',
   payment_reference:'pi_EXAMPLEONLY12345',payout_status:'UNVERIFIED',
   amount_cents:30199,items:[{description:'Example rental payment - independent verification required',amount_cents:30199}]},
  extension:{kind:'extension',...common,customer:'Sample customer',vehicle:'2026 Chevrolet Trailblazer',
   period:'Seven days - exact dates and time zone pending',items:sampleItems},
  agreement:{kind:'agreement',...common,customer:'[Verified legal name]',
   vehicle:'[Year / make / model / verified VIN]',period:'[Exact pickup date/time/zone]',
   due_date:'[Exact return date/time/zone]'},
  letterhead:{kind:'letterhead',...common,date:'YYYY-MM-DD',recipient:'[Recipient]',
   subject:'[Reference / Subject]',body:'[Approved correspondence body]'}
 };
 let current='invoice';
 function show(kind){
  current=kind;
  byId('payload-preview').textContent=JSON.stringify(schemas[kind],null,2);
  byId('copy-state').textContent=kind+' schema loaded locally; no renter information sent to a server.';
 }
 for(const b of document.querySelectorAll('[data-example]')){
  b.addEventListener('click',()=>show(b.dataset.example));
 }
 const schema={version:'1.0.0',templates:Object.keys(schemas),
  formats:['docx','pdf','html','csv','json','zip'],
  safeguards:['original_word_master','draft_only_until_provider_evidence',
   'independent_stripe_verification','MFA_stafﬀ_gate','per_file_sha256','idempotency'],
  api:{catalog:'GET /api/v1/documents?mode=studio',
   generate:'POST /api/v1/documents?mode=generate (MFA staff session only)'}};
 function download(filename,source){
  const blob=new Blob([source],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  URL.revokeObjectURL(url);
 }
 byId('download-schema').addEventListener('click',()=>download('r-rent-document-schema.json',JSON.stringify(schema,null,2)));
 byId('download-payload').addEventListener('click',()=>download('r-rent-'+current+'-DRAFT.json',JSON.stringify(schemas[current],null,2)));
 byId('copy-payload').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(JSON.stringify(schemas[current],null,2));
   byId('copy-state').textContent='Example JSON copied.';}
  catch{byId('copy-state').textContent='Clipboard permission unavailable; select and copy the visible JSON.';}
 });
 fetch('/api/v1/documents?mode=studio',{cache:'no-store'})
  .then(async r=>{if(!r.ok)throw Error('catalog_unavailable');return r.json();})
  .then(v=>{
   byId('engine-state').textContent=v.live_export_connected?'PROTECTED RENDERER CONFIGURED':'PRIVATE RENDERER NOT CONNECTED';
   byId('gateway-note').textContent=v.live_export_connected
    ?'A private rendering service is configured. Live exports still require authenticated staff MFA and tenant-scoped evidence.'
    :'Automated DOCX/PDF exports require a separately configured private service and authenticated staff session. Local example JSON downloads are available here.';
  }).catch(()=>{byId('engine-state').textContent='ENGINE STATUS UNAVAILABLE';});
 show('invoice');
})();