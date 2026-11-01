"use strict";
/* ---------- mastery model ---------- */
/* یک مبحث فقط با آزمون + تمرین به «تسلط» می‌رسد، نه با خواندن. */
function quizStatsFor(tid){
  var ans=0, right=0, need=0;
  Object.keys(QUIZZES).forEach(function(qid){
    var Q = QUIZZES[qid];
    if(Q.topics.indexOf(tid)<0) return;
    need += Q.need;
    var st = ST.quiz[qid] || {};
    Q.items.forEach(function(_,i){
      var a = st[i];
      if(a!==undefined && a!==null){ ans++; if(a===-1) right++; }
    });
  });
  return {answered:ans, right:right, need:need};
}
function exCountFor(tid){
  var n=0;
  Object.keys(EXERCISES).forEach(function(k){
    EXERCISES[k].forEach(function(e){
      if(e.topic===tid && ST.ex[e.id] && ST.ex[e.id].st==="done") n++;
    });
  });
  return n;
}
function statusOf(tid){
  var q = quizStatsFor(tid), ex = exCountFor(tid);
  var hasQuiz = q.need>0;
  if(hasQuiz && q.right>=q.need && ex>=2) return "mastered";
  if(hasQuiz && q.answered>0 && q.right<q.need) return "practice";
  if(ex>=2 && !hasQuiz) return "practice";
  if(ST.read[tid] || q.answered>0 || ex>0) return "learning";
  return "todo";
}
var STLAB = {todo:"شروع‌نشده", learning:"در حال یادگیری", practice:"نیازمند تمرین بیشتر", mastered:"تسلط"};
