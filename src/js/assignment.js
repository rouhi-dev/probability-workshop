"use strict";
/* ---------- تمرین سری اول: داشبورد و میزکار هر مسئله ---------- */

/* وضعیت هر مسئله در ST.a1[id] = {read, attempt, check, sol, hint:{}, vr:{}} */
function a1State(id){
  if(!ST.a1) ST.a1 = {};
  if(!ST.a1[id]) ST.a1[id] = {hint:{}, vr:{}};
  var s = ST.a1[id];
  if(!s.hint) s.hint = {};
  if(!s.vr) s.vr = {};
  return s;
}
function a1Problem(id){
  for(var i=0;i<ASSIGNMENT.problems.length;i++)
    if(ASSIGNMENT.problems[i].id===id) return ASSIGNMENT.problems[i];
  return null;
}
/* تعداد تمرین‌های تکمیلیِ حل‌شدهٔ یک مسئله */
function a1VariantsDone(id){
  var s = a1State(id), n = 0;
  Object.keys(s.vr).forEach(function(k){ if(s.vr[k]==="done") n++; });
  return n;
}
/* قانون تسلط — سه شرط، و هیچ‌کدام «دکمه زدن» نیست:
   (۱) پاسخ درست به نقطهٔ بازبینی، (۲) ثبت حل خودِ دانشجو، (۳) دو تمرین تکمیلی. */
function a1Status(id){
  var s = a1State(id);
  var okCheck = s.check === -1;
  var okWrite = (s.attempt||"").trim().length >= 40;
  var okVar   = a1VariantsDone(id) >= 2;
  if(okCheck && okWrite && okVar) return "mastered";
  if(s.check !== undefined && s.check !== null && !okCheck) return "practice";
  if(okCheck || okWrite || a1VariantsDone(id) > 0) return "practice";
  if(s.read || s.sol) return "learning";
  return "todo";
}
function a1Pct(){
  var m = 0;
  ASSIGNMENT.problems.forEach(function(p){
    var st = a1Status(p.id);
    m += st==="mastered"?1 : st==="practice"?0.4 : st==="learning"?0.15 : 0;
  });
  return Math.round(100*m/ASSIGNMENT.problems.length);
}
function a1StatusColor(st){
  return st==="mastered"?"var(--good)" : st==="practice"?"var(--disc)"
       : st==="learning"?"var(--warn)" : "var(--line-2)";
}
var A1LAB = {todo:"شروع‌نشده", learning:"در حال کار", practice:"نیازمند تمرین بیشتر", mastered:"تسلط"};

/* ---------------- داشبورد ---------------- */
function renderA1Dash(){
  if(!$("#a1List")) return;
  var cnt = {todo:0,learning:0,practice:0,mastered:0}, vars = 0, written = 0;
  ASSIGNMENT.problems.forEach(function(p){
    cnt[a1Status(p.id)]++;
    vars += a1VariantsDone(p.id);
    if((a1State(p.id).attempt||"").trim().length >= 40) written++;
  });
  var totalVars = ASSIGNMENT.problems.reduce(function(a,p){ return a+p.variants.length; },0);

  $("#a1Kpis").innerHTML = [
    kpi("مسئله با تسلط", cnt.mastered+'<small> از '+ASSIGNMENT.problems.length+'</small>', cnt.mastered/11, ""),
    kpi("در حال کار", cnt.learning+cnt.practice, 0, null),
    kpi("حل‌های ثبت‌شدهٔ شما", written+'<small> از ۱۱</small>', written/11, ""),
    kpi("تمرین تکمیلی حل‌شده", vars+'<small> از '+totalVars+'</small>', vars/totalVars, ""),
    kpi("پیشرفت کلی تمرین", a1Pct()+'<small>٪</small>', a1Pct()/100, "")
  ].join("");

  $("#a1List").innerHTML = ASSIGNMENT.problems.map(function(p){
    var st = a1Status(p.id), s = a1State(p.id);
    var diff = ["","پایه","متوسط","دشوار","بسیار دشوار"][p.difficulty] || "";
    return '<div class="ex" style="border-inline-start:3px solid '+a1StatusColor(st)+'">'+
      '<div class="hd">'+
        '<span class="id">مسئله '+fa(p.n)+'</span>'+
        '<b style="font-size:15px">'+p.title+'</b>'+
        '<span class="lvl">'+p.kind+' · '+diff+'</span>'+
        (p.ambiguity?'<span class="pill mid">ابهام</span>':'')+
        '<span class="st">'+
          '<span class="pill '+(st==="mastered"?"ok":st==="practice"?"d":st==="learning"?"mid":"")+'">'+A1LAB[st]+'</span>'+
          '<a class="btn" style="text-decoration:none;font-size:12px;padding:3px 12px" href="#v-a1/'+p.id+'">باز کردن</a>'+
        '</span>'+
      '</div>'+
      '<p class="bd" style="color:var(--ink-2);font-size:13.6px">'+p.short+' — '+
        '<span style="color:var(--muted)">مفاهیم: '+p.concepts.join('، ')+'</span></p>'+
      '<div class="row" style="gap:6px;margin-top:7px;font-family:var(--mono);font-size:11px;color:var(--muted)">'+
        '<span>بازبینی: '+(s.check===-1?'✓ درست':(s.check!==undefined&&s.check!==null?'✗ نادرست':'—'))+'</span>'+
        '<span>·</span><span>حل ثبت‌شده: '+((s.attempt||"").trim().length>=40?'✓':'—')+'</span>'+
        '<span>·</span><span>تمرین: '+fa(a1VariantsDone(p.id))+'/'+fa(p.variants.length)+'</span>'+
        '<span>·</span><span>مبحث‌ها: '+p.topics.join(', ')+'</span>'+
      '</div></div>';
  }).join("");

  /* پوشش برنامهٔ درسی */
  var directRows = Object.keys(COVERAGE.direct).map(function(t){
    var tp = TOPICS.filter(function(x){return x.id===t;})[0];
    return '<tr><td>'+(tp?tp.name:t)+'</td>'+
      '<td class="n">'+COVERAGE.direct[t].map(function(p){return 'م'+fa(a1Problem(p).n);}).join('، ')+'</td>'+
      '<td><span class="pill c">مستقیم</span></td></tr>';
  }).join("");
  var preRows = Object.keys(COVERAGE.prerequisiteOnly).map(function(t){
    var tp = TOPICS.filter(function(x){return x.id===t;})[0];
    return '<tr><td>'+(tp?tp.name:t)+'</td><td style="font-size:12.6px;color:var(--ink-2)">'+
      COVERAGE.prerequisiteOnly[t]+'</td><td><span class="pill mid">فقط پیش‌نیاز</span></td></tr>';
  }).join("");
  $("#a1Coverage").innerHTML =
    '<div class="scrollx"><table class="tbl"><thead><tr><th>مبحث برنامهٔ درسی</th>'+
    '<th>کجا تمرین می‌شود</th><th>نوع پوشش</th></tr></thead><tbody>'+directRows+preRows+'</tbody></table></div>'+
    '<div class="warnbox" style="margin-top:14px"><span class="lbl">پوشش داده نمی‌شود</span>'+
    '<p style="margin:4px 0 8px">این‌ها هستهٔ درس فرآیندهای تصادفی‌اند و تمرین ۱ هیچ‌کدام را لمس نمی‌کند. '+
    'تکمیل این تمرین شما را «آمادهٔ فرآیندهای تصادفی» نمی‌کند؛ آماده می‌کند تا <i>بتوانید شروع کنید</i>.</p>'+
    '<div class="scrollx"><table class="tbl"><thead><tr><th>مبحث</th><th>چرا پوشش ندارد</th><th>مرجع</th></tr></thead><tbody>'+
    COVERAGE.notCovered.map(function(c){
      return '<tr><td><b>'+c.t+'</b></td><td style="font-size:12.8px">'+c.why+'</td>'+
        '<td class="n" style="font-size:11.5px">'+c.ch+'</td></tr>';
    }).join("")+'</tbody></table></div></div>';

  $("#a1Bridges").innerHTML = '<div class="scrollx"><table class="tbl">'+
    '<thead><tr><th>از مسئله</th><th>به مبحث</th><th>پل مفهومی</th></tr></thead><tbody>'+
    COVERAGE.bridges.map(function(b){
      var p = a1Problem(b.from);
      return '<tr><td class="n"><a href="#v-a1/'+b.from+'" style="color:var(--cont)">مسئله '+fa(p.n)+'</a></td>'+
        '<td><b>'+b.to+'</b></td><td style="font-size:13px">'+b.how+'</td></tr>';
    }).join("")+'</tbody></table></div>';
  typeset($("#v-a1"));
}

/* ---------------- میزکار یک مسئله ---------------- */
function a1Section(title, body, open){
  return '<details class="proof"'+(open?' open':'')+'><summary>'+title+'</summary>'+
         '<div class="body">'+body+'</div></details>';
}
function renderA1Work(id){
  var host = $("#a1Work"); if(!host) return;
  var p = a1Problem(id);
  if(!p){ host.innerHTML = '<div class="warnbox">مسئله یافت نشد.</div>'; return; }
  var s = a1State(id), st = a1Status(id);
  var ix = ASSIGNMENT.problems.indexOf(p);
  var prev = ix>0 ? ASSIGNMENT.problems[ix-1] : null;
  var next = ix<ASSIGNMENT.problems.length-1 ? ASSIGNMENT.problems[ix+1] : null;

  var h = '<div class="viewhead">'+
    '<div class="eyebrow">ASSIGNMENT 01 · مسئله '+fa(p.n)+' از ۱۱</div>'+
    '<h2>'+p.title+'</h2>'+
    '<div class="row" style="margin-top:10px">'+
      '<span class="pill '+(st==="mastered"?"ok":st==="practice"?"d":st==="learning"?"mid":"")+'">'+A1LAB[st]+'</span>'+
      '<span class="pill">'+p.kind+'</span>'+
      '<span class="pill">دشواری: '+["","پایه","متوسط","دشوار","بسیار دشوار"][p.difficulty]+'</span>'+
      (p.ambiguity?'<span class="pill mid">ابهام در صورت مسئله</span>':'')+
      '<a class="btn" style="text-decoration:none;font-size:12px" href="#v-a1">بازگشت به فهرست</a>'+
    '</div></div>';

  /* ۱ — صورت سؤال */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:28px 0 6px">صورت سؤال</h3>'+
    '<div class="def"><span class="lbl">متن اصلی — عیناً از فایل تمرین</span>'+p.statement+'</div>';

  if(p.ambiguity)
    h += '<div class="warnbox"><span class="lbl">ابهام یا فرض ناگفته</span>'+p.ambiguity+'</div>';

  /* ۲ — تحلیل مفهومی و پیش‌نیازها */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">تحلیل مفهومی</h3>'+
    '<p><b>چه چیزی سنجیده می‌شود:</b> '+p.tested+'</p>'+
    '<div class="readout">'+
      '<div><div class="k">مفاهیم درگیر</div><div style="font-size:13px;line-height:1.9">'+p.concepts.join('، ')+'</div></div>'+
      '<div><div class="k">مبحث‌های برنامهٔ درسی</div><div style="font-size:13px;line-height:1.9">'+
        p.topics.map(function(t){
          var tp = TOPICS.filter(function(x){return x.id===t;})[0];
          return tp ? '<a href="#v-map" style="color:var(--cont)">'+tp.name+'</a>' : t;
        }).join('، ')+'</div></div>'+
      '<div><div class="k">وضعیت پیش‌نیازها</div><div style="font-size:13px;line-height:1.9">'+
        p.prereqs.map(function(t){
          var tp = TOPICS.filter(function(x){return x.id===t;})[0];
          if(!tp) return '<span class="pill">'+t+'</span>';
          var ts = statusOf(t);
          return '<span class="pill '+(ts==="mastered"?"ok":ts==="practice"?"d":ts==="learning"?"mid":"no")+'">'+tp.name+'</span>';
        }).join(' ')+'</div></div>'+
    '</div>';

  /* ۳ — مبانی ریاضی */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">آموزش مبانی ریاضی</h3>'+
    p.foundation.map(function(f){ return a1Section(f.h, f.body); }).join("");

  /* ۴ — راهبرد حل */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">راهبرد حل</h3>'+
    '<p style="color:var(--ink-2);font-size:14px">این فهرست <b>پاسخ نیست</b> — نقشهٔ راه است. '+
    'قبل از باز کردن حل تشریحی، یک بار با همین راهبرد خودتان تلاش کنید.</p>'+
    '<ol class="prose">'+p.strategy.map(function(x){return '<li>'+x+'</li>';}).join("")+'</ol>';

  /* ۴٫۵ — نمایش تعاملی (فقط برای مسائلی که واقعاً از آن سود می‌برند) */
  if(typeof a1VizMarkup === "function" && a1VizMarkup(id)){
    h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">نمایش تعاملی</h3>'+
      a1VizMarkup(id);
  }

  /* ۵ — تلاش خود دانشجو */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">حل من</h3>'+
    '<div class="bench"><header><h4>دفترچهٔ شما</h4>'+
      '<span class="tag">'+((s.attempt||"").trim().length)+' نویسه — برای تسلط دست‌کم ۴۰ لازم است</span></header>'+
      '<div class="pad">'+
      '<p style="font-size:13.6px;margin:0 0 8px;color:var(--ink-2)">تلاش، طرح اثبات، یا دقیقاً جایی که '+
      'گیر کرده‌اید را بنویسید. ذخیره می‌شود و بعداً می‌توانید در گفت‌وگو برای بررسی بفرستید.</p>'+
      '<textarea id="a1ta" data-a1ta="'+id+'" style="min-height:140px">'+esc(s.attempt||"")+'</textarea>'+
      '</div></div>';

  /* ۶ — حل تشریحی، پشت دکمه */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">حل تشریحی</h3>';
  if(!s.sol){
    h += '<div class="warnbox"><span class="lbl">هنوز باز نشده</span>'+
      'پیش از باز کردن، دست‌کم یک بار با راهبرد بالا تلاش کنید و نوشته‌تان را در «حل من» ثبت کنید. '+
      'باز کردن زودهنگام، تنها فرصت یادگیری این مسئله را از بین می‌برد.'+
      '<div style="margin-top:10px"><button class="btn primary" data-a1sol="'+id+'">حل تشریحی را نشان بده</button></div></div>';
  } else {
    h += p.solution.map(function(x,i){ return a1Section('گام '+fa(i+1)+' — '+x.h, x.body, i===0); }).join("");
    h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">بررسی و اعتبارسنجی پاسخ</h3>'+
      '<div class="def"><span class="lbl">چگونه خودتان پاسخ را بیازمایید</span>'+p.verify+'</div>'+
      '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">تفسیر نتیجه</h3>'+
      '<p>'+p.interpret+'</p>'+
      '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">اشتباهات رایج</h3>'+
      '<ul class="prose">'+p.mistakes.map(function(m){return '<li>'+m+'</li>';}).join("")+'</ul>'+
      '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">الگوی قابل تعمیم</h3>'+
      '<div class="def"><span class="lbl">'+p.pattern.name+'</span>'+
        '<p style="margin:4px 0"><b>چگونه تشخیصش دهم:</b> '+p.pattern.recognize+'</p>'+
        '<p style="margin:4px 0"><b>اگر صورت مسئله عوض شود:</b> '+p.pattern.generalize+'</p></div>';
  }

  /* ۷ — نقطهٔ بازبینی */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:30px 0 6px">نقطهٔ بازبینی</h3>'+
    '<p style="color:var(--ink-2);font-size:14px">یک پرسش تشخیصی. پاسخ درست به این، یکی از سه شرط تسلط است.</p>'+
    '<div id="a1Check"></div>';

  /* ۸ — تمرین‌های تکمیلی */
  h += '<h3 style="font-family:var(--display);font-size:26px;margin:32px 0 6px">تمرین‌های تکمیلی</h3>'+
    '<p style="color:var(--ink-2);font-size:14px">چهار سؤال تازه بر پایهٔ همین مفهوم، در چهار سطح. '+
    'هیچ‌کدام صرفاً عدد عوض‌شدهٔ مسئلهٔ اصلی نیستند — هرکدام <b>جنبهٔ متفاوتی</b> را می‌سنجند. '+
    'راهنمایی‌ها پله‌پله باز می‌شوند و راه‌حل فقط با درخواست صریح.</p>'+
    '<div id="a1Vars"></div>';

  /* ناوبری */
  h += '<div class="row" style="margin-top:34px;border-top:1px solid var(--line);padding-top:16px">'+
    (prev?'<a class="btn" style="text-decoration:none" href="#v-a1/'+prev.id+'">▸ مسئله '+fa(prev.n)+'</a>':'')+
    '<a class="btn" style="text-decoration:none" href="#v-a1">فهرست مسائل</a>'+
    (next?'<a class="btn primary" style="text-decoration:none" href="#v-a1/'+next.id+'">مسئله '+fa(next.n)+' ◂</a>':'')+
    '</div>';

  host.innerHTML = h;

  /* رویدادها */
  var sol = host.querySelector("[data-a1sol]");
  if(sol) sol.addEventListener("click", function(){
    a1State(id).sol = 1; save(); renderA1Work(id); renderA1Dash(); renderNav();
  });
  var ta = host.querySelector("[data-a1ta]");
  if(ta){
    var tm = null;
    ta.addEventListener("input", function(){
      a1State(id).attempt = ta.value;
      clearTimeout(tm);
      tm = setTimeout(function(){ save(); renderA1Dash(); renderNav(); }, 700);
    });
  }
  renderA1Check(id);
  renderA1Variants(id);
  typeset(host);
  if(typeof a1VizBind === "function" && A1_VIZ[id]) setTimeout(function(){ a1VizBind(id); }, 30);
}

/* نقطهٔ بازبینی — همان موتور آزمون درس‌ها، با ذخیره در ST.a1 */
function renderA1Check(id){
  var p = a1Problem(id), s = a1State(id), host = $("#a1Check");
  if(!host || !p.check) return;
  var picked = s.check, done = picked!==undefined && picked!==null;
  var correctIx = -1;
  p.check.opts.forEach(function(o,j){ if(o.ok) correctIx = j; });
  var opts = p.check.opts.map(function(o,j){
    var cls = "opt";
    if(done){ cls += o.ok ? " right" : (picked===j ? " wrong" : " dim"); }
    return '<button class="'+cls+'" data-a1c="'+j+'"'+(done?" disabled":"")+'>'+o.t+'</button>';
  }).join("");
  var fb = "";
  if(done){
    var good = picked === -1;
    var selected = good ? p.check.opts[correctIx] : p.check.opts[picked];
    fb = '<div class="fb '+(good?"good":"bad")+'"><span class="lbl">'+
      (good?"درست — و دلیلش:":"نادرست. خطای استدلالی شما:")+'</span>'+selected.fb+
      (good?"":'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b>پاسخ درست:</b> '+
        p.check.opts[correctIx].fb+'</div>')+'</div>'+
      '<div style="margin-top:9px"><button class="btn" data-a1creset="1">پاک کردن و تلاش دوباره</button></div>';
  }
  host.innerHTML = '<div class="quiz"><p class="q">'+p.check.q+'</p>'+opts+fb+'</div>';
  host.querySelectorAll("[data-a1c]").forEach(function(b){
    b.addEventListener("click", function(){
      var j = +b.getAttribute("data-a1c");
      a1State(id).check = p.check.opts[j].ok ? -1 : j;
      save(); renderA1Check(id); renderA1Dash(); renderNav();
    });
  });
  var rb = host.querySelector("[data-a1creset]");
  if(rb) rb.addEventListener("click", function(){
    a1State(id).check = null; save(); renderA1Check(id); renderA1Dash(); renderNav();
  });
  typeset(host);
}

/* تمرین‌های تکمیلی با راهنمایی پله‌ای و راه‌حل پنهان */
function renderA1Variants(id){
  var p = a1Problem(id), s = a1State(id), host = $("#a1Vars");
  if(!host) return;
  var LVL = ["","۱ — پایه","۲ — متوسط","۳ — پیشرفته","۴ — چالش امتحانی ارشد"];
  var LCLS = ["","", "", "d", "mid"];
  host.innerHTML = p.variants.map(function(v, i){
    var key = p.id+"-v"+(i+1);
    var shown = s.hint[key] || 0;
    var mark = s.vr[key];
    var hints = v.hints.map(function(hh, k){
      if(k >= shown) return "";
      return '<div class="h" style="margin-top:8px"><b>راهنمایی '+fa(k+1)+':</b> '+hh+'</div>';
    }).join("");
    var more = shown < v.hints.length
      ? '<button class="btn" style="font-size:12px" data-a1h="'+key+'">'+
        (shown===0?"راهنمایی اول":"راهنمایی بعدی ("+fa(shown+1)+" از "+fa(v.hints.length)+")")+'</button>'
      : '<span class="pill">همهٔ راهنمایی‌ها باز شد</span>';
    var solBtn = s.vr[key+"-sol"]
      ? '<div class="def" style="margin-top:10px"><span class="lbl">راه‌حل و بررسی</span>'+v.verify+'</div>'
      : '<button class="btn" style="font-size:12px" data-a1vs="'+key+'">نمایش بررسی نهایی</button>';
    return '<div class="ex">'+
      '<div class="hd"><span class="id">'+p.id.toUpperCase()+'-V'+fa(i+1)+'</span>'+
        '<span class="pill '+(LCLS[v.level]||"")+'">سطح '+LVL[v.level]+'</span>'+
        '<span class="lvl">می‌سنجد: '+v.skill+'</span>'+
        '<span class="st">'+
          '<button class="btn" style="padding:2px 10px;font-size:12px'+(mark==="done"?';background:var(--good);border-color:var(--good);color:#fff':'')+'" data-a1v="'+key+'" data-v="done">حل کردم</button>'+
          '<button class="btn" style="padding:2px 10px;font-size:12px'+(mark==="stuck"?';background:var(--warn);border-color:var(--warn);color:#fff':'')+'" data-a1v="'+key+'" data-v="stuck">گیر کرده‌ام</button>'+
        '</span></div>'+
      '<p class="bd">'+v.q+'</p>'+
      '<div style="font-size:12px;color:var(--muted);font-family:var(--mono);margin-top:6px">پیش‌نیاز: '+
        v.prereqs.map(function(t){
          var tp = TOPICS.filter(function(x){return x.id===t;})[0];
          return tp?tp.name:t;
        }).join('، ')+'</div>'+
      hints+
      '<div class="row" style="margin-top:10px">'+more+solBtn+'</div>'+
    '</div>';
  }).join("");

  host.querySelectorAll("[data-a1h]").forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.getAttribute("data-a1h");
      a1State(id).hint[k] = (a1State(id).hint[k]||0)+1;
      save(); renderA1Variants(id);
    });
  });
  host.querySelectorAll("[data-a1vs]").forEach(function(b){
    b.addEventListener("click", function(){
      a1State(id).vr[b.getAttribute("data-a1vs")+"-sol"] = 1;
      save(); renderA1Variants(id);
    });
  });
  host.querySelectorAll("[data-a1v]").forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.getAttribute("data-a1v"), v = b.getAttribute("data-v");
      var st = a1State(id);
      st.vr[k] = (st.vr[k]===v ? null : v);
      save(); renderA1Variants(id); renderA1Dash(); renderNav();
    });
  });
  typeset(host);
}
