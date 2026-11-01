"use strict";
/* ---------- quiz ---------- */
function renderQuiz(qid){
  var Q = QUIZZES[qid], host = $("#"+qid);
  if(!Q||!host) return;
  var st = ST.quiz[qid] || (ST.quiz[qid]={});
  var right = Q.items.filter(function(_,i){ return st[i]===-1; }).length;
  var ans   = Q.items.filter(function(_,i){ return st[i]!==undefined && st[i]!==null; }).length;
  var head = '<div class="quiz" style="background:var(--surface-2)">'+
    '<div class="row" style="justify-content:space-between">'+
      '<b style="font-size:14px">نتیجهٔ فعلی: '+fa(right)+' از '+fa(ans)+' پاسخ‌داده'+
        ' <span style="color:var(--muted);font-weight:400">(آستانهٔ تسلط: '+fa(Q.need)+' درست)</span></b>'+
      '<button class="btn" data-qreset="'+qid+'">پاک کردن پاسخ‌ها و تلاش مجدد</button>'+
    '</div>'+
    '<div class="meter" style="margin-top:9px"><i style="width:'+Math.round(100*right/Q.items.length)+'%;background:'+
      (right>=Q.need?"var(--good)":"var(--warn)")+'"></i></div></div>';

  host.innerHTML = head + Q.items.map(function(it,i){
    var picked = st[i];
    var done = picked!==undefined && picked!==null;
    var correctIx = it.opts.findIndex(function(o){ return o.ok; });
    var opts = it.opts.map(function(o,j){
      var cls="opt";
      if(done){
        if(o.ok) cls+=" right";
        else if(picked===j) cls+=" wrong";
        else cls+=" dim";
      }
      return '<button class="'+cls+'" data-q="'+qid+'" data-i="'+i+'" data-j="'+j+'"'+(done?" disabled":"")+'>'+o.t+'</button>';
    }).join("");
    var fb="";
    if(done){
      var sel = picked===-1 ? it.opts[correctIx] : it.opts[picked];
      var good = picked===-1;
      fb = '<div class="fb '+(good?"good":"bad")+'"><span class="lbl">'+
        (good?"درست — و دلیلش:":"نادرست. خطای استدلالی شما:")+'</span>'+sel.fb+
        (good?"":'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b>پاسخ درست:</b> '+it.opts[correctIx].fb+'</div>')+
        '</div>';
    }
    return '<div class="quiz"><p class="q"><span class="ix">'+fa(i+1)+'.</span>'+it.q+'</p>'+opts+fb+'</div>';
  }).join("");

  host.querySelectorAll("[data-q]").forEach(function(b){
    b.addEventListener("click", function(){
      var i=+b.getAttribute("data-i"), j=+b.getAttribute("data-j");
      var ok = QUIZZES[qid].items[i].opts[j].ok;
      ST.quiz[qid][i] = ok ? -1 : j;
      save(); renderQuiz(qid); renderDash(); renderNav();
    });
  });
  var rb = host.querySelector("[data-qreset]");
  if(rb) rb.addEventListener("click", function(){
    ST.quiz[qid] = {}; save(); renderQuiz(qid); renderDash(); renderNav();
  });
  typeset(host);
}
