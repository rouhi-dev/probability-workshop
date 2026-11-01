"use strict";
function bits(n){
  var out=[]; for(var i=0;i<(1<<n);i++){ var s=""; for(var k=n-1;k>=0;k--) s+= (i>>k)&1; out.push(s); }
  return out;
}
var EXPS = {
  coin1:{ nm:"یک سکه", out:["ش","خ"], grid:0,
    note:"$S=\\{\\text{ش},\\text{خ}\\}$ — سکهٔ سالم، دو برون‌داد هم‌احتمال." },
  coin2:{ nm:"دو سکه", out:["شش","شخ","خش","خخ"], grid:0,
    note:"$S=\\{\\text{شش},\\text{شخ},\\text{خش},\\text{خخ}\\}$ — <b>ترتیب‌دار</b>، چهار برون‌داد هم‌احتمال. دقت کنید «شخ» و «خش» دو برون‌داد <b>متفاوت</b>اند.",
    pre:[{l:"دقیقاً یک شیر",f:function(o){return o==="شخ"||o==="خش";}},
         {l:"حداقل یک شیر",f:function(o){return o.indexOf("ش")>=0;}}] },
  die1:{ nm:"یک تاس", out:["1","2","3","4","5","6"], grid:0,
    note:"$S=\\{1,\\dots,6\\}$ — تاس سالم، شش برون‌داد هم‌احتمال.",
    pre:[{l:"زوج",f:function(o){return (+o)%2===0;}},{l:"بزرگ‌تر از ۴",f:function(o){return (+o)>4;}}] },
  die2:{ nm:"دو تاس", out:(function(){var a=[];for(var i=1;i<=6;i++)for(var j=1;j<=6;j++)a.push(i+","+j);return a;})(), grid:1,
    note:"$S=\\{(i,j): 1\\le i,j\\le 6\\}$ — $|S|=36$ برون‌داد هم‌احتمال. جدول را مثل ماتریس بخوانید: سطر = تاس اول.",
    pre:[{l:"مجموع = ۷",f:function(o){var p=o.split(",");return +p[0]+ +p[1]===7;}},
         {l:"مجموع ≥ ۱۰",f:function(o){var p=o.split(",");return +p[0]+ +p[1]>=10;}},
         {l:"هر دو زوج",f:function(o){var p=o.split(",");return p[0]%2===0&&p[1]%2===0;}},
         {l:"حداقل یک ۶",f:function(o){return o.indexOf("6")>=0;}}] },
  bsc3:{ nm:"سه بیت روی BSC (p=0.2)", out:bits(3), grid:0,
    probs:(function(){ var p=0.2; return bits(3).map(function(s){
      var w=0; for(var i=0;i<3;i++) if(s[i]==="1") w++;
      return Math.pow(p,w)*Math.pow(1-p,3-w); }); })(),
    note:"$S=\\{0,1\\}^3$ با ۱ = «بیت خطا دارد». این برون‌دادها <b>هم‌احتمال نیستند</b>: هر بیت با احتمال $p=0.2$ مستقل خطا می‌کند، پس $P(\\zeta)=p^{w}(1-p)^{3-w}$ که $w$ تعداد یک‌هاست. اینجا فرمول $|A|/|S|$ <b>غلط</b> است — همین را در نمودار ببینید.",
    pre:[{l:"حداقل دو خطا",f:function(o){return (o.match(/1/g)||[]).length>=2;}},
         {l:"بدون خطا",f:function(o){return o==="000";}},
         {l:"دقیقاً یک خطا",f:function(o){return (o.match(/1/g)||[]).length===1;}}] }
};
var EX = { key:"coin2", A:{}, n:0, nA:0, hist:[] };

function exProbs(){
  var e = EXPS[EX.key];
  if(e.probs) return e.probs;
  return e.out.map(function(){ return 1/e.out.length; });
}
function exPA(){
  var p = exProbs(), e = EXPS[EX.key], s=0;
  e.out.forEach(function(o,i){ if(EX.A[o]) s += p[i]; });
  return s;
}
function exPick(){
  var p = exProbs(), r = Math.random(), c = 0;
  for(var i=0;i<p.length;i++){ c += p[i]; if(r < c) return i; }
  return p.length-1;
}
function exShouldRecord(n){
  if(n<=60) return true;
  if(n<=600) return n%5===0;
  if(n<=6000) return n%50===0;
  return n%500===0;
}
function exRun(k){
  var e = EXPS[EX.key];
  for(var i=0;i<k;i++){
    var ix = exPick();
    EX.n++;
    if(EX.A[e.out[ix]]) EX.nA++;
    if(exShouldRecord(EX.n)) EX.hist.push([EX.n, EX.nA/EX.n]);
  }
  if(EX.hist.length===0 || EX.hist[EX.hist.length-1][0]!==EX.n) EX.hist.push([EX.n, EX.nA/EX.n]);
  drawExp(); fillExpReadout();
}
function renderExp(){
  var e = EXPS[EX.key];
  $("#expPicker").innerHTML = Object.keys(EXPS).map(function(k){
    return '<button class="btn '+(k===EX.key?"sel":"")+'" data-exp="'+k+'">'+EXPS[k].nm+'</button>';
  }).join("");
  $("#expPicker").querySelectorAll("[data-exp]").forEach(function(b){
    b.addEventListener("click", function(){
      EX.key = b.getAttribute("data-exp"); EX.A={}; EX.n=0; EX.nA=0; EX.hist=[];
      renderExp();
    });
  });
  $("#expOutcomes").innerHTML = '<div class="chips'+(e.grid?" grid6":"")+'">'+
    e.out.map(function(o){ return '<button class="'+(EX.A[o]?"in":"")+'" data-out="'+o+'">'+o+'</button>'; }).join("")+'</div>';
  $("#expOutcomes").querySelectorAll("[data-out]").forEach(function(b){
    b.addEventListener("click", function(){
      var o=b.getAttribute("data-out");
      if(EX.A[o]) delete EX.A[o]; else EX.A[o]=1;
      EX.n=0; EX.nA=0; EX.hist=[]; renderExp();
    });
  });
  $("#expPresets").innerHTML = (e.pre||[]).map(function(p,i){
    return '<button class="btn" style="font-size:12px" data-pre="'+i+'">'+p.l+'</button>';
  }).join("") + (e.pre? '<button class="btn" style="font-size:12px" data-pre="-1">پاک کردن A</button>':'');
  $("#expPresets").querySelectorAll("[data-pre]").forEach(function(b){
    b.addEventListener("click", function(){
      var i=+b.getAttribute("data-pre");
      EX.A={};
      if(i>=0) e.out.forEach(function(o){ if(e.pre[i].f(o)) EX.A[o]=1; });
      EX.n=0; EX.nA=0; EX.hist=[]; renderExp();
    });
  });
  var sel = e.out.filter(function(o){ return EX.A[o]; });
  var uni = !e.probs;
  $("#expSetNote").innerHTML = e.note + '<br><br>'+
    '<b>پیشامد انتخابی:</b> ' + (sel.length? '$A=\\{'+sel.map(function(s){return "\\text{"+s+"}";}).join(",\\,")+'\\}$' : '$A=\\varnothing$') +
    ' &nbsp;·&nbsp; $|A|='+sel.length+'$، $|S|='+e.out.length+'$'+
    (uni ? ' &nbsp;·&nbsp; چون برون‌دادها هم‌احتمال‌اند، $P(A)=|A|/|S|$ معتبر است.'
         : ' &nbsp;·&nbsp; <b style="color:var(--warn)">برون‌دادها هم‌احتمال نیستند</b>، پس $|A|/|S|='+
           (sel.length/e.out.length).toFixed(4)+'$ در حالی که $P(A)='+exPA().toFixed(4)+'$.');
  typeset($("#expSetNote"));
  drawExp(); fillExpReadout();
}
function fillExpReadout(){
  var pA = exPA(), ph = EX.n? EX.nA/EX.n : NaN;
  $("#expReadout").innerHTML = [
    ro("$P(A)$ نظری", pA.toFixed(4)),
    ro("تعداد اجرا&nbsp; n", fa(EX.n)),
    ro("وقوع A&nbsp; n<sub>A</sub>", fa(EX.nA)),
    ro("فراوانی نسبی", EX.n? ph.toFixed(4):"—"),
    ro("قطر خطا", EX.n? Math.abs(ph-pA).toFixed(4):"—"),
    ro("کرانهٔ ۲σ", EX.n? (2*Math.sqrt(Math.max(pA*(1-pA),0)/EX.n)).toFixed(4):"—")
  ].join("");
  typeset($("#expReadout"));
}
function ro(k,v){ return '<div><div class="k">'+k+'</div><div class="n">'+v+'</div></div>'; }


function drawExp(){
  var o = cv("expChart", 230), g=o.g, W=o.w, H=o.h;
  var L=46, R=12, T=14, B=30, pw=W-L-R, ph=H-T-B;
  var ink=tok("--ink"), mut=tok("--muted"), line=tok("--line"), cont=tok("--cont"), disc=tok("--disc");
  var pA = exPA();
  var nmax = Math.max(100, EX.n);
  function X(n){ return L + pw * (Math.log10(Math.max(1,n))/Math.log10(nmax)); }
  function Y(p){ return T + ph * (1-p); }

  // 2 sigma band
  if(pA>0 && pA<1){
    g.fillStyle = cont; g.globalAlpha = 0.12; g.beginPath();
    var first=true;
    for(var n=1;n<=nmax;n*=1.06){
      var s = 2*Math.sqrt(pA*(1-pA)/n);
      var y = Y(Math.min(1,pA+s));
      if(first){ g.moveTo(X(n),y); first=false; } else g.lineTo(X(n),y);
    }
    for(var n2=nmax;n2>=1;n2/=1.06){
      var s2 = 2*Math.sqrt(pA*(1-pA)/n2);
      g.lineTo(X(n2), Y(Math.max(0,pA-s2)));
    }
    g.closePath(); g.fill(); g.globalAlpha=1;
  }
  // grid
  g.strokeStyle=line; g.lineWidth=1; g.font="11px "+(tok("--mono")||"monospace"); g.fillStyle=mut;
  [0,0.25,0.5,0.75,1].forEach(function(p){
    g.beginPath(); g.moveTo(L,Y(p)); g.lineTo(W-R,Y(p)); g.stroke();
    g.textAlign="right"; g.textBaseline="middle"; g.fillText(p.toFixed(2), L-7, Y(p));
  });
  var decades=[1,10,100,1000,10000,100000].filter(function(d){ return d<=nmax; });
  g.textAlign="center"; g.textBaseline="top";
  decades.forEach(function(d){
    g.strokeStyle=line; g.beginPath(); g.moveTo(X(d),T); g.lineTo(X(d),T+ph); g.stroke();
    g.fillStyle=mut; g.fillText(String(d), X(d), T+ph+7);
  });
  // theoretical P(A)
  g.strokeStyle=cont; g.lineWidth=1.8; g.setLineDash([6,4]);
  g.beginPath(); g.moveTo(L,Y(pA)); g.lineTo(W-R,Y(pA)); g.stroke(); g.setLineDash([]);
  g.fillStyle=cont; g.textAlign="left"; g.textBaseline="bottom";
  g.fillText("P(A) = "+pA.toFixed(3), L+5, Y(pA)-3);
  // trajectory
  if(EX.hist.length){
    g.strokeStyle=disc; g.lineWidth=1.7; g.beginPath();
    EX.hist.forEach(function(p,i){ var x=X(p[0]), y=Y(p[1]); if(i===0)g.moveTo(x,y); else g.lineTo(x,y); });
    g.stroke();
    var last=EX.hist[EX.hist.length-1];
    g.fillStyle=disc; g.beginPath(); g.arc(X(last[0]),Y(last[1]),3.5,0,6.284); g.fill();
  } else {
    g.fillStyle=mut; g.textAlign="center"; g.textBaseline="middle";
    g.font="13px "+(tok("--body")||"sans-serif");
    g.fillText("برای دیدن مسیر فراوانی نسبی، آزمایش را اجرا کنید", L+pw/2, T+ph/2);
  }
  g.strokeStyle=tok("--line-2"); g.lineWidth=1;
  g.beginPath(); g.moveTo(L,T); g.lineTo(L,T+ph); g.lineTo(W-R,T+ph); g.stroke();
}
