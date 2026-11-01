"use strict";
/* ---------- theorems ---------- */
function renderThm(){
  $("#thmList").innerHTML = THEOREMS.map(function(t){
    var v = ST.thm[t.id]||0;
    var cls = t.tag==="تمرین استاد"?"mid":t.tag==="سطح ارشد"?"d":t.tag==="کلیدی"?"c":"";
    return '<div class="ex"><div class="hd">'+
      '<span class="id">'+t.id.toUpperCase()+'</span>'+
      '<span class="pill '+cls+'">'+t.tag+'</span>'+
      '<span class="st">'+[["۱","نشنیده‌ام"],["۲","خوانده‌ام"],["۳","می‌توانم بنویسم"]].map(function(o,i){
        return '<button class="btn" style="padding:2px 9px;font-size:12px'+(v===i+1?';background:var(--cont);border-color:var(--cont);color:var(--on-accent)':'')+'" data-thm="'+t.id+'" data-v="'+(i+1)+'">'+o[1]+'</button>';
      }).join("")+'</span></div>'+
      '<div class="bd" style="font-size:15px">'+t.s+'</div>'+
      '<details><summary>راهبرد اثبات (نه پاسخ کامل)</summary><div class="h">'+t.strat+'</div></details>'+
      '<details><summary>دامی که در این اثبات کمین کرده</summary><div class="h">'+t.trap+'</div></details>'+
    '</div>';
  }).join("");
  $("#thmList").querySelectorAll("[data-thm]").forEach(function(b){
    b.addEventListener("click", function(){
      var id=b.getAttribute("data-thm"), v=+b.getAttribute("data-v");
      ST.thm[id] = (ST.thm[id]===v?0:v); save(); renderThm();
    });
  });
  typeset($("#thmList"));
}
