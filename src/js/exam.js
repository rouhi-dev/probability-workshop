"use strict";
/* ---------- حالت آزمون: انتخاب تصادفی از بانک سؤال، تصحیح و بازخورد تشخیصی ---------- */

/* استخر سؤال‌های خودتصحیح: نقاط بازبینی یازده مسئله + آزمون‌های درس‌ها */
function examPool(){
  var pool = [];
  ASSIGNMENT.problems.forEach(function(p){
    if(p.check) pool.push({
      key:"a1:"+p.id, q:p.check.q, opts:p.check.opts,
      topics:p.topics, src:"مسئله "+fa(p.n)+" — "+p.short, level:p.difficulty
    });
  });
  Object.keys(QUIZZES).forEach(function(qid){
    QUIZZES[qid].items.forEach(function(it,i){
      pool.push({
        key:"q:"+qid+":"+i, q:it.q, opts:it.opts,
        topics:QUIZZES[qid].topics, src:(qid==="quizL1"?"درس ۱":"پرسش استاد"), level:2
      });
    });
  });
  return pool;
}
/* سؤال‌های تشریحی از بانک تمرین‌های تکمیلی */
function examOpenPool(){
  var pool = [];
  ASSIGNMENT.problems.forEach(function(p){
    p.variants.forEach(function(v,i){
      pool.push({key:p.id+"-v"+(i+1), q:v.q, verify:v.verify, hints:v.hints,
                 level:v.level, skill:v.skill, src:"مسئله "+fa(p.n), topics:p.topics});
    });
  });
  return pool;
}
function examShuffle(a, n){
  var arr = a.slice();
  for(var i=arr.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return n ? arr.slice(0, Math.min(n, arr.length)) : arr;
}
/* ترکیب سطوح: از هر سطح دشواری سهمی برداریم تا آزمون یکنواخت نشود */
function examPick(pool, n){
  var byLevel = {}, out = [];
  pool.forEach(function(x){ (byLevel[x.level] = byLevel[x.level] || []).push(x); });
  var levels = Object.keys(byLevel).sort();
  var i = 0;
  while(out.length < n && i < 50){
    levels.forEach(function(L){
      if(out.length >= n) return;
      var bag = byLevel[L];
      if(bag && bag.length){ out.push(bag.splice(Math.floor(Math.random()*bag.length),1)[0]); }
    });
    i++;
  }
  return examShuffle(out);
}

function examState(){
  if(!ST.exam) ST.exam = {hist:[]};
  if(!ST.exam.hist) ST.exam.hist = [];
  return ST.exam;
}

function examStart(nMcq, nOpen){
  var e = examState();
  e.current = {
    mcq: examPick(examPool(), nMcq).map(function(x){ return {key:x.key, a:null}; }),
    open: examShuffle(examOpenPool(), nOpen).map(function(x){ return {key:x.key, note:"", self:null}; }),
    submitted: false,
    at: new Date().toISOString()
  };
  save(); renderExam();
}
function examFind(pool, key){
  for(var i=0;i<pool.length;i++) if(pool[i].key===key) return pool[i];
  return null;
}

function renderExam(){
  var host = $("#examHost"); if(!host) return;
  var e = examState(), cur = e.current;

  /* تاریخچه */
  var hist = "";
  if(e.hist.length){
    hist = '<h3 style="font-family:var(--display);font-size:24px;margin:30px 0 6px">عملکرد در طول زمان</h3>'+
      '<div class="scrollx"><table class="tbl"><thead><tr><th>تاریخ</th><th>نمرهٔ چندگزینه‌ای</th>'+
      '<th>خودارزیابی تشریحی</th><th>مبحث‌های ضعیف</th></tr></thead><tbody>'+
      e.hist.slice().reverse().slice(0,10).map(function(r){
        return '<tr><td class="n" style="font-size:11.5px">'+r.at.slice(0,16).replace("T"," ")+'</td>'+
          '<td class="n">'+fa(r.score)+' از '+fa(r.total)+'</td>'+
          '<td class="n">'+(r.openOk!==undefined?fa(r.openOk)+' از '+fa(r.openTotal):'—')+'</td>'+
          '<td>'+(r.weak.length? r.weak.map(function(t){
            var tp = TOPICS.filter(function(x){return x.id===t;})[0];
            return '<span class="pill no">'+(tp?tp.name:t)+'</span>';
          }).join(' ') : '<span class="pill ok">نقطهٔ ضعفی شناسایی نشد</span>')+'</td></tr>';
      }).join("")+'</tbody></table></div>';
  }

  if(!cur){
    host.innerHTML = '<div class="bench"><header><h4>شروع آزمون تازه</h4>'+
      '<span class="tag">'+fa(examPool().length)+' سؤال چندگزینه‌ای · '+fa(examOpenPool().length)+' سؤال تشریحی در بانک</span></header>'+
      '<div class="pad"><p style="font-size:14px;margin:0 0 12px">طول آزمون را انتخاب کنید. '+
      'سؤال‌ها به‌تصادف و با ترکیب سطوح دشواری انتخاب می‌شوند.</p>'+
      '<div class="row">'+
        '<button class="btn primary" data-exam="5,1">کوتاه — ۵ چندگزینه‌ای + ۱ تشریحی</button>'+
        '<button class="btn" data-exam="8,2">استاندارد — ۸ + ۲</button>'+
        '<button class="btn" data-exam="12,3">جامع — ۱۲ + ۳</button>'+
      '</div></div></div>'+hist;
    host.querySelectorAll("[data-exam]").forEach(function(b){
      b.addEventListener("click", function(){
        var p = b.getAttribute("data-exam").split(",");
        examStart(+p[0], +p[1]);
      });
    });
    typeset(host);
    return;
  }

  var pool = examPool(), openPool = examOpenPool();
  var answered = cur.mcq.filter(function(m){ return m.a !== null; }).length;
  var h = '<div class="bench"><header><h4>'+(cur.submitted?"نتیجهٔ آزمون":"آزمون در جریان")+'</h4>'+
    '<span class="tag">'+fa(answered)+' از '+fa(cur.mcq.length)+' پاسخ داده شد</span></header>'+
    '<div class="pad"><div class="meter"><i style="width:'+Math.round(100*answered/cur.mcq.length)+'%"></i></div>'+
    '<div class="row" style="margin-top:12px">'+
      (cur.submitted
        ? '<button class="btn primary" data-examnew="1">آزمون تازه</button>'
        : '<button class="btn primary" data-examsubmit="1"'+(answered<cur.mcq.length?' disabled':'')+'>ثبت و تصحیح</button>'+
          '<button class="btn" data-examabort="1">انصراف</button>'+
          '<span style="font-size:12.6px;color:var(--muted)">تا پیش از ثبت، هیچ پاسخی نمایش داده نمی‌شود.</span>')+
    '</div></div></div>';

  /* بخش الف — چندگزینه‌ای */
  h += '<h3 style="font-family:var(--display);font-size:24px;margin:28px 0 6px">بخش الف — چندگزینه‌ای</h3>';
  cur.mcq.forEach(function(m, i){
    var item = examFind(pool, m.key);
    if(!item){ h += ''; return; }
    var correctIx = -1;
    item.opts.forEach(function(o,j){ if(o.ok) correctIx = j; });
    var opts = item.opts.map(function(o,j){
      var cls = "opt";
      if(cur.submitted){ cls += o.ok ? " right" : (m.a===j ? " wrong" : " dim"); }
      else if(m.a===j){ cls += " right"; }
      return '<button class="'+cls+'" data-em="'+i+'" data-ej="'+j+'"'+(cur.submitted?" disabled":"")+'>'+o.t+'</button>';
    }).join("");
    var fb = "";
    if(cur.submitted){
      var ok = m.a === correctIx;
      fb = '<div class="fb '+(ok?"good":"bad")+'"><span class="lbl">'+(ok?"درست":"نادرست")+'</span>'+
        item.opts[m.a!==null?m.a:correctIx].fb+
        (ok?"":'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b>پاسخ درست:</b> '+
          item.opts[correctIx].fb+'</div>')+'</div>';
    }
    h += '<div class="quiz"><p class="q"><span class="ix">'+fa(i+1)+'.</span>'+item.q+
      '<span class="pill" style="margin-inline-start:8px">'+item.src+'</span></p>'+opts+fb+'</div>';
  });

  /* بخش ب — تشریحی */
  if(cur.open.length){
    h += '<h3 style="font-family:var(--display);font-size:24px;margin:30px 0 6px">بخش ب — تشریحی</h3>'+
      '<p style="color:var(--ink-2);font-size:13.8px">این‌ها خودتصحیح نیستند. پاسخ خود را بنویسید؛ '+
      'پس از ثبت، معیار بررسی نمایش داده می‌شود و خودتان داوری می‌کنید.</p>';
    cur.open.forEach(function(o, i){
      var item = examFind(openPool, o.key);
      if(!item) return;
      h += '<div class="ex"><div class="hd"><span class="id">'+item.key.toUpperCase()+'</span>'+
        '<span class="pill '+(item.level>=4?"mid":item.level>=3?"d":"")+'">سطح '+fa(item.level)+'</span>'+
        '<span class="lvl">'+item.src+' · '+item.skill+'</span></div>'+
        '<p class="bd">'+item.q+'</p>'+
        '<textarea data-eo="'+i+'" placeholder="پاسخ خود را اینجا بنویسید…">'+esc(o.note||"")+'</textarea>';
      if(cur.submitted){
        h += '<div class="def" style="margin-top:10px"><span class="lbl">معیار بررسی</span>'+item.verify+'</div>'+
          '<div class="row" style="margin-top:9px"><span style="font-size:13px">خودارزیابی:</span>'+
          '<button class="btn" style="font-size:12px'+(o.self==="ok"?';background:var(--good);border-color:var(--good);color:#fff':'')+'" data-es="'+i+'" data-v="ok">درست حل کردم</button>'+
          '<button class="btn" style="font-size:12px'+(o.self==="partial"?';background:var(--warn);border-color:var(--warn);color:#fff':'')+'" data-es="'+i+'" data-v="partial">نیمه‌درست</button>'+
          '<button class="btn" style="font-size:12px'+(o.self==="no"?';background:var(--bad);border-color:var(--bad);color:#fff':'')+'" data-es="'+i+'" data-v="no">نتوانستم</button></div>';
      }
      h += '</div>';
    });
  }

  /* خلاصهٔ تشخیصی */
  if(cur.submitted){
    var score = 0, weak = {};
    cur.mcq.forEach(function(m){
      var item = examFind(pool, m.key); if(!item) return;
      var ok = item.opts[m.a] && item.opts[m.a].ok;
      if(ok) score++; else item.topics.forEach(function(t){ weak[t] = (weak[t]||0)+1; });
    });
    var weakList = Object.keys(weak).sort(function(a,b){ return weak[b]-weak[a]; });
    h += '<h3 style="font-family:var(--display);font-size:24px;margin:30px 0 6px">بازخورد تشخیصی</h3>'+
      '<div class="kpis">'+
        kpi("نمرهٔ چندگزینه‌ای", score+'<small> از '+cur.mcq.length+'</small>', score/cur.mcq.length, "")+
        kpi("درصد", Math.round(100*score/cur.mcq.length)+'<small>٪</small>', score/cur.mcq.length, "")+
      '</div>';
    if(weakList.length){
      h += '<div class="warnbox"><span class="lbl">مبحث‌هایی که باید به آن‌ها برگردید</span>'+
        '<p style="margin:4px 0 8px">این‌ها از روی پاسخ‌های نادرست شما استخراج شده‌اند. '+
        'به ترتیب اولویت:</p><div class="row">'+
        weakList.map(function(t){
          var tp = TOPICS.filter(function(x){return x.id===t;})[0];
          var view = tp && tp.view ? tp.view : "v-map";
          return '<a class="btn" style="text-decoration:none;font-size:12.5px" href="#'+view+'">'+
            (tp?tp.name:t)+' <span style="color:var(--muted)">('+fa(weak[t])+' خطا)</span></a>';
        }).join("")+'</div></div>';
    } else {
      h += '<div class="note"><span class="lbl">بدون نقطهٔ ضعف</span>همهٔ سؤال‌های چندگزینه‌ای درست پاسخ داده شد. '+
        'آزمون جامع‌تری بگیرید تا سؤال‌های سطح بالاتر هم بیایند.</div>';
    }
  }

  h += hist;
  host.innerHTML = h;

  /* رویدادها */
  host.querySelectorAll("[data-em]").forEach(function(b){
    b.addEventListener("click", function(){
      var i = +b.getAttribute("data-em"), j = +b.getAttribute("data-ej");
      examState().current.mcq[i].a = j;
      save(); renderExam();
    });
  });
  host.querySelectorAll("[data-eo]").forEach(function(t){
    var tm = null;
    t.addEventListener("input", function(){
      examState().current.open[+t.getAttribute("data-eo")].note = t.value;
      clearTimeout(tm); tm = setTimeout(save, 700);
    });
  });
  host.querySelectorAll("[data-es]").forEach(function(b){
    b.addEventListener("click", function(){
      var i = +b.getAttribute("data-es"), v = b.getAttribute("data-v");
      var o = examState().current.open[i];
      o.self = (o.self===v ? null : v);
      save(); renderExam();
    });
  });
  var sb = host.querySelector("[data-examsubmit]");
  if(sb) sb.addEventListener("click", function(){
    var e2 = examState(), c = e2.current, pl = examPool();
    var score = 0, weak = {};
    c.mcq.forEach(function(m){
      var item = examFind(pl, m.key); if(!item) return;
      if(item.opts[m.a] && item.opts[m.a].ok) score++;
      else item.topics.forEach(function(t){ weak[t] = (weak[t]||0)+1; });
    });
    c.submitted = true;
    e2.hist.push({at:c.at, score:score, total:c.mcq.length,
                  weak:Object.keys(weak), openTotal:c.open.length, openOk:0});
    save(); renderExam();
  });
  var ab = host.querySelector("[data-examabort]");
  if(ab) ab.addEventListener("click", function(){
    examState().current = null; save(); renderExam();
  });
  var nb = host.querySelector("[data-examnew]");
  if(nb) nb.addEventListener("click", function(){
    examState().current = null; save(); renderExam();
  });
  typeset(host);
}
