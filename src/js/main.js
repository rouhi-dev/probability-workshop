"use strict";
/* ---------- boot ---------- */
/* مسیریابی: "#v-a1/p3" یعنی نمای میزکار با پارامتر p3.
   نماهای قدیمی ("#v-l1") بدون تغییر کار می‌کنند. */
function hashParts(){
  var raw = (location.hash || "").replace(/^#/, "");
  if(!raw) return {view:"v-dash", param:null};
  var bits = raw.split("/");
  return {view:bits[0] || "v-dash", param:bits[1] || null};
}
function viewIdFromHash(){
  var hp = hashParts();
  if(hp.view === "v-a1" && hp.param) return "v-a1w";
  return hp.view;
}
function renderAll(){
  renderNav(); renderDash(); renderRoad(); renderThm(); renderPre(); renderGraph();
  renderQuiz("quizL1"); renderQuiz("quizQ");
  renderEx("exL1"); renderEx("exQ");
  renderA1Dash(); renderExam();
  var hp = hashParts();
  if(hp.view === "v-a1" && hp.param) renderA1Work(hp.param);
}
function redrawVisible(){
  var v = viewIdFromHash();
  if(typeof drawExp!=="function") return;
  if(v==="v-l1"){ drawExp(); renderVenn(); }
  if(v==="v-q"){ drawCdf(); }
  if(v==="v-a1w" && typeof drawPoisson==="function") drawA1Instruments(hashParts().param);
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
  if(markViewRead("#"+hashParts().view)) renderDash();
  var hp = hashParts();
  if(hp.view === "v-a1" && hp.param){
    a1State(hp.param).read = 1; save();
    renderA1Work(hp.param);
  }
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
  ST = {topics:{},quiz:{},ex:{},pre:{},thm:{},read:{},a1:{},exam:{}};
  try{ localStorage.removeItem(LSKEY); }catch(e){}
  if(dbRef) dbRef.set({state:ST, at:new Date().toISOString()}).catch(function(){});
  renderAll();
});
/* ترتیب مهم است: اول پیشرفتِ ذخیره‌شده را بخوان، بعد رندر کن.
   اگر برعکس باشد، هر بار بارگذاری مجدد داشبورد خالی نشان می‌دهد. */
loadLocal();
markViewRead("#"+hashParts().view);
if(hashParts().view==="v-a1" && hashParts().param) a1State(hashParts().param).read = 1;
renderAll();
setTimeout(redrawVisible, 50);
initPersistence();
if(window.MathJax && MathJax.startup && MathJax.startup.promise){
  MathJax.startup.promise.then(function(){ typeset(); });
}
