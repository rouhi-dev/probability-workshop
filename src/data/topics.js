"use strict";
/* مباحث و وزن آمادگی برای فصل ۹ پاپولیس */
var TOPICS = [
  {id:"exp",   name:"آزمایش تصادفی و فضای نمونه", day:1, ref:"Ch.1; Ch.2 §2-1", w:2, view:"v-l1"},
  {id:"event", name:"پیشامد و جبر مجموعه‌ها",      day:1, ref:"Ch.2 §2-1 Set Theory", w:2, view:"v-l1"},
  {id:"sigma", name:"میدان σ و اندازه‌پذیری",       day:1, ref:"Ch.2 §2-2 Probability Space", w:2, view:"v-l1"},
  {id:"axiom", name:"اصول موضوعهٔ کلموگروف",        day:2, ref:"Ch.2 §2-2", w:3, view:null},
  {id:"thms",  name:"قضیه‌های مقدماتی احتمال",      day:2, ref:"Ch.2 §2-2", w:3, view:"v-thm"},
  {id:"cond",  name:"احتمال شرطی",                 day:3, ref:"Ch.2 §2-3 Conditional Probability", w:3, view:null},
  {id:"chain", name:"قاعدهٔ ضرب و زنجیره‌ای",       day:3, ref:"Ch.2 §2-3", w:2, view:null},
  {id:"indep", name:"استقلال در برابر ناسازگاری",   day:4, ref:"Ch.2 §2-3; Ch.3", w:3, view:null},
  {id:"total", name:"قانون احتمال کل",             day:5, ref:"Ch.2 §2-3", w:3, view:null},
  {id:"bayes", name:"قضیهٔ بیز",                   day:5, ref:"Ch.2 §2-3", w:2, view:null},
  {id:"rep",   name:"آزمایش‌های تکراری و برنولی",   day:6, ref:"Ch.3 Repeated Trials", w:2, view:null},
  {id:"rv",    name:"متغیر تصادفی به‌عنوان نگاشت",  day:8, ref:"Ch.4 §4-1 Introduction", w:3, view:null},
  {id:"cdf",   name:"CDF و خواص آن",               day:9, ref:"Ch.4 §4-2 Distribution Functions", w:3, view:"v-q"},
  {id:"pmf",   name:"PMF و متغیرهای گسسته",        day:10,ref:"Ch.4 §4-2, §4-3", w:2, view:null},
  {id:"pdf",   name:"PDF و متغیرهای پیوسته",       day:11,ref:"Ch.4 §4-2 Density Functions", w:3, view:null},
  {id:"mix",   name:"متغیرهای آمیخته و تجزیهٔ CDF", day:12,ref:"Ch.4 §4-2", w:2, view:"v-q"},
  {id:"calc",  name:"ابزار ریاضی (انتگرال، حد، سری)",day:13,ref:"—", w:2, view:"v-pre"}
];
