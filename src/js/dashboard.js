"use strict";
/* ---------- dashboard ---------- */
function renderDash(){
  var all = TOPICS.map(function(t){ return statusOf(t.id); });
  var cnt = {todo:0,learning:0,practice:0,mastered:0};
  all.forEach(function(s){ cnt[s]++; });
  var exDone = Object.keys(ST.ex).filter(function(k){ return ST.ex[k].st==="done"; }).length;
  var exTot = Object.keys(EXERCISES).reduce(function(a,k){ return a+EXERCISES[k].length; },0);
  var qa=0, qr=0, qt=0;
  Object.keys(QUIZZES).forEach(function(qid){
    qt += QUIZZES[qid].items.length;
    var st = ST.quiz[qid]||{};
    QUIZZES[qid].items.forEach(function(_,i){
      if(st[i]!==undefined && st[i]!==null){ qa++; if(st[i]===-1) qr++; }
    });
  });
  var weak = PREREQS.filter(function(p){ return (ST.pre[p.id]||0)>0 && (ST.pre[p.id]||0)<3; }).length;
  var unrated = PREREQS.filter(function(p){ return !ST.pre[p.id]; }).length;

  $("#kpis").innerHTML = [
    kpi("مباحث با تسلط", cnt.mastered+'<small> از '+TOPICS.length+'</small>', cnt.mastered/TOPICS.length, ""),
    kpi("در حال یادگیری", cnt.learning, 0, null),
    kpi("نیازمند تمرین بیشتر", cnt.practice, 0, null, "disc"),
    kpi("تمرین‌های ثبت‌شده", exDone+'<small> از '+exTot+'</small>', exDone/exTot, ""),
    kpi("پاسخ درست آزمون", qr+'<small> از '+qa+' پاسخ‌داده</small>', qa?qr/qa:0, ""),
    kpi("نقاط ضعف ریاضی", weak+'<small> ضعیف، '+unrated+' ارزیابی‌نشده</small>', 0, null, "warn")
  ].join("");

  // readiness
  var wTot=0, wGot=0;
  TOPICS.forEach(function(t){
    wTot += t.w;
    var s = statusOf(t.id);
    wGot += t.w * (s==="mastered"?1 : s==="practice"?0.45 : s==="learning"?0.2 : 0);
  });
  var pct = Math.round(100*wGot/wTot);
  var verdict = pct>=80 ? ["آماده","var(--good)"] : pct>=55 ? ["در مسیر، اما شکاف دارید","var(--warn)"]
              : pct>=25 ? ["هنوز زود است","var(--disc)"] : ["آغاز مسیر","var(--muted)"];
  $("#readiness").innerHTML =
    '<div class="kpi" style="padding:16px 18px">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">'+
        '<span class="k">شاخص آمادگی وزن‌دار</span>'+
        '<span style="font-family:var(--mono);font-size:13px;color:'+verdict[1]+'">'+verdict[0]+'</span></div>'+
      '<div class="n" style="font-size:38px">'+pct+'<small>٪</small></div>'+
      '<div class="meter"><i style="width:'+pct+'%;background:'+verdict[1]+'"></i></div>'+
      '<p style="font-size:12.8px;color:var(--ink-2);margin:10px 0 0">وزن‌ها: متغیر تصادفی، CDF، PDF، اصول موضوعه و '+
      'احتمال شرطی هر یک وزن ۳ دارند، چون فصل ۹ پاپولیس مستقیماً روی آن‌ها سوار می‌شود. '+
      'تسلط=۱۰۰٪ وزن، نیازمند تمرین=۴۵٪، در حال یادگیری=۲۰٪.</p>'+
    '</div>';

  $("#topicList").innerHTML = TOPICS.map(function(t){
    var s = statusOf(t.id), q = quizStatsFor(t.id), ex = exCountFor(t.id);
    var det = q.need>0 ? ('آزمون '+fa(q.right)+'/'+fa(q.need)+' لازم · تمرین '+fa(ex)+'/۲') : ('تمرین '+fa(ex)+'/۲');
    return '<div class="r">'+
      '<span class="dot '+s+'" style="width:9px;height:9px;border-radius:50%;background:'+
        (s==="mastered"?"var(--good)":s==="practice"?"var(--disc)":s==="learning"?"var(--warn)":"var(--line-2)")+'"></span>'+
      '<span class="nm">'+t.name+'<small>روز '+fa(t.day)+' · '+esc(t.ref)+'</small></span>'+
      '<span class="pill '+(s==="mastered"?"ok":s==="practice"?"d":s==="learning"?"mid":"")+'">'+STLAB[s]+'</span>'+
      '<span style="font-family:var(--mono);font-size:11px;color:var(--muted)">'+det+'</span>'+
      (t.view?('<a class="btn" style="text-decoration:none;font-size:12px;padding:3px 10px" href="#'+t.view+'">برو</a>'):'')+
    '</div>';
  }).join("");

  $("#prereqList").innerHTML = PREREQS.map(function(p){
    var v = ST.pre[p.id]||0;
    return '<div class="r">'+
      '<span class="nm">'+p.n+'<small>روز '+fa(p.day)+'</small></span>'+
      '<span class="row" style="gap:4px">'+[1,2,3,4].map(function(k){
        return '<button class="btn" style="padding:2px 9px;font-size:12px'+(v===k?';background:var(--cont);border-color:var(--cont);color:var(--on-accent)':'')+'" data-pre="'+p.id+'" data-v="'+k+'">'+fa(k)+'</button>';
      }).join("")+'</span>'+
      '<span class="pill '+(v===0?"":v<3?"no":v===3?"mid":"ok")+'" style="min-width:86px;text-align:center">'+
        (v===0?"ارزیابی‌نشده":v===1?"بلد نیستم":v===2?"ضعیف":v===3?"قابل قبول":"مسلط")+'</span>'+
    '</div>';
  }).join("");
  $("#prereqList").querySelectorAll("[data-pre]").forEach(function(b){
    b.addEventListener("click", function(){
      var id=b.getAttribute("data-pre"), v=+b.getAttribute("data-v");
      ST.pre[id] = (ST.pre[id]===v?0:v); save(); renderDash(); renderPre();
    });
  });

  var rows = [];
  Object.keys(EXERCISES).forEach(function(k){
    EXERCISES[k].forEach(function(e){
      var r = ST.ex[e.id]||{};
      if(!r.st && !r.a) return;
      rows.push('<tr><td class="n">'+e.id+'</td><td>'+e.lvl+'</td>'+
        '<td><span class="pill '+(r.st==="done"?"ok":r.st==="stuck"?"mid":"")+'">'+
        (r.st==="done"?"حل شد":r.st==="stuck"?"گیر کرده‌ام":"—")+'</span></td>'+
        '<td style="max-width:360px;color:var(--ink-2);font-size:12.6px">'+esc((r.a||"").slice(0,180))+'</td></tr>');
    });
  });
  $("#exTable").innerHTML = '<thead><tr><th>کد</th><th>سطح</th><th>وضعیت</th><th>پاسخ ثبت‌شدهٔ شما</th></tr></thead>'+
    '<tbody>'+(rows.length?rows.join(""):'<tr><td colspan="4" style="color:var(--muted)">هنوز تمرینی ثبت نشده است.</td></tr>')+'</tbody>';
}
function kpi(k,n,frac,_,cls){
  return '<div class="kpi"><div class="k">'+k+'</div><div class="n">'+n+'</div>'+
    (frac?('<div class="meter"><i class="'+(cls||"")+'" style="width:'+Math.round(frac*100)+'%"></i></div>'):'')+'</div>';
}
