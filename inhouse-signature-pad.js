// A standalone touch/pointer signature surface with no persistence.
// Coordinates are normalized (0..1); no raw identity data is placed in analytics.
export function mountInhousePad(canvas,options={}){
 if(!(canvas instanceof HTMLCanvasElement))throw Error('signature_canvas_required');
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('canvas_unavailable');
 const strokes=[];let active=null;
 const maxStrokes=80,maxPoints=4500;
 const clamp=v=>Math.min(1,Math.max(0,v));
 const p=ev=>{
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height)return null;
  return [Math.round(clamp((ev.clientX-r.left)/r.width)*10000)/10000,
   Math.round(clamp((ev.clientY-r.top)/r.height)*10000)/10000];
 };
 function reset(){
  strokes.length=0;active=null;ctx.clearRect(0,0,canvas.width,canvas.height);
  options.onChange?.(false);
 }
 function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#13263d';ctx.lineWidth=2.7;ctx.lineCap='round';ctx.lineJoin='round';
  for(const stroke of strokes){
   if(!stroke.length)continue;
   ctx.beginPath();ctx.moveTo(stroke[0][0]*canvas.width,stroke[0][1]*canvas.height);
   for(const pt of stroke.slice(1))ctx.lineTo(pt[0]*canvas.width,pt[1]*canvas.height);
   if(stroke.length===1)ctx.lineTo((stroke[0][0]*canvas.width)+.1,stroke[0][1]*canvas.height);
   ctx.stroke();
  }
  options.onChange?.(strokes.length>0);
 }
 function down(e){
  if(active||strokes.length>=maxStrokes)return;
  e.preventDefault();
  const pt=p(e);if(!pt)return;
  active={id:e.pointerId,stroke:[pt]};
  try{canvas.setPointerCapture(e.pointerId);}catch{}
  strokes.push(active.stroke);draw();
 }
 function move(e){
  if(!active||active.id!==e.pointerId)return;
  e.preventDefault();const pt=p(e);if(!pt)return;
  const count=strokes.reduce((n,s)=>n+s.length,0);
  if(count>=maxPoints)return;
  const prev=active.stroke[active.stroke.length-1];
  if(Math.abs(prev[0]-pt[0])+Math.abs(prev[1]-pt[1])<.001) return;
  active.stroke.push(pt);draw();
 }
 function up(e){if(active&&active.id===e.pointerId){active=null;options.onChange?.(strokes.length>0);}}
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('lostpointercapture',up);
 return Object.freeze({
  clear:reset,
  hasSignature:()=>strokes.reduce((n,s)=>n+s.length,0)>=3,
  getStrokes:()=>strokes.map(s=>s.map(pt=>[...pt])),
  destroy:()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
   canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);reset();}
 });
}
