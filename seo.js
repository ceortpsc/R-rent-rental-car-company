(function(){
"use strict";
const BASE="https://r-rent-rental-cars.vercel.app";
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
"/privacy":["Privacy Policy | R-Rent","Learn how R-Rent handles website requests, preliminary quotes, communications and prospective renter information."]
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
window.RRentSEO={update};
})();