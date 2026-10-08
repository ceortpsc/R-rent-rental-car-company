import {method,failClosed} from '../../../lib/http.js';
export default async function handler(req,res) {
 if(!method(req,res,['POST']))return;
 // Intentional safety gate: never publish a "released" rental without identity, insurance,
 // authorized reviewer, valid contract, real payment and pre-drive condition evidence.
 return failClosed(res,'vehicle_release_locked','Authorized human dispatch and tamper-evident evidence are not yet operational.');
}
