"use strict";
/* ---------- roadmap ---------- */
function renderRoad(){
  var rows = ROADMAP.map(function(r){
    var sts = r.topics.map(statusOf);
    var tag = r.topics.length===0 ? '<span class="pill mid">آزمون</span>'
      : sts.every(function(s){return s==="mastered";}) ? '<span class="pill ok">تمام</span>'
      : sts.some(function(s){return s!=="todo";}) ? '<span class="pill d">جریان دارد</span>' : '<span class="pill">پیش رو</span>';
    return '<tr>'+
      '<td class="n" style="font-size:16px;color:var(--cont)">'+fa(r.d)+'</td>'+
      '<td><b>'+r.t+'</b><div style="font-size:12px;color:var(--muted);font-family:var(--mono);margin-top:2px">'+esc(r.ref)+'</div>'+
        '<div style="margin-top:5px">'+tag+'</div></td>'+
      '<td style="font-size:13px">'+r.concept+'</td>'+
      '<td style="font-size:13px">'+r.prob+'</td>'+
      '<td style="font-size:13px;color:var(--ink-2)">'+r.math+'</td>'+
    '</tr>';
  }).join("");
  $("#roadTable").innerHTML =
    '<thead><tr><th>روز</th><th style="min-width:210px">موضوع و مرجع</th>'+
    '<th style="min-width:200px">مفهوم و اثبات · ۱۰۰′</th><th style="min-width:190px">حل مسئله · ۵۰′</th>'+
    '<th style="min-width:170px">ریاضی · ۳۰′</th></tr></thead><tbody>'+rows+'</tbody>';
}
