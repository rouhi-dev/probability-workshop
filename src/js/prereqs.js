"use strict";
/* ---------- prereq cards ---------- */
function renderPre(){
  $("#preCards").innerHTML = PREREQS.map(function(p){
    var v = ST.pre[p.id]||0;
    return '<div class="ex"><div class="hd"><span class="id">'+p.id.toUpperCase()+'</span>'+
      '<b style="font-size:15px">'+p.n+'</b>'+
      '<span class="st"><span class="pill '+(v===0?"":v<3?"no":v===3?"mid":"ok")+'">'+
        (v===0?"ارزیابی‌نشده":v===1?"بلد نیستم":v===2?"ضعیف":v===3?"قابل قبول":"مسلط")+'</span></span></div>'+
      '<p class="bd"><b>چرا لازم است:</b> '+p.why+'</p>'+
      '<p class="bd" style="color:var(--ink-2)"><b>معیار «بلدم»:</b> '+p.need+'</p>'+
      '<div style="font-size:12px;color:var(--muted);font-family:var(--mono);margin-top:6px">روز '+fa(p.day)+'</div>'+
    '</div>';
  }).join("");
  typeset($("#preCards"));
}
