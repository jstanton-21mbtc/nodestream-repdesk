(function(){
  "use strict";
  var $  = function(s,el){ return (el||document).querySelector(s); };
  var $$ = function(s,el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };
  var DATA = {};
  try{ DATA = JSON.parse($("#portal-data").textContent); }catch(e){ DATA = {}; }

  var VIEW_LABEL = {
    dash:"Dashboard", pipeline:"Pipeline",
    discovery:"Discovery & Scoring", configurator:"Deal Configurator",
    quote:"Quote Builder", playbook:"Playbook & Docs"
  };
  var mounted = {};

  // ---- View routing ----
  function show(view){
    $$(".view").forEach(function(v){ v.classList.add("hidden"); });
    var el = $("#view-"+view); if(el) el.classList.remove("hidden");
    $$("#nav button").forEach(function(b){ b.classList.toggle("active", b.dataset.view===view); });
    $("#crumb").textContent = VIEW_LABEL[view] || view;
    if(view==="discovery")    loadFrame("discovery");
    if(view==="configurator") loadFrame("configurator");
    if(view==="quote"    && !mounted.quote)    { mountQuote();    mounted.quote=true; }
    if(view==="playbook" && !mounted.playbook) { mountPlaybook(); mounted.playbook=true; }
    if(view==="pipeline") renderPipeline();
    window.scrollTo(0,0);
  }

  function loadFrame(name){
    var f = $("#frame-"+name);
    if(f && !f.src && f.dataset.src){ f.src = f.dataset.src; }
  }

  // Nav click delegation
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-view]"); if(!b) return;
    // ignore clicks inside modal bodies (handled by pipeline delegation below)
    if(b.closest('#detailBody')) return;
    e.preventDefault(); show(b.dataset.view);
  });

  // ---- Clock ----
  function tick(){
    var d = new Date();
    $("#clock").textContent = d.toLocaleTimeString("en-US",{weekday:"short",hour:"2-digit",minute:"2-digit"}).replace(",","");
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

  // ---- Dashboard pipeline preview ----
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

  // ============================================================
  // PIPELINE
  // ============================================================
  var PIPELINE_KEY = 'ns_pipeline_v1';
  var STAGES = {
    disc:"Discovery", qual:"Qualifying", quote:"Quote Out",
    nego:"Negotiation", won:"Closed Won", lost:"Closed Lost"
  };
  var _pipeFilter    = 'all';
  var _viewingDealId = null;

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function loadDeals(){
    try{ return JSON.parse(localStorage.getItem(PIPELINE_KEY)||'null')||[]; }catch(e){ return []; }
  }
  function saveDeals(d){ localStorage.setItem(PIPELINE_KEY, JSON.stringify(d)); }

  function ensureDeals(){
    var deals=loadDeals();
    if(!deals.length && DATA.pipeline && DATA.pipeline.length){
      var today=new Date().toISOString().slice(0,10);
      deals=DATA.pipeline.map(function(p,i){
        return {id:'deal_seed_'+i, co:p.co, persona:p.persona, stage:p.stage,
          amt:p.amt, notes:'', scorecardNotes:'', quoteNotes:'', dateAdded:today};
      });
      saveDeals(deals);
    }
    return deals;
  }

  function renderPipeline(){
    var deals=ensureDeals();
    var filtered=_pipeFilter==='all'?deals:deals.filter(function(d){ return d.stage===_pipeFilter; });

    // Stage tabs
    var tabs=$("#stageTabs");
    if(tabs){
      var counts={all:deals.length};
      Object.keys(STAGES).forEach(function(k){ counts[k]=deals.filter(function(d){ return d.stage===k; }).length; });
      tabs.innerHTML='';
      [['all','All']].concat(Object.keys(STAGES).map(function(k){ return [k,STAGES[k]]; })).forEach(function(entry){
        var k=entry[0], label=entry[1];
        var btn=document.createElement('button');
        btn.className='stage-tab'+(_pipeFilter===k?' active':'');
        btn.dataset.stageFilter=k;
        btn.textContent=label+' ('+(counts[k]||0)+')';
        tabs.appendChild(btn);
      });
    }

    // Table body
    var tb=$("#fullPipeBody"); if(!tb) return;
    if(!filtered.length){
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--muted-2);font-family:var(--mono);font-size:12px">No deals in this stage</td></tr>';
      return;
    }
    tb.innerHTML='';
    filtered.forEach(function(d){
      var tr=document.createElement('tr');
      tr.className='clickable';
      tr.dataset.dealId=d.id;
      tr.innerHTML=
        '<td class="co">'+esc(d.co)+'</td>'+
        '<td class="persona-tag">'+esc(d.persona)+'</td>'+
        '<td><span class="stage '+d.stage+'">'+esc(STAGES[d.stage]||d.stage)+'</span></td>'+
        '<td style="font-family:var(--mono);font-size:11px;color:var(--muted-2)">'+esc(d.dateAdded||'—')+'</td>'+
        '<td class="amt">'+esc(d.amt||'—')+'</td>';
      tb.appendChild(tr);
    });
  }

  // ---- Deal detail modal ----
  function openDealDetail(id){
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===id; }); if(!deal) return;
    _viewingDealId=id;
    $("#detailTitle").textContent=deal.co;
    var body=$("#detailBody");
    body.innerHTML=
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'+
        '<span class="stage '+deal.stage+'">'+esc(STAGES[deal.stage]||deal.stage)+'</span>'+
        '<span class="persona-tag">'+esc(deal.persona)+'</span>'+
        (deal.amt?'<span style="font-family:var(--mono);font-size:13px;color:var(--green-bright)">'+esc(deal.amt)+'</span>':'')+
        '<span style="font-family:var(--mono);font-size:10px;color:var(--muted-2);margin-left:auto">Added '+esc(deal.dateAdded||'—')+'</span>'+
      '</div>'+

      '<div class="detail-section">'+
        '<div class="ds-label">Deal Notes</div>'+
        '<textarea id="detail-notes" style="width:100%;background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:70px;outline:none" placeholder="Key contacts, context, next steps...">'+esc(deal.notes||'')+'</textarea>'+
      '</div>'+

      '<div class="detail-section">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
          '<div class="ds-label" style="margin:0">Scorecard Notes</div>'+
          '<button class="detail-link" data-view="discovery">Open Scorecard \u2192</button>'+
        '</div>'+
        '<textarea id="detail-scorecard" style="width:100%;background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:90px;outline:none" placeholder="Paste qualification scorecard results here \u2014 score per dimension, total, recommendation...">'+esc(deal.scorecardNotes||'')+'</textarea>'+
      '</div>'+

      '<div class="detail-section">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
          '<div class="ds-label" style="margin:0">Quote &amp; Config Notes</div>'+
          '<div style="display:flex;gap:8px">'+
            '<button class="detail-link" data-view="configurator">Configurator \u2192</button>'+
            '<button class="detail-link" data-view="quote">Quote \u2192</button>'+
          '</div>'+
        '</div>'+
        '<textarea id="detail-quote" style="width:100%;background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:90px;outline:none" placeholder="GPU tier, cluster size, pricing, term, downpayment, key quote details...">'+esc(deal.quoteNotes||'')+'</textarea>'+
      '</div>';

    // wire tool buttons inside detail body
    body.querySelectorAll('[data-view]').forEach(function(btn){
      btn.addEventListener('click', function(){
        closeDetail();
        show(btn.dataset.view);
      });
    });

    $("#dealDetail").classList.remove('hidden');
  }

  function saveDetailNotes(){
    if(!_viewingDealId) return;
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===_viewingDealId; }); if(!deal) return;
    deal.notes          =($("#detail-notes").value||'').trim();
    deal.scorecardNotes =($("#detail-scorecard").value||'').trim();
    deal.quoteNotes     =($("#detail-quote").value||'').trim();
    saveDeals(deals);
    var btn=$("#detailSaveBtn");
    btn.textContent='Saved \u2713';
    setTimeout(function(){ btn.textContent='Save Notes'; },1600);
  }

  function closeDetail(){ $("#dealDetail").classList.add('hidden'); _viewingDealId=null; }

  // ---- Add / Edit deal modal ----
  function openAddDeal(){
    $("#dealModalTitle").textContent='Add Deal';
    $("#dealId").value=''; $("#deal-co").value='';
    $("#deal-persona").value='Neocloud'; $("#deal-stage").value='disc';
    $("#deal-amt").value=''; $("#deal-notes").value='';
    $("#dealModal").classList.remove('hidden');
    setTimeout(function(){ $("#deal-co").focus(); },50);
  }

  function openEditDeal(){
    if(!_viewingDealId) return;
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===_viewingDealId; }); if(!deal) return;
    closeDetail();
    $("#dealModalTitle").textContent='Edit Deal';
    $("#dealId").value=deal.id;
    $("#deal-co").value=deal.co||'';
    $("#deal-persona").value=deal.persona||'Neocloud';
    $("#deal-stage").value=deal.stage||'disc';
    $("#deal-amt").value=deal.amt||'';
    $("#deal-notes").value=deal.notes||'';
    $("#dealModal").classList.remove('hidden');
    setTimeout(function(){ $("#deal-co").focus(); },50);
  }

  function saveDealForm(){
    var co=($("#deal-co").value||'').trim();
    if(!co){ $("#deal-co").focus(); return; }
    var deals=loadDeals();
    var id=$("#dealId").value;
    if(id){
      var idx=deals.findIndex(function(d){ return d.id===id; });
      if(idx>-1){
        deals[idx].co=co; deals[idx].persona=$("#deal-persona").value;
        deals[idx].stage=$("#deal-stage").value;
        deals[idx].amt=($("#deal-amt").value||'').trim();
        deals[idx].notes=($("#deal-notes").value||'').trim();
      }
    } else {
      deals.unshift({
        id:'deal_'+Date.now(), co:co, persona:$("#deal-persona").value,
        stage:$("#deal-stage").value, amt:($("#deal-amt").value||'').trim(),
        notes:($("#deal-notes").value||'').trim(),
        scorecardNotes:'', quoteNotes:'',
        dateAdded:new Date().toISOString().slice(0,10)
      });
    }
    saveDeals(deals);
    $("#dealModal").classList.add('hidden');
    renderPipeline();
  }

  function deleteDeal(){
    if(!_viewingDealId) return;
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===_viewingDealId; }); if(!deal) return;
    if(!confirm('Delete "'+deal.co+'"? This cannot be undone.')) return;
    saveDeals(deals.filter(function(d){ return d.id!==_viewingDealId; }));
    closeDetail(); renderPipeline();
  }

  // Global pipeline event delegation
  document.addEventListener('click', function(e){
    if(e.target.closest('#addDealBtn'))                                  { openAddDeal();   return; }
    if(e.target.closest('#dealModalClose')||e.target.closest('#dealModalCancel')) { $("#dealModal").classList.add('hidden'); return; }
    if(e.target.closest('#dealModalSave'))                               { saveDealForm();  return; }
    if(e.target.closest('#dealDetailClose')||e.target.closest('#detailCloseBtn')) { closeDetail();   return; }
    if(e.target.closest('#detailSaveBtn'))                               { saveDetailNotes(); return; }
    if(e.target.closest('#detailEditBtn'))                               { openEditDeal(); return; }
    if(e.target.closest('#detailDeleteBtn'))                             { deleteDeal();   return; }

    var tab=e.target.closest('[data-stage-filter]');
    if(tab){ _pipeFilter=tab.dataset.stageFilter; renderPipeline(); return; }

    var tr=e.target.closest('tr[data-deal-id]');
    if(tr){ openDealDetail(tr.dataset.dealId); return; }
  });

  // Close modals on overlay click
  ['dealModal','dealDetail'].forEach(function(id){
    var el=$("#"+id);
    if(el) el.addEventListener('click',function(e){ if(e.target===el) el.classList.add('hidden'); });
  });

  // ============================================================
  // QUOTE VIEW
  // ============================================================
  function mountQuote(){
    var el=$("#quoteMount"); if(!el) return;
    el.innerHTML=
      '<div class="banner"><span>\u25b2</span><div>The quote is a fillable PDF. Auto-calculating fields run in <b>Adobe Acrobat/Reader or Chrome/Edge</b>. Values recalc live where JavaScript is supported.</div></div>'+
      '<div class="cards" style="margin-bottom:22px">'+
        card("Open the quote template","Fillable GPUaaS quote \u2014 36/48/60-mo tiers, editable spec dropdowns, auto pricing, downpayment + amortization.","tools/quote.pdf","Open PDF")+
        card("Configure pricing first","Build the deal economics in the Configurator, then transfer the numbers into the quote.","#configurator","Deal Configurator \u2192")+
      '</div>'+
      '<div class="toolframe" style="min-height:70vh"><iframe src="tools/quote.pdf" style="height:70vh" title="Quote PDF preview"></iframe></div>';
  }

  function card(title,desc,href,cta){
    var isView=href.charAt(0)==="#";
    var attr=isView?'data-view="'+href.slice(1)+'"':'href="'+href+'" target="_blank" rel="noopener"';
    return '<a class="card toolcard" '+attr+'><h3>'+title+'</h3><p>'+desc+'</p><div class="go">'+cta+' <span>\u2192</span></div></a>';
  }

  // ============================================================
  // PLAYBOOK / DOCS
  // ============================================================
  function mountPlaybook(){
    var el=$("#refMount"); if(!el) return;
    var refs=[
      {t:"Go-to-Market Plan",       d:"Market, ICP, business lines, pricing philosophy",         x:"Doc",  href:"#"},
      {t:"Battlecards",             d:"30-sec pitch, objection handling, discovery Qs per line",  x:"PDF",  href:"tools/battlecards.pdf"},
      {t:"Persona Decks",           d:"Frontier Lab \u00b7 Neocloud \u00b7 Enterprise/Sovereign", x:"Deck", href:"#"},
      {t:"Fillable Quote (current)",d:"36/48/60-mo \u00b7 256-GPU default \u00b7 downpayment",   x:"PDF",  href:"tools/quote.pdf"}
    ];
    var icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    var html='<div class="panel"><div class="ref-list">';
    refs.forEach(function(r){
      var isPlaceholder=r.href==="#";
      var isView=!isPlaceholder && r.href.charAt(0)==="#";
      var tag, attr;
      if(isPlaceholder){ tag='div'; attr='style="opacity:.55;cursor:default"'; }
      else if(isView)  { tag='a';   attr='data-view="'+r.href.slice(1)+'"'; }
      else             { tag='a';   attr='href="'+r.href+'" target="_blank" rel="noopener"'; }
      var right=isPlaceholder
        ? '<span style="font-family:var(--mono);font-size:9px;color:var(--amber);background:rgba(224,167,60,.1);border:1px solid rgba(224,167,60,.3);border-radius:5px;padding:2px 8px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap">Add URL</span>'
        : '<span class="ri-x">'+r.x+'</span>';
      html+='<'+tag+' class="ref-item" '+attr+'>'+
        '<span class="ri-ic">'+icon+'</span>'+
        '<span><span class="ri-t">'+r.t+'</span><br><span class="ri-d">'+r.d+'</span></span>'+
        right+
        '</'+tag+'>';
    });
    html+='</div></div>'+
      '<p style="font-size:11px;color:var(--muted-2);margin-top:14px;font-family:var(--mono)">Items marked \u201cAdd URL\u201d are placeholders \u2014 replace the <code>#</code> hrefs in portal.js with your live Google Drive links.</p>';
    el.innerHTML=html;
  }

  window.NS_show=show;
})();
