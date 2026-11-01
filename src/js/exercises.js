"use strict";
/* ---------- exercises ---------- */
function renderEx(key){
  var L = EXERCISES[key], host = $("#"+key);
  if(!L||!host) return;
  host.innerHTML = L.map(function(e){
    var r = ST.ex[e.id]||{};
    return '<div class="ex"><div class="hd">'+
      '<span class="id">تمرین '+e.id+'</span><span class="lvl">'+e.lvl+'</span>'+
      '<span class="st">'+
        '<button class="btn" style="padding:2px 10px;font-size:12px'+(r.st==="done"?';background:var(--good);border-color:var(--good);color:#fff':'')+'" data-exs="'+e.id+'" data-v="done">حل کردم</button>'+
        '<button class="btn" style="padding:2px 10px;font-size:12px'+(r.st==="stuck"?';background:var(--warn);border-color:var(--warn);color:#fff':'')+'" data-exs="'+e.id+'" data-v="stuck">گیر کرده‌ام</button>'+
      '</span></div>'+
      '<p class="bd">'+e.q+'</p>'+
      e.hints.map(function(h,i){
        return '<details><summary>راهنمایی '+fa(i+1)+' از '+fa(e.hints.length)+'</summary><div class="h">'+h+'</div></details>';
      }).join("")+
      '<textarea id="ta-'+e.id+'" placeholder="پاسخ، طرح اثبات، یا جایی که گیر کرده‌اید را اینجا بنویسید — ذخیره می‌شود و بعد می‌توانید در گفت‌وگو برایم بفرستید." data-exa="'+e.id+'">'+esc(r.a||"")+'</textarea>'+
    '</div>';
  }).join("");
  host.querySelectorAll("[data-exs]").forEach(function(b){
    b.addEventListener("click", function(){
      var id=b.getAttribute("data-exs"), v=b.getAttribute("data-v");
      var r = ST.ex[id] || (ST.ex[id]={});
      r.st = (r.st===v? null : v);
      save(); renderEx(key); renderDash(); renderNav();
    });
  });
  host.querySelectorAll("[data-exa]").forEach(function(t){
    var tm=null;
    t.addEventListener("input", function(){
      var id=t.getAttribute("data-exa");
      var r = ST.ex[id] || (ST.ex[id]={});
      r.a = t.value;
      clearTimeout(tm); tm=setTimeout(function(){ save(); renderDash(); }, 700);
    });
  });
  typeset(host);
}
