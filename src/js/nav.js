"use strict";
/* ---------- nav ---------- */
var NAV = [
  {g:"مرور کلی"},
  {id:"v-dash", t:"داشبورد"},
  {id:"v-road", t:"نقشهٔ راه ۱۴ روزه"},
  {id:"v-map",  t:"نقشهٔ وابستگی مفاهیم"},
  {id:"v-thm",  t:"فهرست اثبات‌ها"},
  {id:"v-pre",  t:"پیش‌نیازهای ریاضی"},
  {g:"تمرین سری اول"},
  {id:"v-a1",   t:"حل عمیق ۱۱ مسئله", a1:true},
  {id:"v-exam", t:"آزمون تمرینی"},
  {g:"درس‌ها"},
  {id:"v-l1",  t:"۱ · آزمایش، فضای نمونه، پیشامد", topics:["exp","event","sigma"]},
  {id:"v-q",   t:"پرسش استاد · ناپیوستگی و CDF", topics:["cdf"]},
  {lock:true, t:"۲ · اصول کلموگروف و قضیه‌ها"},
  {lock:true, t:"۳ · احتمال شرطی"},
  {lock:true, t:"۴ · استقلال"},
  {lock:true, t:"۵ · احتمال کل و بیز"}
];
function renderNav(){
  var cur = viewIdFromHash();
  if(cur === "v-a1w") cur = "v-a1";   /* میزکار مسئله، زیرمجموعهٔ تمرین است */
  var h = NAV.map(function(n){
    if(n.g) return '<div class="grp">'+n.g+'</div>';
    if(n.lock) return '<a class="locked" title="پس از نمایش تسلط در درس قبل باز می‌شود"><span class="dot"></span>'+n.t+' 🔒</a>';
    var dot="";
    if(n.a1){
      var ms = ASSIGNMENT.problems.filter(function(x){ return a1Status(x.id)==="mastered"; }).length;
      var any = ASSIGNMENT.problems.some(function(x){ return a1Status(x.id)!=="todo"; });
      dot = ms===ASSIGNMENT.problems.length ? " mastered" : (any ? " learning" : "");
    }
    if(n.topics){
      var sts = n.topics.map(statusOf);
      var worst = sts.indexOf("todo")>=0 ? (sts.every(function(s){return s==="todo";})?"todo":"learning")
                : sts.indexOf("practice")>=0 ? "practice"
                : sts.every(function(s){return s==="mastered";}) ? "mastered" : "learning";
      dot = ' '+worst;
    }
    return '<a href="#'+n.id+'" class="'+(n.id===cur?"on":"")+'"><span class="dot'+dot+'"></span>'+n.t+'</a>';
  }).join("");
  $("#rail").innerHTML = h;
  var shown = viewIdFromHash();
  $$(".view").forEach(function(v){ v.hidden = (v.id!==shown); });
  var lockedNote = $("#rail").querySelectorAll("a.locked");
  Array.prototype.forEach.call(lockedNote, function(a){
    a.addEventListener("click", function(ev){ ev.preventDefault(); });
  });
}
