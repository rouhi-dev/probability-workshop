"use strict";
/* ---------- dependency graph ---------- */
var gSel = null;
function ancestorsOf(id){
  var pre = {}; GRAPH.edges.forEach(function(e){ (pre[e[1]]=pre[e[1]]||[]).push(e[0]); });
  var out={}, stack=[id];
  while(stack.length){
    var n=stack.pop();
    (pre[n]||[]).forEach(function(p){ if(!out[p]){ out[p]=1; stack.push(p); } });
  }
  return out;
}
function renderGraph(){
  var svg = $("#depgraph");
  var pos={}; GRAPH.nodes.forEach(function(n){ pos[n.id]=n; });
  var anc = gSel ? ancestorsOf(gSel) : null;
  var W=118, H=30;
  var eds = GRAPH.edges.map(function(e){
    var a=pos[e[0]], b=pos[e[1]];
    if(!a||!b) return "";
    var hot = anc && ((anc[e[0]]||e[0]===gSel) && (anc[e[1]]||e[1]===gSel));
    var cls = anc ? (hot?"ed hot":"ed dim") : "ed";
    var y1=a.y+H/2, y2=b.y-H/2, my=(y1+y2)/2;
    return '<path class="'+cls+'" d="M '+a.x+' '+y1+' C '+a.x+' '+my+', '+b.x+' '+my+', '+b.x+' '+y2+'"/>';
  }).join("");
  var nds = GRAPH.nodes.map(function(n){
    var st = n.t ? statusOf(n.t) : "todo";
    var cls = "nd";
    if(anc){ cls += (n.id===gSel) ? " cur" : (anc[n.id] ? " anc" : " dim"); }
    var bar = st==="mastered"?"var(--good)":st==="practice"?"var(--disc)":st==="learning"?"var(--warn)":"var(--line-2)";
    return '<g class="'+cls+'" data-nd="'+n.id+'">'+
      '<rect x="'+(n.x-W/2)+'" y="'+(n.y-H/2)+'" width="'+W+'" height="'+H+'" rx="7"/>'+
      '<rect x="'+(n.x-W/2)+'" y="'+(n.y-H/2)+'" width="4" height="'+H+'" rx="2" fill="'+bar+'" stroke="none"/>'+
      '<text x="'+n.x+'" y="'+(n.y+4)+'" text-anchor="middle">'+n.L+'</text></g>';
  }).join("");
  svg.innerHTML = eds + nds;
  svg.querySelectorAll("[data-nd]").forEach(function(g){
    g.addEventListener("click", function(){
      var id = g.getAttribute("data-nd");
      gSel = (gSel===id? null : id);
      renderGraph();
    });
  });
  var info = $("#nodeInfo");
  if(!gSel){
    info.innerHTML = '<div class="note">روی یک گره بزنید. نوار رنگی سمت راست هر گره وضعیت تسلط شما در آن مبحث است. '+
      'گره‌های بی‌نوار (امید ریاضی، فرآیند تصادفی) خارج از این دو هفته‌اند و فقط جای خود را در گراف نشان می‌دهند.</div>';
  } else {
    var n = pos[gSel], a = ancestorsOf(gSel);
    var names = Object.keys(a).map(function(k){ return pos[k]?pos[k].L:k; });
    var tp = n.t ? TOPICS.filter(function(t){return t.id===n.t;})[0] : null;
    var st = n.t ? statusOf(n.t) : null;
    info.innerHTML = '<div class="bench"><header><h4>'+n.L+'</h4>'+
      (st?'<span class="pill '+(st==="mastered"?"ok":st==="practice"?"d":st==="learning"?"mid":"")+'">'+STLAB[st]+'</span>':'<span class="tag">خارج از برنامهٔ دو هفته</span>')+
      '</header><div class="pad">'+
      (tp?'<p style="margin:0 0 9px;font-size:13.6px"><b>روز '+fa(tp.day)+'</b> · مرجع: <span class="en">'+esc(tp.ref)+'</span></p>':'')+
      '<p style="margin:0;font-size:13.6px"><b>زنجیرهٔ پیش‌نیاز ('+fa(names.length)+' گره):</b></p>'+
      '<div class="chips" style="margin-top:7px">'+(names.length?names.map(function(x){return '<button style="cursor:default">'+x+'</button>';}).join(""):'<span style="color:var(--muted);font-size:13px">این گره ریشه است و پیش‌نیازی ندارد.</span>')+'</div>'+
      '<p style="margin:11px 0 0;font-size:13px;color:var(--ink-2)">اگر در این مبحث گیر کرده‌اید، به ترتیب از بالای همین زنجیره بررسی کنید '+
      'کدام گره را واقعاً نمی‌توانید توضیح دهید. تقریباً همیشه مشکل آن‌جاست.</p>'+
      '</div></div>';
  }
}
