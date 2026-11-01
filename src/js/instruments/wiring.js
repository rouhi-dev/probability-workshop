"use strict";
/* ---------- wiring ---------- */
["vPA","vPB","vPAB"].forEach(function(id){
  var el=$("#"+id); if(!el) return;
  el.addEventListener("input", function(){
    V.a=+$("#vPA").value; V.b=+$("#vPB").value; V.c=+$("#vPAB").value;
    renderVenn();
  });
});
$$("[data-run]").forEach(function(b){
  b.addEventListener("click", function(){ exRun(+b.getAttribute("data-run")); });
});
$("#expReset").addEventListener("click", function(){ EX.n=0; EX.nA=0; EX.hist=[]; drawExp(); fillExpReadout(); });
$("#cdfA").addEventListener("input", function(){ CD.a=+this.value; renderCdf(); });
$("#cdfZ").addEventListener("input", function(){ CD.z=+this.value; renderCdf(); });

var rz=null;
window.addEventListener("resize", function(){
  clearTimeout(rz); rz=setTimeout(function(){ drawExp(); drawCdf(); renderVenn(); }, 140);
});
$("#themeBtn").addEventListener("click", function(){
  setTimeout(function(){ drawExp(); drawCdf(); renderVenn(); }, 30);
});

renderExp();
renderVenn();
renderCdf();
