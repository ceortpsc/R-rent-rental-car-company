(function(){
"use strict";
const KEY="rrent-preferred-theme";
let choice="light";try{const saved=localStorage.getItem(KEY);if(saved==="light"||saved==="dark")choice=saved;}catch(e){}
document.documentElement.dataset.theme=choice;
function update(){const button=document.getElementById("theme-toggle");if(!button)return;const dark=document.documentElement.dataset.theme==="dark";button.textContent=dark?"☀ Light mode":"☾ Dark mode";button.setAttribute("aria-label","Switch to "+(dark?"light":"dark")+" color mode");button.setAttribute("aria-pressed",String(dark));}
function init(){const b=document.getElementById("theme-toggle");if(!b)return;b.onclick=function(){const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem(KEY,next);}catch(e){}update();};update();}
window.RRentTheme={init};
})();