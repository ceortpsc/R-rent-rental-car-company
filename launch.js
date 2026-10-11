(function(){
"use strict";
const $=id=>document.getElementById(id);
let report=null;
const SAFE_ROUTES=new Set(["/","/book","/fleet","/resources","/support/chat","/operations","/requirements","/signing","/fees","/disputes"]);
function div(className){const e=document.createElement("div");e.className=className;return e;}
function element(tag,content,className){
 const node=document.createElement(tag);node.textContent=content;if(className)node.className=className;return node;
}
function show(){
 const container=$("module-list");container.replaceChildren();
 const filter=$("module-filter").value;
 if(!report?.modules){container.append(element("p","No verified server report is available."));return;}
 const entries=report.modules.filter(m=>filter==="all"||m.phase===filter);
 for(const module of entries){
  const card=document.createElement("article");card.className="module";
  const top=div("module-top");
  const left=div("");left.append(element("h3",module.name));
  const status=element("span",module.status.replaceAll("_"," "),"module-status");top.append(left,status);card.append(top);
  card.append(element("p",module.phase==="public"?
   "Public-facing implementation is in source control; this report does not verify browser reachability.":
   "Privileged operation remains disabled pending approved configuration and independent evidence."));
  if(Array.isArray(module.missing_configuration)&&module.missing_configuration.length){
   card.append(element("strong","Missing configuration:"));const list=document.createElement("ul");
   for(const key of module.missing_configuration){list.append(element("li",key));}card.append(list);
  }
  if(Array.isArray(module.missing_evidence)&&module.missing_evidence.length){
   card.append(element("strong","Missing independently verified evidence:"));const list=document.createElement("ul");
   for(const key of module.missing_evidence){list.append(element("li",key.replaceAll("_"," ")));}card.append(list);
  }
  const link=document.createElement("a");link.href=SAFE_ROUTES.has(module.route)?module.route:"/operations";
  link.textContent="View associated page →";card.append(link);
  const line=element("p","Risk: "+module.risk+" · API: "+(module.api||"No live public endpoint") ,"meta");card.append(line);
  container.append(card);
 }
}
async function refresh(){
 const status=$("report-message");status.textContent="Requesting a current server configuration assessment…";
 $("download-log").disabled=true;
 try{
  const response=await fetch("/api/v1/launch",{method:"GET",cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.modules)||data.release_status!=="NOT_CERTIFIED_FOR_FULL_TRANSACTIONS")throw Error("invalid or non-compliant report");
  report=data;
  $("release-status").textContent="NOT CERTIFIED";
  $("public-count").textContent=String(data.public_code_modules)+" public source modules";
  $("locked-count").textContent=String(data.restricted_locked)+" restricted";
  $("report-timestamp").textContent=data.generated_at?new Date(data.generated_at).toLocaleString():"Unavailable";
  status.textContent="Live configuration assessment received. No independent production approvals or customer transactions have been validated.";
  $("download-log").disabled=false;show();
 }catch(e){
  report=null;
  $("release-status").textContent="UNKNOWN — NO REPORT";
  $("public-count").textContent="Not verified";$("locked-count").textContent="Not verified";$("report-timestamp").textContent="No response";
  status.textContent="Report unavailable: "+e.message+". No services have been marked live.";show();
 }
}
$("module-filter").addEventListener("change",show);
$("refresh").addEventListener("click",refresh);
$("download-log").addEventListener("click",()=>{
 if(!report)return;
 const payload=JSON.stringify(report,null,2)+"\n";
 const blob=new Blob([payload],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");
 a.href=url;a.download="r-rent-release-gates-not-certified.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
refresh();
})();