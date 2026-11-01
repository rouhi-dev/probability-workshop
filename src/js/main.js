"use strict";
/* ---------- boot ---------- */
function renderAll(){
  renderNav(); renderDash(); renderRoad(); renderThm(); renderPre(); renderGraph();
  renderQuiz("quizL1"); renderQuiz("quizQ");
  renderEx("exL1"); renderEx("exQ");
}
function redrawVisible(){
  var h = location.hash;
  if(typeof drawExp!=="function") return;
  if(h==="#v-l1"){ drawExp(); renderVenn(); }
  if(h==="#v-q"){ drawCdf(); }
}
/* کدام مباحث با باز کردن یک درس «در حال یادگیری» می‌شوند.
   خواندن هرگز به «تسلط» نمی‌رسد — آن فقط از آزمون و تمرین می‌آید. */
var READ_ON_VIEW = { "#v-l1":["exp","event","sigma"], "#v-q":["cdf"] };
function markViewRead(hash){
  var ids = READ_ON_VIEW[hash];
  if(!ids) return false;
  var changed = false;
  ids.forEach(function(id){ if(!ST.read[id]){ ST.read[id]=1; changed=true; } });
  if(changed) save();
  return changed;
}
window.addEventListener("hashchange", function(){
  if(markViewRead(location.hash)) renderDash();
  renderNav();
  try{ window.scrollTo(0,0); }catch(e){}
  setTimeout(redrawVisible, 20);
});
document.documentElement.dir = "rtl";
document.documentElement.lang = "fa";
$("#themeBtn").addEventListener("click", function(){
  var r=document.documentElement, cur=r.getAttribute("data-theme");
  var sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches;
  var next = cur ? (cur==="dark"?"light":"dark") : (sysDark?"light":"dark");
  r.setAttribute("data-theme", next);
  try{ localStorage.setItem(LSKEY+"-theme", next); }catch(e){}
});
try{ var th=localStorage.getItem(LSKEY+"-theme"); if(th) document.documentElement.setAttribute("data-theme",th); }catch(e){}
$("#resetBtn").addEventListener("click", function(){
  if(!confirm("کل پیشرفت، پاسخ آزمون‌ها و متن تمرین‌ها پاک می‌شود. مطمئنید؟")) return;
  ST = {topics:{},quiz:{},ex:{},pre:{},thm:{},read:{}};
  try{ localStorage.removeItem(LSKEY); }catch(e){}
  if(dbRef) dbRef.set({state:ST, at:new Date().toISOString()}).catch(function(){});
  renderAll();
});
/* ترتیب مهم است: اول پیشرفتِ ذخیره‌شده را بخوان، بعد رندر کن.
   اگر برعکس باشد، هر بار بارگذاری مجدد داشبورد خالی نشان می‌دهد. */
loadLocal();
markViewRead(location.hash);
renderAll();
setTimeout(redrawVisible, 50);
initPersistence();
if(window.MathJax && MathJax.startup && MathJax.startup.promise){
  MathJax.startup.promise.then(function(){ typeset(); });
}
