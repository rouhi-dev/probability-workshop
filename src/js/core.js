"use strict";
/* کمک‌تابع‌ها و وضعیت مشترک */
/* ============================================================
   وضعیت، ذخیره‌سازی، ناوبری، رندر
   ============================================================ */
var LSKEY = "prob-workshop-v1";
var ST = { topics:{}, quiz:{}, ex:{}, pre:{}, thm:{}, read:{} };
var dbRef = null, saveTimer = null;

function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function fa(n){ return String(n).replace(/[0-9]/g, function(d){ return "۰۱۲۳۴۵۶۷۸۹"[+d]; }); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function typeset(el){
  if(window.MathJax && MathJax.typesetPromise){
    MathJax.typesetPromise(el?[el]:undefined).catch(function(){});
  }
}
