"use strict";
/* ---------- persistence ---------- */
function loadLocal(){
  try{ var r = localStorage.getItem(LSKEY); if(r) merge(JSON.parse(r)); }catch(e){}
}
function merge(o){
  if(!o || typeof o!=="object") return;
  ["topics","quiz","ex","pre","thm","read"].forEach(function(k){
    if(o[k] && typeof o[k]==="object") Object.assign(ST[k], o[k]);
  });
}
function save(){
  try{ localStorage.setItem(LSKEY, JSON.stringify(ST)); }catch(e){}
  if(!dbRef) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){
    dbRef.set({ state: ST, at: new Date().toISOString() })
      .then(function(){ badge("cloud"); })
      .catch(function(){ badge("local"); });
  }, 900);
}
function badge(mode){
  var el = $("#syncBadge"); if(!el) return;
  el.innerHTML = mode==="cloud"
    ? 'ذخیرهٔ پیشرفت: <b>ابری ✓</b>'
    : 'ذخیرهٔ پیشرفت: <b style="color:var(--warn)">فقط این مرورگر</b>';
}
function initPersistence(){
  badge("local");   /* loadLocal() already ran before the first render — see main.js */
  if(!(window.claude && typeof window.claude.use==="function")) return;
  Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function(r){
    var db=r[0], user=r[1];
    if(!db || !user) return;
    return user.id().then(function(uid){
      if(!uid) return;
      dbRef = db.doc("data/users/"+uid+"/progress");
      return dbRef.get().then(function(snap){
        if(snap && snap.exists){
          var d = snap.data();
          if(d && d.state){ merge(d.state); renderAll(); }
        }
        badge("cloud");
      });
    });
  }).catch(function(){});
}
