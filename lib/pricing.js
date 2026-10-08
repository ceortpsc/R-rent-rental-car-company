export const FLEET=Object.freeze([
  {id:'trailblazer-2026',name:'2026 Chevrolet Trailblazer',daily_rate_cents:5900,rate_state:'reference_only',bookable:false,photo_state:'illustration',transmission:'automatic'},
  {id:'bronco-sport-big-bend-2026',name:'2026 Ford Bronco Sport Big Bend',daily_rate_cents:null,rate_state:'unapproved',bookable:false,photo_state:'illustration',transmission:'automatic'}
]);
export function calculate(input){
  if(!input||typeof input!=='object')throw new Error('invalid_payload');
  const vehicle=FLEET.find(v=>v.id===input.vehicle_id);
  if(!vehicle)throw new Error('vehicle_unknown');
  if(vehicle.daily_rate_cents===null)throw new Error('rate_unavailable');
  const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;
  if(typeof input.pickup_at!=='string'||typeof input.return_at!=='string'||!iso.test(input.pickup_at)||!iso.test(input.return_at))throw new Error('timezone_required');
  const start=Date.parse(input.pickup_at),end=Date.parse(input.return_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('invalid_rental_period');
  const days=Math.ceil((end-start)/86400000);
  if(days<1||days>180)throw new Error('rental_days_out_of_range');
  // These are TEXAS STATE rates for qualifying car rentals, not a complete fee/tax determination.
  const rate=days<=30?1000:625;
  const subtotal=days*vehicle.daily_rate_cents;
  const stateTax=Math.round(subtotal*rate/10000);
  return Object.freeze({
    vehicle_id:vehicle.id,days,daily_rate_cents:vehicle.daily_rate_cents,
    base_rental_cents:subtotal,provisional_state_tax_cents:stateTax,
    provisional_subtotal_cents:subtotal+stateTax,currency:'USD',
    state_tax_rate:days<=30?'10%':'6.25%',
    excluded:['insurance','local_rental_tax','optional_addons','security_deposit','applicable_fees'],
    quote_status:'PROVISIONAL_ONLY',reservation_confirmed:false,
    payment_due:false,
    notices:['Pickup/return require exact times with UTC offsets. Billing rounds partial 24-hour days up in this preliminary model.','Texas state rental tax shown for reference; final applicability, local tax and exclusions must be reviewed.','No company insurance premium or option is quoted; coverage cannot be presumed active.']
  });
}
