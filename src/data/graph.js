"use strict";
/* گراف جهت‌دار بی‌دور پیش‌نیازها */
var GRAPH = {
  nodes:[
    {id:"exp",   L:"آزمایش تصادفی",        x:380, y:34,  t:"exp"},
    {id:"S",     L:"فضای نمونه S",         x:240, y:106, t:"exp"},
    {id:"zeta",  L:"برون‌داد ζ",            x:520, y:106, t:"exp"},
    {id:"event", L:"پیشامد A ⊆ S",         x:380, y:178, t:"event"},
    {id:"setalg",L:"جبر مجموعه‌ها، دمورگان",x:140, y:178, t:"event"},
    {id:"sigma", L:"میدان σ",               x:570, y:250, t:"sigma"},
    {id:"part",  L:"افراز S",               x:140, y:250, t:"event"},
    {id:"axiom", L:"اصول کلموگروف",         x:380, y:322, t:"axiom"},
    {id:"thms",  L:"قضیه‌های مقدماتی",       x:570, y:394, t:"thms"},
    {id:"freq",  L:"فراوانی نسبی / کلاسیک", x:150, y:394, t:"axiom"},
    {id:"cond",  L:"احتمال شرطی",            x:380, y:394, t:"cond"},
    {id:"indep", L:"استقلال",                x:560, y:466, t:"indep"},
    {id:"chain", L:"قاعدهٔ زنجیره‌ای",        x:380, y:466, t:"chain"},
    {id:"total", L:"احتمال کل",              x:175, y:466, t:"total"},
    {id:"bayes", L:"قضیهٔ بیز",              x:175, y:538, t:"bayes"},
    {id:"rep",   L:"آزمایش تکراری، دوجمله‌ای",x:540, y:538, t:"rep"},
    {id:"rv",    L:"متغیر تصادفی X(ζ)",      x:360, y:618, t:"rv"},
    {id:"cdf",   L:"CDF  F_X(x)",            x:360, y:698, t:"cdf"},
    {id:"pmf",   L:"PMF  p_X(x)",            x:195, y:778, t:"pmf"},
    {id:"pdf",   L:"PDF  f_X(x)",            x:530, y:778, t:"pdf"},
    {id:"mix",   L:"متغیر آمیخته، δ و U",     x:360, y:850, t:"mix"},
    {id:"moment",L:"امید ریاضی و گشتاورها",   x:360, y:922, t:null},
    {id:"sp",    L:"فرآیند تصادفی X(t,ζ)",    x:360, y:986, t:null}
  ],
  edges:[
    ["exp","S"],["exp","zeta"],["S","event"],["zeta","event"],["setalg","event"],
    ["event","sigma"],["event","part"],["sigma","axiom"],["event","axiom"],
    ["axiom","thms"],["axiom","freq"],["axiom","cond"],["thms","cond"],
    ["cond","indep"],["cond","chain"],["cond","total"],["part","total"],
    ["total","bayes"],["cond","bayes"],["indep","rep"],["chain","rep"],
    ["sigma","rv"],["axiom","rv"],["rv","cdf"],["cdf","pmf"],["cdf","pdf"],
    ["pmf","mix"],["pdf","mix"],["mix","moment"],["pmf","moment"],["pdf","moment"],
    ["moment","sp"],["rv","sp"],["rep","pmf"]
  ]
};
