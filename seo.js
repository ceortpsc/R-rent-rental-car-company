(function(){
"use strict";
const BASE="https://rtpscrentalcars.com";
const copy={
"/":{heading:"Drive More. Go Further.",subtitle:"Your next rental starts with transparent daily rates and a clear path from quote to approval."},
"/fleet":{heading:"Explore Our Fleet",subtitle:"Two distinctive SUVs, detailed model information and transparent starting rates for Central Texas."},
"/fleet/trailblazer-2026":{heading:"2026 Chevrolet Trailblazer",subtitle:"Everyday versatility and a $59.00/day published reference rate."},
"/fleet/bronco-sport-2026":{heading:"2026 Ford Bronco Sport Big Bend",subtitle:"Adventure-ready compact SUV with a published reference rate of $89.99/day."},
"/book":{heading:"Build Your Rental Quote",subtitle:"Choose your SUV, dates and optional $9/day insurance estimate; no booking or coverage is confirmed."},
"/requirements":{heading:"Driver & Insurance Requirements",subtitle:"Understand license, coverage and authorized-driver checks before a vehicle can be released."},
"/agreements":{heading:"Rental Agreements & Addendums",subtitle:"Review the required rental documents, optional elections and digital-signature safeguards."},
"/fees":{heading:"Rental Prices, Fees & Taxes",subtitle:"Review daily vehicle rates, optional insurance pricing and charges that require final disclosure."},
"/security":{heading:"Safety, Identity & Payment Controls",subtitle:"Understand R-Rent's security architecture and what must be verified before a rental is approved."},
"/portal":{heading:"Customer Account Access",subtitle:"Private reservations, documents and statements require secure authentication; account access is not yet active."},
"/admin":{heading:"Staff & Rental Operations",subtitle:"Administrative tools are restricted until approved authorization and role-based access are active."},
"/about":{heading:"About R-Rent",subtitle:"Independent Central Texas vehicle rentals from a division of Ross Tax Pro Software Company."},
"/contact":{heading:"Contact Our Rental Team",subtitle:"Request general assistance, send feedback or find the right billing and complaint channel."},
"/feedback":{heading:"Share Your Feedback",subtitle:"Tell us about your experience and help us improve our rental services."},
"/reviews":{heading:"Customer Reviews",subtitle:"Read our review standards and prepare feedback based on your real rental experience."},
"/complaints":{heading:"File a Customer Complaint",subtitle:"Prepare a detailed service complaint for human review; secure case filing is not yet active."},
"/disputes":{heading:"Dispute a Charge",subtitle:"Prepare a billing inquiry, ask for itemization and retain your payment-dispute rights."},
"/refund-policy":{heading:"Refunds & Cancellation Policy",subtitle:"Understand proposed nonrefundable charges, lawful exceptions, deposits and dispute protections."},
"/access":{heading:"Secure Customer Access",subtitle:"Account sign-in and protected records remain unavailable until identity and authorization gates are verified."},
"/terms":{heading:"Terms of Service",subtitle:"Review our website conditions, rental policies and your rights before any binding transaction."},
"/privacy":{heading:"Privacy Policy",subtitle:"Understand our current data practices, planned protected workflows and privacy request options."}
};
const pages={
"/":["R-Rent | Central Texas Vehicle Rentals","Explore R-Rent's 2026 Chevrolet Trailblazer ($59/day) and Ford Bronco Sport Big Bend ($89.99/day). Get a preliminary rental quote in Central Texas."],
"/fleet":["2026 SUVs for Rent | R-Rent Central Texas","Browse R-Rent's Chevrolet Trailblazer and Ford Bronco Sport Big Bend with preliminary rates, vehicle details and rental requirements."],
"/fleet/trailblazer-2026":["2026 Chevrolet Trailblazer Rental | $59/Day | R-Rent","Review manufacturer model specifications and calculate a preliminary $59/day Trailblazer rental quote for Central Texas."],
"/fleet/bronco-sport-2026":["2026 Ford Bronco Sport Big Bend | $89.99/Day | R-Rent","Browse Ford Bronco Sport Big Bend specifications and get an $89.99/day preliminary rental estimate for Central Texas."],
"/book":["Build Your Rental Quote | R-Rent","Select a vehicle, pickup and return dates, and optionally estimate $9/day proposed insurance without binding coverage or making a booking."],
"/requirements":["Driver & Insurance Requirements | R-Rent","Learn about R-Rent's planned driver ID, insurance, e-signature, payment and human approval requirements."],
"/fees":["Rental Prices & Disclosures | R-Rent","Compare $59/day Trailblazer and $89.99/day Bronco Sport reference pricing, and optional $9/day proposed coverage subject to approval."],
"/about":["About R-Rent | Ross Tax Pro Software Company","Meet R-Rent, an independent vehicle rental division operated by Ross Tax Pro Software Company."],
"/contact":["Contact R-Rent | Customer Support","Contact R-Rent about rental estimates, inquiries, complaints and billing concerns."],
"/terms":["Terms of Service | R-Rent","Read R-Rent's website terms, estimated pricing, eligibility, payments, cancellation policies and renter rights."],
"/privacy":["Privacy Policy | R-Rent","Learn how R-Rent handles website requests, preliminary quotes, communications and prospective renter information."],
"/agreements":["Rental Agreements & E-Sign | R-Rent","R-Rent rental contract library, optional waivers, fee disclosures and gated electronic signing process."],
"/security":["R-Rent Verification & Security | Rental Gates","Explore identity, insurance, signed agreements, fraud protection and staff authorization requirements for R-Rent."],
"/portal":["R-Rent Customer Portal | Access Not Yet Enabled","Secure account access is awaiting provider configuration and verification."],
"/admin":["R-Rent Staff Administration | Restricted Access","Staff dashboard restricted until secure roles and MFA are enabled."],
"/feedback":["Customer Feedback | R-Rent","Share feedback through R-Rent's public contact drafting interface; no ticket is filed until sent."],
"/reviews":["R-Rent Customer Reviews | Review Standards","Read R-Rent review standards and share genuine feedback; no fabricated review ratings."],
"/complaints":["File a Customer Complaint | R-Rent","Prepare a customer service complaint and contact the team for review."],
"/disputes":["Dispute a Rental Charge | R-Rent","Request an itemized billing review and preserve cardholder dispute rights."],
"/refund-policy":["Refund & Cancellation Policy | R-Rent","Review R-Rent's proposed nonrefundable fee policy, statutory exceptions and deposit provisions."],
"/access":["Secure Account Access | R-Rent","Learn about protected customer accounts, OAuth readiness and identity verification safeguards."],
};
function upsert(selector,tag,attrs){let element=document.querySelector(selector);if(!element){element=document.createElement(tag);Object.entries(attrs).forEach(([key,val])=>element.setAttribute(key,val));document.head.appendChild(element);}return element;}
function update(path){
 const p=pages[path]||["R-Rent | Vehicle Rental Division","R-Rent: vehicle rentals, customer policies, preliminary quotes and service information in Central Texas."];
 const url=BASE+(path==="/"?"/":path);
 document.title=p[0];
 upsert('meta[name="description"]','meta',{name:"description"}).content=p[1];
 upsert('meta[name="robots"]','meta',{name:"robots"}).content=['/access','/portal','/admin','/sign'].includes(path)?"noindex,nofollow":"index,follow";
 upsert('link[rel="canonical"]','link',{rel:"canonical"}).href=url;
 upsert('meta[property="og:title"]','meta',{property:"og:title"}).content=p[0];
 upsert('meta[property="og:description"]','meta',{property:"og:description"}).content=p[1];
 upsert('meta[property="og:type"]','meta',{property:"og:type"}).content="website";
 upsert('meta[property="og:url"]','meta',{property:"og:url"}).content=url;
 upsert('meta[name="twitter:card"]','meta',{name:"twitter:card"}).content="summary";
 const data={"@context":"https://schema.org","@type":path.startsWith("/fleet/")?"Product":"AutoRental","name":path==="/fleet/trailblazer-2026"?"2026 Chevrolet Trailblazer":path==="/fleet/bronco-sport-2026"?"2026 Ford Bronco Sport Big Bend":"R-Rent Rental Car Division","description":p[1],"url":url};
 if(path.startsWith("/fleet/")){data.brand={"@type":"Brand","name":path.includes("trailblazer")?"Chevrolet":"Ford"};data.offers={"@type":"Offer","priceCurrency":"USD","price":path.includes("trailblazer")?"59.00":"89.99","priceSpecification":{"@type":"UnitPriceSpecification","priceCurrency":"USD","price":path.includes("trailblazer")?"59.00":"89.99","unitCode":"DAY"},"description":"Nonbinding reference price; reservation and vehicle availability require staff confirmation."};}
 else{data.areaServed={"@type":"Place","name":"Central Texas"};data.parentOrganization={"@type":"Organization","name":"Ross Tax Pro Software Company"};}
 let script=document.querySelector('script[data-r-rent-schema]');if(!script){script=document.createElement("script");script.type="application/ld+json";script.dataset.rRentSchema="true";document.head.appendChild(script);}script.textContent=JSON.stringify(data);
}
window.RRentSEO={update,copy};
})();