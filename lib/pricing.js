export const FLEET=Object.freeze([
 Object.freeze({id:'trailblazer-2026',name:'2026 Chevrolet Trailblazer',daily_rate_cents:5900,rate_state:'owner_published_reference',bookable:false,photo_state:'awaiting_approved_original',transmission:'automatic',seats:5,engine_options:['1.2L turbo I3 137 hp','1.3L turbo I3 155 hp'],drive_options:['FWD','AWD available'],notes:'The actual trim, engine, drivetrain, color, odometer and installed features must be verified against the fleet record.'}),
 Object.freeze({id:'bronco-sport-big-bend-2026',name:'2026 Ford Bronco Sport Big Bend',daily_rate_cents:8999,rate_state:'owner_published_reference',bookable:false,photo_state:'awaiting_approved_original',transmission:'8-speed automatic',seats:5,engine:'1.5L EcoBoost turbo I3',horsepower:180,torque_lb_ft:200,drivetrain:'standard 4x4',drive_modes:5,notes:'Specifications are for the published Big Bend model; actual accessories and condition require fleet inspection.'})
]);
export const COVERAGE_OPTION=Object.freeze({label:'Optional protection / insurance program',daily_rate_cents:900,selectable_for_estimate:true,coverage_active:false,provider_verified:false,legal_review_required:true});
export function calculate(input){
 if(!input||typeof input!=='object')throw new Error('invalid_payload');
 const vehicle=FLEET.find(v=>v.id===input.vehicle_id);
 if(!vehicle)throw new Error('vehicle_unknown');
 if(input.insurance_selected!==undefined&&typeof input.insurance_selected!=='boolean')throw new Error('invalid_insurance_selection');
 const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;
 if(typeof input.pickup_at!=='string'||typeof input.return_at!=='string'||!iso.test(input.pickup_at)||!iso.test(input.return_at))throw new Error('timezone_required');
 const start=Date.parse(input.pickup_at),end=Date.parse(input.return_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('invalid_rental_period');
 const days=Math.ceil((end-start)/86400000);
 if(days<1||days>180)throw new Error('rental_days_out_of_range');
 const taxRate=days<=30?1000:625;
 const base=days*vehicle.daily_rate_cents;
 const stateTax=Math.round(base*taxRate/10000);
 const insuranceSelected=input.insurance_selected===true;
 const selectedOption=insuranceSelected?days*COVERAGE_OPTION.daily_rate_cents:0;
 return Object.freeze({
   vehicle_id:vehicle.id,vehicle_name:vehicle.name,days,daily_rate_cents:vehicle.daily_rate_cents,
   base_rental_cents:base,provisional_state_tax_cents:stateTax,
   insurance_selected:insuranceSelected,insurance_daily_cents:COVERAGE_OPTION.daily_rate_cents,
   optional_insurance_estimate_cents:selectedOption,
   insurance_status:'NOT_VERIFIED_NOT_BOUND',
   provisional_subtotal_cents:base+stateTax+selectedOption,currency:'USD',
   state_tax_rate:days<=30?'10%':'6.25%',
   excluded:['local_rental_tax','taxes_on_optional_products_pending_review','security_deposit','extra_mileage','fuel','tolls','additional_drivers','applicable_fees'],
   quote_status:'PROVISIONAL_ONLY',reservation_confirmed:false,payment_due:false,coverage_bound:false,
   notices:[
    'Renter may select the $9.00/day proposed optional coverage line for estimation only; this DOES NOT provide or bind insurance.',
    'The optional product requires carrier, pricing, licensing, coverage and tax approvals before it can be charged.',
    'Texas state vehicle rental tax is provisional and calculated only on vehicle rental base. Optional product tax treatment and local fees are not finalized.',
    'Renter license, identity, insurance policy, e-signature, inventory and final settlement must all be independently verified before vehicle release.'
   ]
 });
}
