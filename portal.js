(function(){
  "use strict";
  var $=function(s,el){return (el||document).querySelector(s);};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s));};
  var DATA={};
  try{ DATA=JSON.parse($("#portal-data").textContent); }catch(e){ DATA={}; }

  var VIEW_LABEL={dash:"Dashboard",discovery:"Discovery & Scoring",configurator:"Deal Configurator",quote:"Quote Builder",playbook:"Playbook & Docs"};
  var mounted={};

  function show(view){
    $$(".view").forEach(function(v){v.classList.add("hidden");});
    var el=$("#view-"+view); if(el) el.classList.remove("hidden");
    $$("#nav button").forEach(function(b){b.classList.toggle("active",b.dataset.view===view);});
    $("#crumb").textContent=VIEW_LABEL[view]||view;
    if(view==="discovery") loadFrame("discovery");
    if(view==="configurator") loadFrame("configurator");
    if(view==="quote" && !mounted.quote){ mountQuote(); mounted.quote=true; }
    if(view==="playbook" && !mounted.playbook){ mountPlaybook(); mounted.playbook=true; }
    window.scrollTo(0,0);
  }

  function loadFrame(name){
    var f=$("#frame-"+name);
    if(f && !f.src && f.dataset.src){ f.src=f.dataset.src; }
  }

  // delegate nav + any [data-view]
  document.addEventListener("click",function(e){
    var b=e.target.closest("[data-view]"); if(!b) return;
    e.preventDefault(); show(b.dataset.view);
  });

  // ---- Clock ----
  function tick(){
    var d=new Date();
    var opts={weekday:"short",hour:"2-digit",minute:"2-digit"};
    $("#clock").textContent=d.toLocaleTimeString("en-US",opts).replace(",","");
  }
  tick(); setInterval(tick,30000);

  // ---- Rep ----
  if(DATA.rep){ $("#repName").textContent=DATA.rep.name; $("#repInit").textContent=DATA.rep.initials; }

  // ---- KPIs ----
  (function(){
    var wrap=$("#kpis"); if(!wrap||!DATA.kpis) return;
    DATA.kpis.forEach(function(k){
      var d=document.createElement("div"); d.className="kpi";
      d.innerHTML='<div class="k">'+k.k+'</div><div class="v'+(k.green?' green':'')+'">'+k.v+'</div><div class="d">'+(k.d||"")+'</div>';
      wrap.appendChild(d);
    });
  })();

  // ---- Pipeline ----
  (function(){
    var tb=$("#pipeBody"); if(!tb||!DATA.pipeline) return;
    DATA.pipeline.forEach(function(p){
      var tr=document.createElement("tr");
      tr.innerHTML='<td class="co">'+p.co+'</td>'+
        '<td class="persona-tag">'+p.persona+'</td>'+
        '<td><span class="stage '+p.stage+'">'+p.stageLabel+'</span></td>'+
        '<td class="amt">'+p.amt+'</td>';
      tb.appendChild(tr);
    });
  })();

  // ---- Tasks ----
  (function(){
    var list=$("#taskList"); if(!list||!DATA.tasks) return;
    function render(){
      list.innerHTML="";
      var open=0;
      DATA.tasks.forEach(function(t,i){
        if(!t.done) open++;
        var row=document.createElement("label");
        row.className="task"+(t.done?" done":"");
        row.innerHTML='<input type="checkbox" '+(t.done?"checked":"")+' data-i="'+i+'">'+
          '<span><span class="tt">'+t.t+'</span><span class="tm">'+t.m+'</span></span>';
        list.appendChild(row);
      });
      $("#taskCount").textContent=open+" open";
    }
    render();
    list.addEventListener("change",function(e){
      var cb=e.target.closest("input[type=checkbox]"); if(!cb) return;
      DATA.tasks[+cb.dataset.i].done=cb.checked; render();
    });
  })();

  // ---- Quote view: link to the fillable PDF + embed preview ----
  function mountQuote(){
    var el=$("#quoteMount"); if(!el) return;
    el.innerHTML=
      '<div class="banner"><span>▲</span><div>The quote is a fillable PDF. Auto-calculating fields (pricing, downpayment, totals) run in <b>Adobe Acrobat/Reader or Chrome/Edge</b>. Values are pre-filled so they show in any viewer, and recalc live where JavaScript is supported.</div></div>'+
      '<div class="cards" style="margin-bottom:22px">'+
        card("Open the quote template","Fillable GPUaaS quote — 36/48/60-mo tiers, editable spec dropdowns, auto pricing, downpayment + amortization.","tools/quote.pdf","Open PDF")+
        card("Configure pricing first","Build the deal economics in the Configurator, then transfer the numbers into the quote.","#configurator","Deal Configurator →")+
      '</div>'+
      '<div class="toolframe" style="min-height:70vh"><iframe src="tools/quote.pdf" style="height:70vh" title="Quote PDF preview"></iframe></div>';
  }

  function card(title,desc,href,cta){
    var isView=href.charAt(0)==="#";
    var attr=isView?'data-view="'+href.slice(1)+'"':'href="'+href+'" target="_blank" rel="noopener"';
    return '<a class="card toolcard" '+attr+'><h3>'+title+'</h3><p>'+desc+'</p><div class="go">'+cta+' <span>→</span></div></a>';
  }

  // ---- Playbook / reference ----
  function mountPlaybook(){
    var el=$("#refMount"); if(!el) return;
    var refs=[
      {t:"Go-to-Market Plan",d:"Market, ICP, business lines, pricing philosophy",x:"Doc",href:"#"},
      {t:"Battlecards",d:"30-sec pitch, objection handling, discovery Qs per line",x:"Doc",href:"#"},
      {t:"Persona Decks",d:"Frontier Lab · Neocloud · Enterprise/Sovereign",x:"Deck",href:"#"},
      {t:"Discovery & Scorecard",d:"Interactive router + 10-dimension qualification",x:"Tool",href:"#discovery"},
      {t:"ROI Configurator",d:"Deal economics, margin, cost stack",x:"Tool",href:"#configurator"},
      {t:"Fillable Quote (current)",d:"36/48/60-mo · 256-GPU default · downpayment",x:"PDF",href:"tools/quote.pdf"}
    ];
    var html='<div class="banner"><span>▲</span><div>Replace the placeholder links below with your live Drive URLs when you deploy. Internal economics stay behind the host\'s access control — see the deploy note in the README.</div></div><div class="panel"><div class="ref-list">';
    refs.forEach(function(r){
      var isView=r.href.charAt(0)==="#";
      var attr=isView?'data-view="'+r.href.slice(1)+'"':(r.href==="#"?'style="cursor:default;opacity:.75"':'href="'+r.href+'" target="_blank" rel="noopener"');
      html+='<a class="ref-item" '+attr+'><span class="ri-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span><span class="ri-t">'+r.t+'</span><br><span class="ri-d">'+r.d+'</span></span><span class="ri-x">'+r.x+'</span></a>';
    });
    html+='</div></div>';
    el.innerHTML=html;
  }

  // expose
  window.NS_show=show;
})();
