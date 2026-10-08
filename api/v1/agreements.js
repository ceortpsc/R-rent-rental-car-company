import {method,reply,failClosed} from '../../lib/http.js';
export default async function handler(req,res){
 if(!method(req,res,['GET','POST']))return;
 if(req.method==='POST')return failClosed(res,'esign_not_authorized','E-signature execution requires approved documents, verified signers and a connected signing provider.');
 reply(res,200,{documents:[
 {code:'RA-001',name:'Motor Vehicle Rental Agreement',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-002',name:'Vehicle Inspection & Return Checklist',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-003',name:'Insurance and Coverage Disclosure',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-004',name:'Optional Damage Waiver Election',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-005',name:'Authorized Additional Driver',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-006',name:'Payment, Deposit and Fee Disclosure',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-007',name:'Toll, Fuel and Late Return Policy',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-008',name:'Roadside and Incident Response',legal_status:'DRAFT_REQUIRES_REVIEW'},
 {code:'RA-009',name:'E-Sign Consent and Digital Delivery',legal_status:'DRAFT_REQUIRES_REVIEW'}],signing_enabled:false});
}
