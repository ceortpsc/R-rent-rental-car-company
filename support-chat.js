(function(){
"use strict";
const $=id=>document.getElementById(id);
let busy=false;
const ALLOWED={"/book":true,"/fleet":true,"/fees":true,"/requirements":true,"/agreements":true,"/signing":true,"/privacy":true,"/terms":true,"/contact":true,"/complaints":true,"/disputes":true,"/refund-policy":true,"/resources":true};
function add(role,message,links){
 const box=document.createElement("div");box.className="message "+(role==="user"?"user":"assistant");
 const label=document.createElement("span");label.className="speaker";label.textContent=role==="user"?"You (local display)":"Andreaa • Automated support";
 const p=document.createElement("p");p.textContent=message;box.append(label,p);
 if(links?.length&&role!=="user"){
  const group=document.createElement("div");group.className="resource-links";
  for(const path of links.filter(k=>ALLOWED[k]).slice(0,4)){
   const a=document.createElement("a");a.href=path;a.textContent=path.replace("/","").replaceAll("-"," ")+" →";group.append(a);
  }box.append(group);
 }
 $("chat-thread").append(box);$("chat-thread").scrollTop=$("chat-thread").scrollHeight;
}
async function ask(text){
 const msg=String(text||"").trim();if(!msg||busy)return;
 busy=true;$("chat-send").disabled=true;
 $("chat-status").textContent="Checking published policy guidance…";
 try{
  const resp=await fetch("/api/v1/support/chat",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",cache:"no-store",body:JSON.stringify({message:msg})});
  const body=await resp.json();
  if(body.status==="sensitive_content_blocked"){
   add("assistant",body.answer,body.links);$("chat-status").textContent="Message withheld to reduce sensitive-data exposure.";return;
  }
  if(body.ok){add("user",msg);add("assistant",body.answer,body.links);$("chat-status").textContent=body.handoff?"This topic may need authorized human assistance. Use the displayed links.":"Answered from R-Rent's public policy library. No customer file accessed.";}
  else{add("assistant",body.answer||"The service cannot answer this request. Use R-Rent contact options.",body.links);}
 }catch{
  add("assistant","Support policy service is unavailable. Please use the official contact page. No question has been submitted as a support ticket.",["/contact"]);
  $("chat-status").textContent="Connection unavailable — no customer-support ticket created.";
 }finally{busy=false;$("chat-send").disabled=false;}
}
$("chat-form").addEventListener("submit",e=>{e.preventDefault();const value=$("chat-input").value;$("chat-input").value="";ask(value);});
document.querySelectorAll("[data-question]").forEach(btn=>btn.addEventListener("click",()=>ask(btn.dataset.question)));
})();