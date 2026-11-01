"use strict";
/* ---------- نمایش‌های تعاملی ویژهٔ مسائل تمرین ----------
   هر نمایش باید ریاضیاتِ همان مسئله را دقیقاً بازتاب دهد؛ هیچ‌کدام تزئینی نیست. */

var VIZ = {};   /* وضعیت هر نمایش */

function vizHost(id){ return $("#a1Viz-"+id); }

/* ═══════ مسئلهٔ ۳ — شمارش پوآسون، چندک، و دو روز ═══════ */
function poissonPmf(k, lam){
  var lg = -lam + k*Math.log(lam);
  for(var i=2;i<=k;i++) lg -= Math.log(i);
  return Math.exp(lg);
}
function poissonCdf(n, lam){
  var s = 0;
  for(var k=0;k<=n;k++) s += poissonPmf(k, lam);
  return Math.min(1, s);
}
/* کوچک‌ترین n با P{N<=n} >= p  (چندک گسسته) */
function poissonQuantile(p, lam){
  var s = 0;
  for(var k=0;k<2000;k++){
    s += poissonPmf(k, lam);
    if(s >= p - 1e-12) return k;
  }
  return 2000;
}
function drawPoisson(){
  var st = VIZ.pois = VIZ.pois || {rate:144, unit:"month", conf:0.90};
  var host = vizHost("p3"); if(!host) return;
  var per = {month:1/12, week:7/365, day:1/365, two:2/365};
  var lam = st.rate * per[st.unit];
  var n = poissonQuantile(st.conf, lam);
  var atLeast1 = 1 - Math.exp(-lam);

  host.querySelector("[data-pv='rate']").textContent = st.rate;
  host.querySelector("[data-pv='conf']").textContent = (st.conf*100).toFixed(0)+"٪";
  host.querySelector("[data-pout]").innerHTML = [
    ro("$\\lambda$ در این بازه", lam.toFixed(4)),
    ro("چندک مورد نیاز $n$", fa(n)),
    ro("$P\\{N\\le n\\}$", poissonCdf(n, lam).toFixed(5)),
    ro("$P\\{N\\le n-1\\}$", (n>0?poissonCdf(n-1, lam).toFixed(5):"0")),
    ro("$P\\{N\\ge1\\}$", atLeast1.toFixed(5))
  ].join("");
  typeset(host.querySelector("[data-pout]"));

  var o = cv("poisChart", 250), g = o.g, W = o.w, H = o.h;
  var L=46,R=14,T=14,B=30,pw=W-L-R,ph=H-T-B;
  var mut=tok("--muted"), line=tok("--line"), cont=tok("--cont"), disc=tok("--disc"), good=tok("--good");
  var kmax = Math.max(8, Math.ceil(lam + 4*Math.sqrt(lam) + 2));
  var pmax = 0;
  for(var k=0;k<=kmax;k++) pmax = Math.max(pmax, poissonPmf(k, lam));
  pmax = pmax*1.15 || 1;
  function X(k){ return L + pw*(k+0.5)/(kmax+1); }
  function Y(v){ return T + ph*(1 - v/pmax); }
  var bw = Math.max(2, pw/(kmax+1)*0.72);

  g.strokeStyle=line; g.font="11px "+(tok("--mono")||"monospace"); g.fillStyle=mut;
  for(var t=0;t<=4;t++){
    var v = pmax*t/4;
    g.beginPath(); g.moveTo(L,Y(v)); g.lineTo(W-R,Y(v)); g.stroke();
    g.textAlign="right"; g.textBaseline="middle"; g.fillText(v.toFixed(2), L-6, Y(v));
  }
  for(var k2=0;k2<=kmax;k2++){
    var pk = poissonPmf(k2, lam);
    g.fillStyle = k2<=n ? cont : disc;
    g.globalAlpha = k2<=n ? 0.85 : 0.35;
    g.fillRect(X(k2)-bw/2, Y(pk), bw, Y(0)-Y(pk));
    g.globalAlpha = 1;
    if(kmax<=24 || k2%2===0){
      g.fillStyle=mut; g.textAlign="center"; g.textBaseline="top";
      g.fillText(String(k2), X(k2), T+ph+6);
    }
  }
  /* مرز چندک */
  g.strokeStyle=good; g.lineWidth=2; g.setLineDash([5,4]);
  g.beginPath(); g.moveTo(X(n)+bw/2+1, T); g.lineTo(X(n)+bw/2+1, T+ph); g.stroke(); g.setLineDash([]);
  g.fillStyle=good; g.textAlign="right"; g.textBaseline="top"; g.font="11px "+(tok("--body")||"sans-serif");
  g.fillText("n = "+n, X(n)+bw/2-4, T+4);
  g.strokeStyle=tok("--line-2"); g.lineWidth=1;
  g.beginPath(); g.moveTo(L,T); g.lineTo(L,T+ph); g.lineTo(W-R,T+ph); g.stroke();

  host.querySelector("[data-pnote]").innerHTML =
    'ستون‌های پررنگ مجموعاً $P\\{N\\le n\\}='+poissonCdf(n,lam).toFixed(4)+'$ را می‌سازند. '+
    'توجه کنید با یک واحد کمتر، $P\\{N\\le n-1\\}='+(n>0?poissonCdf(n-1,lam).toFixed(4):"0")+'$ است که '+
    'از آستانهٔ خواسته‌شده <b>کمتر</b> می‌ماند — به همین دلیل جواب نامساوی است، نه معادله.';
  typeset(host.querySelector("[data-pnote]"));
}

/* ═══════ مسئله‌های ۶ و ۱۰ — تبدیل متغیر تصادفی ═══════ */
function drawTransform(which){
  var host = vizHost(which); if(!host) return;
  var st = VIZ[which] = VIZ[which] || (which==="p6" ? {lam:1, beta:2} : {lam:2});
  var o = cv("trChart-"+which, 260), g = o.g, W = o.w, H = o.h;
  var L=44,R=14,T=14,B=30,pw=W-L-R,ph=H-T-B;
  var mut=tok("--muted"), line=tok("--line"), cont=tok("--cont"), disc=tok("--disc");

  var fSrc, fDst, gmap, x0, x1, y1, labSrc, labDst;
  if(which==="p6"){
    var lam = st.lam, beta = st.beta;
    x0 = 0; x1 = 4; y1 = 4;
    fSrc = function(x){ return x<0?0: lam*Math.exp(-lam*x); };
    fDst = function(y){ return y<0?0: lam*beta*Math.pow(y, beta-1)*Math.exp(-lam*Math.pow(y, beta)); };
    gmap = function(x){ return Math.pow(Math.max(x,0), 1/beta); };
    labSrc = "f_X — نمایی"; labDst = "f_Y — ویبول";
    host.querySelector("[data-tv='lam']").textContent = lam.toFixed(2);
    host.querySelector("[data-tv='beta']").textContent = beta.toFixed(2);
  } else {
    var l2 = st.lam;
    x0 = -1; x1 = 1; y1 = 3;
    fSrc = function(x){ return (x>=-1&&x<=1)?0.5:0; };
    fDst = function(y){ return y<0?0: l2*Math.exp(-l2*y); };
    gmap = function(x){ return x>=1?Infinity: -Math.log((1-x)/2)/l2; };
    labSrc = "f_X — یکنواخت [-1,1]"; labDst = "f_Y — نمایی";
    host.querySelector("[data-tv='lam']").textContent = l2.toFixed(2);
  }

  var fmax = 0;
  for(var i=0;i<=200;i++){
    fmax = Math.max(fmax, fSrc(x0+(x1-x0)*i/200), fDst(y1*i/200));
  }
  fmax = Math.min(fmax*1.2, 6) || 1;
  function Xp(v, lo, hi){ return L + pw*(v-lo)/(hi-lo); }
  function Yp(v){ return T + ph*(1 - v/fmax); }

  g.strokeStyle=line; g.font="11px "+(tok("--mono")||"monospace"); g.fillStyle=mut;
  for(var t=0;t<=4;t++){
    var yy = T+ph*t/4;
    g.beginPath(); g.moveTo(L,yy); g.lineTo(W-R,yy); g.stroke();
    g.textAlign="right"; g.textBaseline="middle";
    g.fillText((fmax*(1-t/4)).toFixed(1), L-6, yy);
  }
  function curve(f, lo, hi, color, dash){
    g.strokeStyle=color; g.lineWidth=2.2; g.setLineDash(dash||[]);
    g.beginPath();
    var started=false;
    for(var i2=0;i2<=400;i2++){
      var v = lo+(hi-lo)*i2/400, fv = f(v);
      if(!isFinite(fv)) continue;
      var px = Xp(v, lo, hi), py = Yp(Math.min(fv, fmax));
      if(!started){ g.moveTo(px,py); started=true; } else g.lineTo(px,py);
    }
    g.stroke(); g.setLineDash([]);
  }
  curve(fSrc, x0, x1, disc, [5,4]);
  curve(fDst, 0, y1, cont);
  g.font="12px "+(tok("--body")||"sans-serif"); g.textAlign="left"; g.textBaseline="top";
  g.fillStyle=disc; g.fillText(labSrc, L+8, T+4);
  g.fillStyle=cont; g.fillText(labDst, L+8, T+22);
  g.strokeStyle=tok("--line-2"); g.lineWidth=1;
  g.beginPath(); g.moveTo(L,T); g.lineTo(L,T+ph); g.lineTo(W-R,T+ph); g.stroke();
  g.fillStyle=mut; g.font="11px "+(tok("--mono")||"monospace");
  g.textAlign="center"; g.textBaseline="top";
  g.fillText("محور افقی: مقدار متغیر (هر دو چگالی روی یک محور نرمال‌شده رسم شده‌اند)", L+pw/2, T+ph+10);

  /* بررسی عددی نرمال‌سازی — همان آزمونی که در متن توصیه شده */
  var area = 0, NN = 4000;
  for(var j=0;j<NN;j++){
    var yv = y1*(j+0.5)/NN;
    area += fDst(yv)*(y1/NN);
  }
  host.querySelector("[data-tout]").innerHTML = [
    ro("$\\int_0^{"+y1+"} f_Y$", area.toFixed(4)),
    ro("باقی‌ماندهٔ دُم", (1-area).toFixed(4)),
    ro("$g("+(which==="p6"?"1":"0")+")$", (gmap(which==="p6"?1:0)).toFixed(4))
  ].join("");
  typeset(host.querySelector("[data-tout]"));
}

/* ═══════ مسئلهٔ ۱۱ — درخت احتمال و بیز ═══════ */
function drawBayes(){
  var st = VIZ.bayes = VIZ.bayes || {prior:0.5, l1:0.99, l2:0.01};
  var host = vizHost("p11"); if(!host) return;
  var pr = st.prior, l1 = st.l1, l2 = st.l2;
  var j1 = pr*l1, j2 = (1-pr)*l2, pr_ = j1+j2;
  var post = pr_>0 ? j1/pr_ : 0;

  host.querySelector("[data-bv='prior']").textContent = pr.toFixed(3);
  host.querySelector("[data-bv='l1']").textContent = l1.toFixed(3);
  host.querySelector("[data-bv='l2']").textContent = l2.toFixed(3);

  var ink=tok("--ink"), mut=tok("--muted"), cont=tok("--cont"), disc=tok("--disc"), line=tok("--line-2");
  var W=560, H=240;
  function node(x,y,w,h,label,fill){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(fill||tok("--surface"))+
      '" stroke="'+line+'"/><text x="'+(x+w/2)+'" y="'+(y+h/2+4)+'" text-anchor="middle" fill="'+ink+
      '" font-size="12">'+label+'</text>';
  }
  function edge(x1,y1,x2,y2,lab,col){
    var mx=(x1+x2)/2, my=(y1+y2)/2;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||line)+'" stroke-width="1.6"/>'+
      '<text x="'+mx+'" y="'+(my-5)+'" text-anchor="middle" fill="'+(col||mut)+'" font-size="11">'+lab+'</text>';
  }
  /* RTL: ریشه سمت راست */
  var svg =
    node(W-96, H/2-16, 86, 32, "آزمایش") +
    edge(W-96, H/2, W-230, 52, "P(B₁)="+pr.toFixed(2), cont) +
    edge(W-96, H/2, W-230, H-52, "P(B₂)="+(1-pr).toFixed(2), disc) +
    node(W-316, 36, 86, 32, "جعبهٔ ۱") +
    node(W-316, H-68, 86, 32, "جعبهٔ ۲") +
    edge(W-316, 52, W-440, 24, "قرمز "+l1.toFixed(2), cont) +
    edge(W-316, 52, W-440, 80, "سفید "+(1-l1).toFixed(2)) +
    edge(W-316, H-52, W-440, H-80, "قرمز "+l2.toFixed(2), disc) +
    edge(W-316, H-52, W-440, H-24, "سفید "+(1-l2).toFixed(2)) +
    node(W-526, 8, 86, 32, j1.toFixed(4), tok("--cont-soft")) +
    node(W-526, 64, 86, 32, (pr*(1-l1)).toFixed(4)) +
    node(W-526, H-96, 86, 32, j2.toFixed(4), tok("--disc-soft")) +
    node(W-526, H-40, 86, 32, ((1-pr)*(1-l2)).toFixed(4));
  $("#bayesTree").innerHTML = svg;

  /* نوار دقیق: سهم دو مسیر قرمز */
  var BW=520, X0=20, BY=16, BH=34;
  var w1 = pr_>0 ? (j1/pr_)*BW : 0;
  var bar = '<rect x="'+X0+'" y="'+BY+'" width="'+BW+'" height="'+BH+'" fill="'+tok("--surface-2")+'" stroke="'+line+'"/>'+
    '<rect x="'+X0+'" y="'+BY+'" width="'+w1+'" height="'+BH+'" fill="'+cont+'" opacity="0.55"/>'+
    '<rect x="'+(X0+w1)+'" y="'+BY+'" width="'+(BW-w1)+'" height="'+BH+'" fill="'+disc+'" opacity="0.55"/>'+
    '<text x="'+(X0+w1/2)+'" y="'+(BY+BH/2+4)+'" text-anchor="middle" fill="'+ink+'" font-size="12">جعبهٔ ۱ · '+
      (post*100).toFixed(1)+'٪</text>'+
    (BW-w1 > 56 ? '<text x="'+(X0+w1+(BW-w1)/2)+'" y="'+(BY+BH/2+4)+'" text-anchor="middle" fill="'+ink+
      '" font-size="12">جعبهٔ ۲ · '+((1-post)*100).toFixed(1)+'٪</text>' : '');
  $("#bayesBar").innerHTML = bar;

  var oddsPrior = (1-pr)>0 ? pr/(1-pr) : Infinity;
  var lr = l2>0 ? l1/l2 : Infinity;
  host.querySelector("[data-bout]").innerHTML = [
    ro("$P(R)$ کل", pr_.toFixed(5)),
    ro("پسین $P(B_1\\mid R)$", post.toFixed(5)),
    ro("بخت پیشین", isFinite(oddsPrior)?oddsPrior.toFixed(3):"∞"),
    ro("نسبت درست‌نمایی", isFinite(lr)?lr.toFixed(2):"∞"),
    ro("بخت پسین", (isFinite(oddsPrior)&&isFinite(lr))?(oddsPrior*lr).toFixed(2):"∞")
  ].join("");
  typeset(host.querySelector("[data-bout]"));

  var msg;
  if(Math.abs(post-0.5) < 0.02)
    msg = 'پسین تقریباً $0{,}5$ است: شاهد قوی دقیقاً با پیشین ضعیف خنثی شده. '+
          'این همان <b>مغالطهٔ نرخ پایه</b> است — جایی که شهود بیشترین خطا را می‌کند.';
  else if(post > 0.9)
    msg = 'شاهد به‌شدت به نفع جعبهٔ ۱ است. توجه کنید بخت پسین حاصل‌ضرب بخت پیشین در نسبت درست‌نمایی است — '+
          'ضرب‌کردن، از کار با مخرج بیز ساده‌تر است.';
  else
    msg = 'پیشین را به سمت صفر ببرید و ببینید چطور حتی با نسبت درست‌نمایی $99$، پسین سقوط می‌کند. '+
          'این دقیقاً چیزی است که در تست‌های تشخیصی بیماری‌های نادر رخ می‌دهد.';
  host.querySelector("[data-bnote]").innerHTML = msg;
  typeset(host.querySelector("[data-bnote]"));
}

/* ═══════ مسئلهٔ ۵ — چگالی و CDF کنار هم ═══════ */
function drawDensity(){
  var st = VIZ.dens = VIZ.dens || {a:0.25, b:0.75};
  var host = vizHost("p5"); if(!host) return;
  if(st.a > st.b){ var t0 = st.a; st.a = st.b; st.b = t0; }
  var f = function(x){ return (x>=-1&&x<=1) ? 0.75*(1-x*x) : 0; };
  var F = function(x){ return x<-1?0 : x>1?1 : 0.75*(x - x*x*x/3 + 2/3); };
  var prob = F(st.b) - F(st.a);

  host.querySelector("[data-dv='a']").textContent = st.a.toFixed(2);
  host.querySelector("[data-dv='b']").textContent = st.b.toFixed(2);

  var o = cv("densChart", 250), g = o.g, W = o.w, H = o.h;
  var L=44,R=14,T=14,B=28,pw=W-L-R,ph=H-T-B;
  var mut=tok("--muted"), line=tok("--line"), cont=tok("--cont"), disc=tok("--disc");
  var ymax = 1.1;
  function X(x){ return L + pw*(x+1.2)/2.4; }
  function Y(v){ return T + ph*(1 - v/ymax); }

  g.strokeStyle=line;
  for(var t=0;t<=4;t++){
    var v = ymax*t/4;
    g.beginPath(); g.moveTo(L,Y(v)); g.lineTo(W-R,Y(v)); g.stroke();
    g.fillStyle=mut; g.font="11px "+(tok("--mono")||"monospace");
    g.textAlign="right"; g.textBaseline="middle"; g.fillText(v.toFixed(2), L-6, Y(v));
  }
  /* ناحیهٔ شاخص زیر چگالی */
  g.fillStyle=cont; g.globalAlpha=0.26; g.beginPath(); g.moveTo(X(st.a), Y(0));
  for(var i=0;i<=120;i++){ var xv = st.a + (st.b-st.a)*i/120; g.lineTo(X(xv), Y(f(xv))); }
  g.lineTo(X(st.b), Y(0)); g.closePath(); g.fill(); g.globalAlpha=1;
  /* چگالی */
  g.strokeStyle=cont; g.lineWidth=2.3; g.beginPath();
  for(var i2=0;i2<=400;i2++){ var x2=-1.2+2.4*i2/400; var px=X(x2), py=Y(f(x2)); i2?g.lineTo(px,py):g.moveTo(px,py); }
  g.stroke();
  /* CDF */
  g.strokeStyle=disc; g.lineWidth=2; g.setLineDash([6,4]); g.beginPath();
  for(var i3=0;i3<=400;i3++){ var x3=-1.2+2.4*i3/400; var px3=X(x3), py3=Y(F(x3)); i3?g.lineTo(px3,py3):g.moveTo(px3,py3); }
  g.stroke(); g.setLineDash([]);
  /* خط‌های a و b */
  [[st.a,"a"],[st.b,"b"]].forEach(function(p){
    g.strokeStyle=mut; g.lineWidth=1; g.setLineDash([3,3]);
    g.beginPath(); g.moveTo(X(p[0]),T); g.lineTo(X(p[0]),T+ph); g.stroke(); g.setLineDash([]);
  });
  g.font="12px "+(tok("--body")||"sans-serif"); g.textAlign="left"; g.textBaseline="top";
  g.fillStyle=cont; g.fillText("f_X(x)", L+8, T+4);
  g.fillStyle=disc; g.fillText("F_X(x)", L+8, T+22);
  g.strokeStyle=tok("--line-2"); g.lineWidth=1;
  g.beginPath(); g.moveTo(L,T); g.lineTo(L,T+ph); g.lineTo(W-R,T+ph); g.stroke();
  g.fillStyle=mut; g.font="11px "+(tok("--mono")||"monospace");
  g.textAlign="center"; g.textBaseline="top";
  [-1,-0.5,0,0.5,1].forEach(function(x){ g.fillText(String(x), X(x), T+ph+6); });

  host.querySelector("[data-dout]").innerHTML = [
    ro("$F_X(a)$", F(st.a).toFixed(5)),
    ro("$F_X(b)$", F(st.b).toFixed(5)),
    ro("$P\\{a<X<b\\}$", prob.toFixed(5)),
    ro("مساحت سایه‌زده", prob.toFixed(5)),
    ro("$f_X$ در وسط بازه", f((st.a+st.b)/2).toFixed(4))
  ].join("");
  typeset(host.querySelector("[data-dout]"));
  host.querySelector("[data-dnote]").innerHTML =
    'سطح سایه‌زده زیر چگالی، دقیقاً برابر پرش $F$ بین همان دو نقطه است — هر دو عدد بالا یکی‌اند. '+
    'بازه را با طول ثابت جابه‌جا کنید و ببینید هرچه از مرکز دورتر شوید احتمال کمتر می‌شود، '+
    'در حالی که <b>طول بازه تغییر نکرده</b>. همین نشان می‌دهد چرا چگالی احتمال نیست.';
  typeset(host.querySelector("[data-dnote]"));
}

/* ═══════ راه‌انداز ═══════ */
function drawA1Instruments(id){
  if(id==="p3") drawPoisson();
  else if(id==="p5") drawDensity();
  else if(id==="p6") drawTransform("p6");
  else if(id==="p10") drawTransform("p10");
  else if(id==="p11") drawBayes();
}
/* نشانهٔ اینکه کدام مسئله نمایش تعاملی دارد */
var A1_VIZ = {
  p3:{title:"آزمایشگاه پوآسون — چندک و احتمال دُم", tag:"quantile · rate scaling"},
  p5:{title:"چگالی و CDF کنار هم", tag:"area = ΔF"},
  p6:{title:"تبدیل نمایی به ویبول", tag:"change of variable"},
  p10:{title:"تبدیل یکنواخت به نمایی", tag:"inverse transform"},
  p11:{title:"درخت احتمال و بخت پسین", tag:"prior × likelihood"}
};
function a1VizMarkup(id){
  var v = A1_VIZ[id]; if(!v) return "";
  var ctrls = "";
  if(id==="p3") ctrls =
    '<div class="row">'+
      '<label class="ctl">نرخ سالانه <span class="v" data-pv="rate"></span>'+
        '<input type="range" id="pRate" min="12" max="600" step="12" value="144"></label>'+
      '<label class="ctl">سطح اطمینان <span class="v" data-pv="conf"></span>'+
        '<input type="range" id="pConf" min="0.5" max="0.99" step="0.01" value="0.9"></label>'+
    '</div>'+
    '<div class="row" style="margin-top:8px">'+
      '<button class="btn" data-punit="month">یک ماه</button>'+
      '<button class="btn" data-punit="week">یک هفته</button>'+
      '<button class="btn" data-punit="two">دو روز</button>'+
      '<button class="btn" data-punit="day">یک روز</button>'+
    '</div>'+
    '<div class="cvswrap" style="margin-top:12px"><canvas id="poisChart" height="250"></canvas></div>'+
    '<div class="readout" data-pout></div><p style="font-size:13.4px;margin:10px 0 0" data-pnote></p>';
  if(id==="p5") ctrls =
    '<div class="row">'+
      '<label class="ctl">کران پایین a = <span class="v" data-dv="a"></span>'+
        '<input type="range" id="dA" min="-1" max="1" step="0.01" value="0.25"></label>'+
      '<label class="ctl">کران بالا b = <span class="v" data-dv="b"></span>'+
        '<input type="range" id="dB" min="-1" max="1" step="0.01" value="0.75"></label>'+
    '</div>'+
    '<div class="cvswrap" style="margin-top:12px"><canvas id="densChart" height="250"></canvas></div>'+
    '<div class="readout" data-dout></div><p style="font-size:13.4px;margin:10px 0 0" data-dnote></p>';
  if(id==="p6") ctrls =
    '<div class="row">'+
      '<label class="ctl">$\\lambda$ = <span class="v" data-tv="lam"></span>'+
        '<input type="range" id="t6lam" min="0.2" max="3" step="0.05" value="1"></label>'+
      '<label class="ctl">$\\beta$ (شکل) = <span class="v" data-tv="beta"></span>'+
        '<input type="range" id="t6beta" min="0.3" max="4" step="0.05" value="2"></label>'+
    '</div>'+
    '<div class="cvswrap" style="margin-top:12px"><canvas id="trChart-p6" height="260"></canvas></div>'+
    '<div class="readout" data-tout></div>'+
    '<p style="font-size:13.4px;margin:10px 0 0">$\\beta$ را روی ۱ بگذارید: ویبول دقیقاً به نمایی برمی‌گردد '+
    'و دو منحنی بر هم منطبق می‌شوند — همان آزمون حالت خاصی که در متن حل توصیه شد.</p>';
  if(id==="p10") ctrls =
    '<div class="row">'+
      '<label class="ctl">$\\lambda$ مقصد = <span class="v" data-tv="lam"></span>'+
        '<input type="range" id="t10lam" min="0.3" max="4" step="0.05" value="2"></label>'+
    '</div>'+
    '<div class="cvswrap" style="margin-top:12px"><canvas id="trChart-p10" height="260"></canvas></div>'+
    '<div class="readout" data-tout></div>'+
    '<p style="font-size:13.4px;margin:10px 0 0">چگالی یکنواخت تخت است و چگالی مقصد نمایی؛ '+
    '$g$ باید جرم را از یک بازهٔ کران‌دار روی یک نیم‌خط بی‌کران پخش کند و این کار را با کشیدن '+
    'شدید نزدیک $x=1$ انجام می‌دهد.</p>';
  if(id==="p11") ctrls =
    '<div class="row">'+
      '<label class="ctl">پیشین $P(B_1)$ = <span class="v" data-bv="prior"></span>'+
        '<input type="range" id="bPrior" min="0.001" max="0.999" step="0.001" value="0.5"></label>'+
      '<label class="ctl">$P(R\\mid B_1)$ = <span class="v" data-bv="l1"></span>'+
        '<input type="range" id="bL1" min="0" max="1" step="0.005" value="0.99"></label>'+
      '<label class="ctl">$P(R\\mid B_2)$ = <span class="v" data-bv="l2"></span>'+
        '<input type="range" id="bL2" min="0" max="1" step="0.005" value="0.01"></label>'+
    '</div>'+
    '<div class="cvswrap" style="margin-top:12px"><svg id="bayesTree" width="560" height="240" role="img" aria-label="درخت احتمال بیز"></svg></div>'+
    '<div class="cvswrap"><svg id="bayesBar" width="560" height="64" role="img" aria-label="نوار سهم پسین"></svg></div>'+
    '<div class="readout" data-bout></div><p style="font-size:13.4px;margin:10px 0 0" data-bnote></p>';
  return '<div class="bench" id="a1Viz-'+id+'"><header><h4>'+v.title+'</h4>'+
    '<span class="tag">'+v.tag+'</span></header><div class="pad">'+ctrls+'</div></div>';
}
/* اتصال کنترل‌ها پس از رندر میزکار */
function a1VizBind(id){
  function on(sel, fn){ var el = $(sel); if(el) el.addEventListener("input", fn); }
  if(id==="p3"){
    on("#pRate", function(){ VIZ.pois.rate = +this.value; drawPoisson(); });
    on("#pConf", function(){ VIZ.pois.conf = +this.value; drawPoisson(); });
    $$("[data-punit]").forEach(function(b){
      b.addEventListener("click", function(){
        VIZ.pois.unit = b.getAttribute("data-punit");
        $$("[data-punit]").forEach(function(x){ x.classList.remove("sel"); });
        b.classList.add("sel");
        drawPoisson();
      });
    });
  }
  if(id==="p5"){
    on("#dA", function(){ VIZ.dens.a = +this.value; drawDensity(); });
    on("#dB", function(){ VIZ.dens.b = +this.value; drawDensity(); });
  }
  if(id==="p6"){
    on("#t6lam", function(){ VIZ.p6.lam = +this.value; drawTransform("p6"); });
    on("#t6beta", function(){ VIZ.p6.beta = +this.value; drawTransform("p6"); });
  }
  if(id==="p10") on("#t10lam", function(){ VIZ.p10.lam = +this.value; drawTransform("p10"); });
  if(id==="p11"){
    on("#bPrior", function(){ VIZ.bayes.prior = +this.value; drawBayes(); });
    on("#bL1", function(){ VIZ.bayes.l1 = +this.value; drawBayes(); });
    on("#bL2", function(){ VIZ.bayes.l2 = +this.value; drawBayes(); });
  }
  drawA1Instruments(id);
}
