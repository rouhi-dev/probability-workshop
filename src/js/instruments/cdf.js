"use strict";
/* ============================================================
   میزکار ۳ — آزمایشگر CDF
   ============================================================ */
var CDFS = {
  disc:{ nm:"CDF گسسته (معتبر)", y:[-0.08,1.12], x:[-3,3],
    jumps:[-1,0,2],
    F:function(x){ return x< -1?0 : x<0?0.2 : x<2?0.7 : 1; },
    d:"متغیر گسسته با $P\\{X=-1\\}=0.2$، $P\\{X=0\\}=0.5$، $P\\{X=2\\}=0.3$. پله‌ای، ناکاهشی، راست‌پیوسته." },
  mix:{ nm:"CDF آمیخته (معتبر)", y:[-0.08,1.12], x:[-2,4],
    jumps:[0],
    F:function(x){ return x<0?0 : 1-0.6*Math.exp(-2*x); },
    d:"تأخیر صف: با احتمال $0.4$ صف خالی است ($T=0$) و در غیر این صورت نمایی با $\\lambda=2$. پرش در صفر + صعود هموار." },
  cont:{ nm:"CDF پیوسته (معتبر)", y:[-0.08,1.12], x:[-4,4],
    jumps:[],
    F:function(x){ return 1/(1+Math.exp(-1.6*x)); },
    d:"هیچ پرشی ندارد، پس $P\\{X=a\\}=0$ برای هر $a$. هر چهار نوع بازه یک احتمال می‌دهند." },
  neg:{ nm:"−⌊x⌋ : نزولی و ناپیوسته", y:[-3.4,3.4], x:[-3,3],
    jumps:[-2,-1,0,1,2,3],
    F:function(x){ return -Math.floor(x); },
    d:"<b>CDF نیست</b> — و همین پاسخ پرسش استاد است: تابع نزولی و ناپیوسته به‌سادگی وجود دارد. اما پرش‌هایش <b>رو به پایین</b>اند و این با یکنوایی $P$ ناسازگار است." },
  down:{ nm:"CDF قلابی: پرش رو به پایین", y:[-0.08,1.12], x:[-3,3],
    jumps:[-1,0,2],
    F:function(x){ return x< -1?0 : x<0?0.6 : x<2?0.3 : 1; },
    d:"<b>CDF نیست.</b> در $x=0$ از $0.6$ به $0.3$ می‌افتد. اگر چنین $F$ای وجود داشت، $P\\{0<X\\le 2\\}=F(2^-)-F(0^-)=0.3-0.6=-0.3<0$ می‌شد — نقض اصل اول کلموگروف." },
  left:{ nm:"CDF قلابی: چپ‌پیوسته", y:[-0.08,1.12], x:[-3,3],
    jumps:[-1,0,2], lc:true,
    F:function(x){ return x<=-1?0 : x<=0?0.2 : x<=2?0.7 : 1; },
    d:"<b>CDF (با قرارداد پاپولیس) نیست.</b> این تابع $P\\{X<x\\}$ را می‌دهد نه $P\\{X\\le x\\}$. ناکاهشی است و حدهایش درست است، اما در نقاط پرش <b>چپ</b>‌پیوسته است. ببینید دایرهٔ تو‌پُر کجا می‌افتد." },
  lim:{ nm:"CDF قلابی: حدها غلط", y:[-1.2,1.2], x:[-3,3],
    jumps:[],
    F:function(x){ return 1-Math.exp(-x); },
    d:"<b>CDF نیست.</b> $F(x)=1-e^{-x}$ روی کل $\\mathbb{R}$: ناکاهشی و پیوسته است، ولی $F(x)\\to-\\infty$ وقتی $x\\to-\\infty$ و مقادیر منفی می‌گیرد — نقض اصل اول و شرط حد." }
};
var CD = {key:"disc", a:1, z:0};

function cdfChecks(k){
  var P = CDFS[k], F=P.F, bad=[];
  var mono=true, lo=-60, hi=60, N=5000, prev=F(lo);
  for(var i=1;i<=N;i++){
    var x = lo + (hi-lo)*i/N, v=F(x);
    if(v < prev - 1e-12){ mono=false; break; }
    prev=v;
  }
  var l0 = F(-1e6), l1 = F(1e6);
  var lim = Math.abs(l0)<1e-6 && Math.abs(l1-1)<1e-6;
  var rc = true;
  (P.jumps||[]).forEach(function(a){
    if(Math.abs(F(a+1e-9)-F(a)) > 1e-6) rc=false;
  });
  var rng = true;
  for(var j=0;j<=400;j++){ var x2=lo+(hi-lo)*j/400, v2=F(x2); if(v2<-1e-9||v2>1+1e-9){ rng=false; break; } }
  return {mono:mono, lim:lim, rc:rc, rng:rng};
}
function renderCdf(){
  $("#cdfPicker").innerHTML = Object.keys(CDFS).map(function(k){
    var bad = /نیست|قلابی|نزولی/.test(CDFS[k].nm+CDFS[k].d) && k!=="disc" && k!=="mix" && k!=="cont";
    return '<button class="btn '+(k===CD.key?"sel":"")+'" style="font-size:12.5px" data-cdf="'+k+'">'+CDFS[k].nm+'</button>';
  }).join("");
  $("#cdfPicker").querySelectorAll("[data-cdf]").forEach(function(b){
    b.addEventListener("click", function(){
      CD.key=b.getAttribute("data-cdf");
      var P=CDFS[CD.key];
      CD.a = (P.jumps&&P.jumps.length)? P.jumps[0] : 0;
      CD.z = 0;
      var s=$("#cdfA"); s.min=P.x[0]; s.max=P.x[1]; s.value=CD.a;
      renderCdf();
    });
  });
  var P = CDFS[CD.key], F=P.F;
  var s=$("#cdfA"); s.min=P.x[0]; s.max=P.x[1];
  CD.a = Math.min(P.x[1], Math.max(P.x[0], CD.a));
  s.value = CD.a;
  $("#cdfZ").value = CD.z;
  $("#cdfAv").textContent = CD.a.toFixed(3);
  var zf = Math.pow(10, -CD.z/40);
  $("#cdfZv").textContent = "×"+(1/zf).toFixed(zf>0.1?1:0);
  drawCdf();

  var h = 1e-9, Fa=F(CD.a), Fm=F(CD.a-h), Fp=F(CD.a+h), jump=Fa-Fm;
  $("#cdfReadout").innerHTML = [
    ro("$F(a^-)$", Fm.toFixed(4)),
    ro("$F(a)$", Fa.toFixed(4)),
    ro("$F(a^+)$", Fp.toFixed(4)),
    ro("$F(a)-F(a^-)$", jump.toFixed(4)),
    ro("$F(a^+)-F(a)$", (Fp-Fa).toFixed(4))
  ].join("");
  typeset($("#cdfReadout"));

  var c = cdfChecks(CD.key);
  var ok = c.mono && c.lim && c.rc && c.rng;
  $("#cdfVerdict").innerHTML =
    '<div class="row" style="gap:7px">'+
      '<span class="pill '+(c.mono?"ok":"no")+'">ناکاهشی '+(c.mono?"✓":"✗")+'</span>'+
      '<span class="pill '+(c.rc?"ok":"no")+'">راست‌پیوسته '+(c.rc?"✓":"✗")+'</span>'+
      '<span class="pill '+(c.lim?"ok":"no")+'">حدهای ۰ و ۱ '+(c.lim?"✓":"✗")+'</span>'+
      '<span class="pill '+(c.rng?"ok":"no")+'">مقادیر در [0,1] '+(c.rng?"✓":"✗")+'</span>'+
      '<span class="pill '+(ok?"ok":"no")+'" style="font-weight:600">'+(ok?"CDF معتبر است":"CDF نیست")+'</span>'+
    '</div>';
  var why = '<div class="'+(ok?"note":"warnbox")+'" style="margin:0"><span class="lbl">'+P.nm+'</span>'+P.d;
  if(jump>1e-6) why += '<br><br>در $a='+CD.a.toFixed(3)+'$ ارتفاع پرش $'+jump.toFixed(3)+
    '$ است. برای یک CDF معتبر این عدد دقیقاً $P\\{X=a\\}$ است.';
  else if(jump< -1e-6) why += '<br><br>در $a='+CD.a.toFixed(3)+'$ پرش <b>منفی</b> است ($'+jump.toFixed(3)+
    '$). برای یک CDF این محال است، چون باید با $P\\{X=a\\}\\ge 0$ برابر می‌شد.';
  why += '</div>';
  $("#cdfWhy").innerHTML = why;
  typeset($("#cdfWhy"));
}
function drawCdf(){
  var o = cv("cdfChart", 290), g=o.g, W=o.w, H=o.h;
  var L=52, R=16, T=16, B=32, pw=W-L-R, ph=H-T-B;
  var P = CDFS[CD.key], F=P.F;
  var mut=tok("--muted"), line=tok("--line"), cont=tok("--cont"), disc=tok("--disc"), ink=tok("--ink"), surf=tok("--surface");
  var zf = Math.pow(10, -CD.z/40);
  var halfW = (P.x[1]-P.x[0])/2 * zf;
  var x0 = CD.a-halfW, x1 = CD.a+halfW;
  var y0 = P.y[0], y1 = P.y[1];
  function X(x){ return L + pw*(x-x0)/(x1-x0); }
  function Y(y){ return T + ph*(1-(y-y0)/(y1-y0)); }

  // grid + axes
  g.font="11px "+(tok("--mono")||"monospace"); g.strokeStyle=line; g.lineWidth=1;
  var yticks = (y1-y0)>3 ? [-3,-2,-1,0,1,2,3] : (y1>1.05? [0,0.25,0.5,0.75,1] : [0,0.25,0.5,0.75,1]);
  yticks.filter(function(t){return t>=y0&&t<=y1;}).forEach(function(t){
    g.strokeStyle = Math.abs(t)<1e-9 ? tok("--line-2") : line;
    g.beginPath(); g.moveTo(L,Y(t)); g.lineTo(W-R,Y(t)); g.stroke();
    g.fillStyle=mut; g.textAlign="right"; g.textBaseline="middle";
    g.fillText(((y1-y0)>3? t.toFixed(0):t.toFixed(2)), L-7, Y(t));
  });
  var nx=6, dec = (x1-x0)<0.02?4:(x1-x0)<0.5?3:(x1-x0)<3?2:1;
  g.textAlign="center"; g.textBaseline="top";
  for(var i=0;i<=nx;i++){
    var xv = x0 + (x1-x0)*i/nx;
    g.strokeStyle=line; g.beginPath(); g.moveTo(X(xv),T); g.lineTo(X(xv),T+ph); g.stroke();
    g.fillStyle=mut; g.fillText(xv.toFixed(dec), X(xv), T+ph+7);
  }

  // curve, with breaks at jumps
  g.strokeStyle=cont; g.lineWidth=2.2; g.beginPath();
  var N=1400, started=false, prevY=null;
  for(var k=0;k<=N;k++){
    var x = x0 + (x1-x0)*k/N, y = F(x);
    if(!isFinite(y)){ started=false; continue; }
    var py = Math.min(Math.max(y,y0),y1);
    if(started && prevY!==null && Math.abs(y-prevY) > (y1-y0)*0.02){
      g.stroke(); g.beginPath(); started=false;
    }
    if(!started){ g.moveTo(X(x),Y(py)); started=true; } else g.lineTo(X(x),Y(py));
    prevY=y;
  }
  g.stroke();

  // jump markers: filled = F(a), hollow = F(a^-)
  (P.jumps||[]).forEach(function(a){
    if(a<x0-1e-12 || a>x1+1e-12) return;
    var Fa=F(a), Fm=F(a-1e-9), Fp=F(a+1e-9);
    g.strokeStyle=line; g.setLineDash([3,3]); g.lineWidth=1;
    g.beginPath(); g.moveTo(X(a),Y(Math.min(Fa,Fm))); g.lineTo(X(a),Y(Math.max(Fa,Fm))); g.stroke(); g.setLineDash([]);
    // hollow at the one-sided limit that differs from F(a)
    g.fillStyle=surf; g.strokeStyle=cont; g.lineWidth=2;
    g.beginPath(); g.arc(X(a),Y(Math.min(Math.max(Fm,y0),y1)),4.4,0,6.284); g.fill(); g.stroke();
    if(Math.abs(Fp-Fa)>1e-7){
      g.beginPath(); g.arc(X(a),Y(Math.min(Math.max(Fp,y0),y1)),4.4,0,6.284); g.fill(); g.stroke();
    }
    g.fillStyle=cont;
    g.beginPath(); g.arc(X(a),Y(Math.min(Math.max(Fa,y0),y1)),4.4,0,6.284); g.fill();
  });

  // the inspection line at a
  g.strokeStyle=disc; g.lineWidth=1.6; g.setLineDash([5,4]);
  g.beginPath(); g.moveTo(X(CD.a),T); g.lineTo(X(CD.a),T+ph); g.stroke(); g.setLineDash([]);
  g.fillStyle=disc; g.textAlign="left"; g.textBaseline="top"; g.font="11px "+(tok("--mono")||"monospace");
  if(X(CD.a) < W-R-40) g.fillText("a="+CD.a.toFixed(dec+1), X(CD.a)+4, T+3);
  else { g.textAlign="right"; g.fillText("a="+CD.a.toFixed(dec+1), X(CD.a)-4, T+3); }

  g.strokeStyle=tok("--line-2"); g.lineWidth=1;
  g.beginPath(); g.moveTo(L,T); g.lineTo(L,T+ph); g.lineTo(W-R,T+ph); g.stroke();

  // legend
  g.font="11px "+(tok("--body")||"sans-serif"); g.textAlign="right"; g.textBaseline="top";
  g.fillStyle=mut;
  g.fillText("● تو‌پُر = F(a)   ○ تو‌خالی = حدِ یک‌طرفه", W-R-2, T+2);
}
