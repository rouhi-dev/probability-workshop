"use strict";
/* ============================================================
   میزکار ۲ — دیاگرام ون و نوار دقیق
   ============================================================ */
var VOPS = [
  {k:"union",  l:"A ∪ B",   r:["ao","ab","bo"], tex:"A\\cup B", say:"«$A$ یا $B$»"},
  {k:"inter",  l:"A ∩ B",   r:["ab"],           tex:"A\\cap B", say:"«$A$ و $B$»"},
  {k:"cA",     l:"Ā",       r:["bo","out"],     tex:"\\bar A", say:"«$A$ رخ نداد»"},
  {k:"cB",     l:"B̄",       r:["ao","out"],     tex:"\\bar B", say:"«$B$ رخ نداد»"},
  {k:"diff",   l:"A − B",   r:["ao"],           tex:"A-B=A\\cap\\bar B", say:"«$A$ ولی نه $B$»"},
  {k:"symm",   l:"A △ B",   r:["ao","bo"],      tex:"A\\triangle B", say:"«دقیقاً یکی از دو»"},
  {k:"ncup",   l:"(A∪B)‾",  r:["out"],          tex:"\\overline{A\\cup B}", say:"«هیچ‌کدام»"},
  {k:"dm",     l:"Ā ∩ B̄",   r:["out"],          tex:"\\bar A\\cap\\bar B", say:"«نه $A$ و نه $B$» — دمورگان: با گزینهٔ قبلی یکی است"},
  {k:"S",      l:"S",       r:["ao","ab","bo","out"], tex:"S", say:"پیشامد حتمی"}
];
var V = {op:"union", a:0.5, b:0.4, c:0.2};
function vClamp(){
  var lo = Math.max(0, V.a+V.b-1), hi = Math.min(V.a, V.b);
  V.c = Math.min(hi, Math.max(lo, V.c));
}
function vProbs(){ return {ao:V.a-V.c, ab:V.c, bo:V.b-V.c, out:1-V.a-V.b+V.c}; }
function renderVenn(){
  $("#vennOps").innerHTML = VOPS.map(function(o){
    return '<button class="btn '+(o.k===V.op?"sel":"")+'" style="font-family:var(--mono);font-size:12.5px" data-vop="'+o.k+'">'+o.l+'</button>';
  }).join("");
  $("#vennOps").querySelectorAll("[data-vop]").forEach(function(b){
    b.addEventListener("click", function(){ V.op=b.getAttribute("data-vop"); renderVenn(); });
  });
  var op = VOPS.filter(function(o){return o.k===V.op;})[0];

  // --- schematic Venn (SVG) ---
  var ax=160, bx=252, cy=125, r=76;
  var on = {}; op.r.forEach(function(k){ on[k]=1; });
  var cont=tok("--cont"), disc=tok("--disc"), line=tok("--line-2"), surf=tok("--surface-2"), ink=tok("--ink");
  var svg = '<defs>'+
    '<clipPath id="clipA"><circle cx="'+ax+'" cy="'+cy+'" r="'+r+'"/></clipPath>'+
    '<clipPath id="clipB"><circle cx="'+bx+'" cy="'+cy+'" r="'+r+'"/></clipPath>'+
    '<mask id="notB"><rect x="0" y="0" width="420" height="250" fill="#fff"/><circle cx="'+bx+'" cy="'+cy+'" r="'+r+'" fill="#000"/></mask>'+
    '<mask id="notA"><rect x="0" y="0" width="420" height="250" fill="#fff"/><circle cx="'+ax+'" cy="'+cy+'" r="'+r+'" fill="#000"/></mask>'+
    '<mask id="notAB"><rect x="0" y="0" width="420" height="250" fill="#fff"/>'+
      '<circle cx="'+ax+'" cy="'+cy+'" r="'+r+'" fill="#000"/><circle cx="'+bx+'" cy="'+cy+'" r="'+r+'" fill="#000"/></mask>'+
    '</defs>'+
    '<rect x="8" y="8" width="404" height="234" rx="9" fill="'+surf+'" stroke="'+line+'"/>'+
    (on.out? '<rect x="8" y="8" width="404" height="234" rx="9" fill="'+cont+'" opacity="0.30" mask="url(#notAB)"/>':'')+
    (on.ao? '<circle cx="'+ax+'" cy="'+cy+'" r="'+r+'" fill="'+cont+'" opacity="0.42" mask="url(#notB)"/>':'')+
    (on.bo? '<circle cx="'+bx+'" cy="'+cy+'" r="'+r+'" fill="'+cont+'" opacity="0.42" mask="url(#notA)"/>':'')+
    (on.ab? '<g clip-path="url(#clipB)"><circle cx="'+ax+'" cy="'+cy+'" r="'+r+'" fill="'+disc+'" opacity="0.55"/></g>':'')+
    '<circle cx="'+ax+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+ink+'" stroke-width="1.5"/>'+
    '<circle cx="'+bx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+ink+'" stroke-width="1.5"/>'+
    '<text x="104" y="52" fill="'+ink+'" font-size="15">A</text>'+
    '<text x="306" y="52" fill="'+ink+'" font-size="15">B</text>'+
    '<text x="24" y="30" fill="'+tok("--muted")+'" font-size="13">S</text>';
  $("#vennSvg").innerHTML = svg;
  $("#vennExpr").innerHTML = '<b style="font-family:var(--mono)">$'+op.tex+'$</b> &nbsp;—&nbsp; '+op.say+
    ' <span style="color:var(--muted);font-size:12.6px">· شکل بالا شماتیک است؛ مساحت‌ها متناسب با احتمال نیستند. نوار پایین دقیق است.</span>';
  typeset($("#vennExpr"));

  // --- exact bar ---
  vClamp();
  $("#vPA").value=V.a; $("#vPB").value=V.b; $("#vPAB").value=V.c;
  $("#vPAv").textContent=V.a.toFixed(2); $("#vPBv").textContent=V.b.toFixed(2); $("#vPABv").textContent=V.c.toFixed(2);
  var p=vProbs(), BW=600, X0=20, BY=30, BH=40;
  function seg(x,w,fill,op2){ return w<=1e-9?"":'<rect x="'+(X0+x*BW)+'" y="'+BY+'" width="'+(w*BW)+'" height="'+BH+'" fill="'+fill+'" opacity="'+op2+'"/>'; }
  var base = tok("--surface-2"), g2="";
  g2 += '<rect x="'+X0+'" y="'+BY+'" width="'+BW+'" height="'+BH+'" fill="'+base+'" stroke="'+line+'"/>';
  g2 += seg(0, p.ao, on.ao?cont:base, on.ao?0.5:1);
  g2 += seg(p.ao, p.ab, on.ab?disc:base, on.ab?0.65:1);
  g2 += seg(p.ao+p.ab, p.bo, on.bo?cont:base, on.bo?0.5:1);
  g2 += seg(p.ao+p.ab+p.bo, p.out, on.out?cont:base, on.out?0.3:1);
  // boundary ticks for A and B extents
  [[0,V.a,"A",cont],[p.ao,p.ao+V.b,"B",disc]].forEach(function(t,i){
    var y = BY-10-i*0;
    g2 += '<line x1="'+(X0+t[0]*BW)+'" y1="'+(BY+BH+6+i*16)+'" x2="'+(X0+t[1]*BW)+'" y2="'+(BY+BH+6+i*16)+
          '" stroke="'+t[3]+'" stroke-width="3"/>'+
          '<text x="'+(X0+((t[0]+t[1])/2)*BW)+'" y="'+(BY+BH+4+i*16)+'" fill="'+t[3]+
          '" font-size="11" text-anchor="middle">'+t[2]+'</text>';
  });
  g2 += '<text x="'+X0+'" y="'+(BY-8)+'" fill="'+tok("--muted")+'" font-size="11">0</text>'+
        '<text x="'+(X0+BW)+'" y="'+(BY-8)+'" fill="'+tok("--muted")+'" font-family="'+(tok("--mono")||"monospace")+
        '" font-size="11" text-anchor="end">1</text>';
  $("#barSvg").innerHTML = g2;

  var sel = op.r.reduce(function(s,k){ return s+p[k]; },0);
  $("#vennReadout").innerHTML = [
    ro("$P(\\text{ناحیهٔ انتخابی})$", sel.toFixed(3)),
    ro("$P(A\\cap\\bar B)$", p.ao.toFixed(3)),
    ro("$P(A\\cap B)$", p.ab.toFixed(3)),
    ro("$P(\\bar A\\cap B)$", p.bo.toFixed(3)),
    ro("$P(\\bar A\\cap\\bar B)$", p.out.toFixed(3)),
    ro("$P(A)P(B)$", (V.a*V.b).toFixed(3))
  ].join("");
  typeset($("#vennReadout"));

  var indep = Math.abs(V.c - V.a*V.b) < 5e-3;
  var excl  = V.c < 1e-9;
  var pos   = V.a>1e-9 && V.b>1e-9;
  var parts = [];
  parts.push(excl? '<span class="pill ok">ناسازگار ✓</span>' : '<span class="pill">ناسازگار ✗</span>');
  parts.push(indep? '<span class="pill ok">مستقل ✓</span>' : '<span class="pill">مستقل ✗</span>');
  var msg;
  if(excl && pos) msg = 'هر دو احتمال مثبت‌اند و $P(A\\cap B)=0$. پس $P(A\\cap B)=0 \\ne P(A)P(B)='+(V.a*V.b).toFixed(3)+
    '$ — <b>ناسازگاری در اینجا شدیدترین نوع وابستگی است</b>، نه بی‌ربطی. دقیقاً همان تمایزی که جلسهٔ اول مطرح شد.';
  else if(excl && !pos) msg = 'یکی از احتمال‌ها صفر است. در این حالت مرزی، پیشامدها هم ناسازگارند و هم (به‌طور بدیهی) مستقل — '+
    'چون هر دو طرف تعریف استقلال صفر می‌شوند. این تنها حالتی است که ناسازگاری و استقلال با هم می‌آیند.';
  else if(indep) msg = '$P(A\\cap B)='+V.c.toFixed(3)+'$ و $P(A)P(B)='+(V.a*V.b).toFixed(3)+'$ — عملاً برابرند، پس مستقل‌اند. '+
    'توجه کنید که اشتراکشان <b>ناتهی</b> است؛ استقلال دربارهٔ اندازه است، نه دربارهٔ تهی‌بودن اشتراک.';
  else msg = '$P(A\\cap B)='+V.c.toFixed(3)+'$ در حالی که $P(A)P(B)='+(V.a*V.b).toFixed(3)+'$. نه ناسازگار، نه مستقل — '+
    'حالت عمومی. علامت اختلاف می‌گوید کدام جهت: اگر $P(A\\cap B)>P(A)P(B)$ آنگاه $P(A|B)>P(A)$، یعنی $B$ شاهدی <b>به نفع</b> $A$ است.';
  $("#vennVerdict").innerHTML = '<div class="row" style="gap:7px;margin-bottom:7px">'+parts.join("")+'</div>'+
    '<div style="font-size:13.6px">'+msg+'</div>';
  typeset($("#vennVerdict"));
}
