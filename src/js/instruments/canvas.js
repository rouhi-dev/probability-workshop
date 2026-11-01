"use strict";
/* اندازه‌گیری canvas با devicePixelRatio و خواندن توکن‌های رنگ تم */
function cv(id, h){
  var c = $("#"+id), wrap = c.parentNode;
  var w = Math.max(300, wrap.clientWidth||600);
  var dpr = window.devicePixelRatio||1;
  c.width = Math.round(w*dpr); c.height = Math.round(h*dpr);
  c.style.width = w+"px"; c.style.height = h+"px";
  var g = c.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,w,h);
  return {g:g, w:w, h:h};
}
function tok(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
