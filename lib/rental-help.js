// Public-only R-Rent customer education; never exposes customer-specific agreement data.
export const HELP_GUIDES=Object.freeze({
 signing:{
  slug:"signing",title:"How to review and sign R-Rent rental documents",
  status:"PUBLIC_REVIEW_ONLY",
  introduction:"The public guided e-sign workspace is an unsigned review experience. A legally effective rental agreement needs a separately authenticated, approved signing process.",
  steps:[
   {id:"01",title:"Verify the invitation and exact agreement",detail:"Use an authorized invitation from R-Rent; verify recipient, renter/vehicle identifiers, pickup and return dates, price and revision. Never assume a generic link is an issued personal contract."},
   {id:"02",title:"Read the whole rental packet",detail:"Read all ten agreement/addendum sections, including vehicle condition, taxes, fees, mileage, fuel, tolls, returns and incident duties."},
   {id:"03",title:"Make separate optional elections",detail:"Choose whether to accept or decline any lawfully offered optional damage waiver. The optional $9/day coverage estimate does not establish bound insurance."},
   {id:"04",title:"Initial required sections",detail:"Provide your own initials on each required clause. Do not let a representative pre-fill another person's initials."},
   {id:"05",title:"Review electronic records consent",detail:"Read access and hardware requirements, how to get and keep a copy, paper alternatives and how to withdraw consent. Opt-in must be voluntary."},
   {id:"06",title:"Apply your own signature",detail:"Use the draw or type control only in an authenticated signing session. The public /signing drawing pad is a local practice workspace and is not a binding signature."},
   {id:"07",title:"Wait for server confirmation",detail:"The system must authenticate the signer, preserve the exact approved document hash and produce a final signed PDF with reliable audit evidence. Do not assume tapping a button means completed."},
   {id:"08",title:"Obtain signed copies",detail:"Obtain the verified renter copy and ensure the company retains its copy. If no certified record exists, contact R-Rent before relying on the agreement."}
  ],
  follow_up:["/signing","/agreements","/privacy","/contact"]
 },
 returning:{
  slug:"returning",title:"Preparing for vehicle return or drop-off",
  status:"GENERAL_GUIDANCE",
  introduction:"Follow the exact time, location, fuel, mileage and return procedures in your executed R-Rent agreement. Do not assume after-hours or unattended drop-off is allowed.",
  steps:[
   {id:"01",title:"Confirm the return appointment",detail:"Check the approved return time, location and contact channel. Arrange an extension or schedule change with R-Rent in advance; do not rely on a voicemail alone."},
   {id:"02",title:"Remove your belongings",detail:"Check the cabin, cargo space, glovebox and charging ports. Remove valuables and any personal data you paired with the vehicle."},
   {id:"03",title:"Check fuel and mileage",detail:"Use the actual contract fuel-return and mileage terms. Do not assume all rentals must be returned with a full tank; keep any applicable fueling receipt."},
   {id:"04",title:"Inspect vehicle condition",detail:"Note pre-existing marks and any new issues. Obtain condition photos through an approved method without photographing uninvolved people or exposing personal records."},
   {id:"05",title:"Gather keys and accessories",detail:"Have all issued keys, remotes, cards, chargers or agreed accessories ready. Do not leave keys or a vehicle unsecured."},
   {id:"06",title:"Complete an authorized handoff",detail:"Return the vehicle to the company-approved representative or confirmed secure drop-off process. An unstaffed location is not authorization to abandon the vehicle."},
   {id:"07",title:"Request check-in documentation",detail:"Ask for documented return date/time, odometer and fuel readings, condition notes, and a receipt or acknowledgment. Take note of the employee or approved drop-off instruction."},
   {id:"08",title:"Review the final statement",detail:"Compare any tolls, fuel, additional time, cleaning, condition or damage charges against the disclosed contract and supporting evidence. Dispute errors; legitimate refundable deposit holds follow provider rules."}
  ],
  follow_up:["/terms","/refund-policy","/disputes","/contact"]
 }
});
export function publicHelpGuide(name){
 const guide=HELP_GUIDES[name];
 if(!guide)return null;
 return JSON.parse(JSON.stringify(guide));
}
