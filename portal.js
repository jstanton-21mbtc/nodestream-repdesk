(function(){
  "use strict";
  var $  = function(s,el){ return (el||document).querySelector(s); };
  var $$ = function(s,el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };
  var DATA = {};
  try{ DATA = JSON.parse($("#portal-data").textContent); }catch(e){ DATA = {}; }

  var VIEW_LABEL = {
    dash:"Dashboard", pipeline:"Pipeline",
    discovery:"Discovery & Scoring", configurator:"Deal Configurator",
    quote:"Quote Builder", ornn:"Compute Index", playbook:"Docs"
  };
  var mounted = {};

  // ---- View routing ----
  function show(view){
    $$(".view").forEach(function(v){ v.classList.add("hidden"); });
    var el = $("#view-"+view); if(el) el.classList.remove("hidden");
    $$("#nav button").forEach(function(b){ b.classList.toggle("active", b.dataset.view===view); });
    $("#crumb").textContent = VIEW_LABEL[view] || view;
    // Tools: always fresh on every navigation
    if(view==="discovery")    loadFrame("discovery");
    if(view==="configurator") loadFrame("configurator");
    if(view==="ornn")         loadFrame("ornn");
    if(view==="quote"    && !mounted.quote)    { mountQuote();    mounted.quote=true; }
    if(view==="playbook" && !mounted.playbook) { mountPlaybook(); mounted.playbook=true; }
    if(view==="pipeline") renderPipeline();
    window.scrollTo(0,0);
  }

  // Always reload — fresh every time
  function loadFrame(name){
    var f = $("#frame-"+name);
    if(f && f.dataset.src) f.src = f.dataset.src;
  }

  // Nav click delegation (skip detail-body tool buttons — handled separately)
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-view]"); if(!b) return;
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
      list.innerHTML=""; var open=0;
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
  function fmtDate(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }catch(e){ return iso.slice(0,10); } }

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
          amt:p.amt, notes:'', scorecardNotes:'', scorecardSavedAt:null,
          quoteNotes:'', configSavedAt:null, dateAdded:today};
      });
      saveDeals(deals);
    }
    return deals;
  }

  function renderPipeline(){
    var deals=ensureDeals();
    var filtered=_pipeFilter==='all'?deals:deals.filter(function(d){ return d.stage===_pipeFilter; });

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

    var tb=$("#fullPipeBody"); if(!tb) return;
    if(!filtered.length){
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--muted-2);font-family:var(--mono);font-size:12px">No deals in this stage</td></tr>';
      return;
    }
    tb.innerHTML='';
    filtered.forEach(function(d){
      var hasSave = d.scorecardSavedAt || d.configSavedAt;
      var tr=document.createElement('tr');
      tr.className='clickable';
      tr.dataset.dealId=d.id;
      tr.innerHTML=
        '<td class="co">'+esc(d.co)+(hasSave?'<span style="margin-left:7px;font-family:var(--mono);font-size:9px;color:var(--green);background:rgba(60,160,40,.1);border:1px solid rgba(60,160,40,.25);border-radius:4px;padding:1px 5px">docs</span>':'')+'</td>'+
        '<td class="persona-tag">'+esc(d.persona)+'</td>'+
        '<td><span class="stage '+d.stage+'">'+esc(STAGES[d.stage]||d.stage)+'</span></td>'+
        '<td style="font-family:var(--mono);font-size:11px;color:var(--muted-2)">'+esc(d.dateAdded||'—')+'</td>'+
        '<td class="amt">'+esc(d.amt||'—')+'</td>';
      tb.appendChild(tr);
    });
  }

  // ---- Deal detail ----
  function openDealDetail(id){
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===id; }); if(!deal) return;
    _viewingDealId=id;
    $("#detailTitle").textContent=deal.co;

    // Scorecard block
    var scorecardInner='';
    if(deal.scorecardNotes && deal.scorecardSavedAt){
      scorecardInner=
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
          '<div class="ds-label" style="margin:0">Scorecard</div>'+
          '<span class="saved-badge">Saved from Discovery \u00b7 '+fmtDate(deal.scorecardSavedAt)+'</span>'+
        '</div>'+
        '<pre class="saved-pre">'+esc(deal.scorecardNotes)+'</pre>'+
        '<div class="ds-label" style="margin-bottom:6px">Additional notes</div>'+
        '<textarea id="detail-scorecard" style="width:100%;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:60px;padding:10px;outline:none" placeholder="Annotations, follow-ups, open items...">'+esc(deal.scorecardExtra||'')+'</textarea>';
    } else {
      scorecardInner=
        '<div class="ds-label" style="margin-bottom:10px">Scorecard Notes</div>'+
        '<textarea id="detail-scorecard" style="width:100%;background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:90px;outline:none" placeholder="Paste qualification scorecard results here \u2014 score per dimension, total, recommendation...">'+esc(deal.scorecardNotes||'')+'</textarea>';
    }

    // Config block
    var configInner='';
    if(deal.quoteNotes && deal.configSavedAt){
      configInner=
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
          '<div class="ds-label" style="margin:0">Config &amp; Quote</div>'+
          '<span class="saved-badge">Saved from Configurator \u00b7 '+fmtDate(deal.configSavedAt)+'</span>'+
        '</div>'+
        '<pre class="saved-pre">'+esc(deal.quoteNotes)+'</pre>'+
        '<div class="ds-label" style="margin-bottom:6px">Additional notes</div>'+
        '<textarea id="detail-quote" style="width:100%;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:60px;padding:10px;outline:none" placeholder="Pricing adjustments, custom terms, downpayment notes...">'+esc(deal.quoteExtra||'')+'</textarea>';
    } else {
      configInner=
        '<div class="ds-label" style="margin-bottom:10px">Quote &amp; Config Notes</div>'+
        '<textarea id="detail-quote" style="width:100%;background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;resize:vertical;min-height:90px;outline:none" placeholder="GPU tier, cluster size, pricing, term, downpayment, key quote details...">'+esc(deal.quoteNotes||'')+'</textarea>';
    }

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
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:0">'+
          '<div style="flex:1">'+scorecardInner+'</div>'+
        '</div>'+
        '<div style="margin-top:10px"><button class="detail-link" data-view="discovery">Open Scorecard \u2192</button></div>'+
      '</div>'+

      '<div class="detail-section">'+
        '<div>'+configInner+'</div>'+
        '<div style="margin-top:10px;display:flex;gap:8px">'+
          '<button class="detail-link" data-view="configurator">Configurator \u2192</button>'+
          '<button class="detail-link" data-view="quote">Quote \u2192</button>'+
        '</div>'+
      '</div>';

    // Wire tool buttons inside detail body
    body.querySelectorAll('[data-view]').forEach(function(btn){
      btn.addEventListener('click', function(){
        closeDetail(); show(btn.dataset.view);
      });
    });

    $("#dealDetail").classList.remove('hidden');
  }

  function saveDetailNotes(){
    if(!_viewingDealId) return;
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===_viewingDealId; }); if(!deal) return;

    deal.notes = ($("#detail-notes").value||'').trim();

    // Scorecard: if tool-saved, detail-scorecard is the "extra" textarea
    if(deal.scorecardSavedAt){
      deal.scorecardExtra = ($("#detail-scorecard").value||'').trim();
    } else {
      deal.scorecardNotes = ($("#detail-scorecard").value||'').trim();
    }

    // Config: same pattern
    if(deal.configSavedAt){
      deal.quoteExtra = ($("#detail-quote").value||'').trim();
    } else {
      deal.quoteNotes = ($("#detail-quote").value||'').trim();
    }

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
        scorecardNotes:'', scorecardSavedAt:null, scorecardExtra:'',
        quoteNotes:'', configSavedAt:null, quoteExtra:'',
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

  // ============================================================
  // SAVE TO DEAL (from tool toolbar)
  // ============================================================
  var _savingTool    = null;
  var _pendingSummary = '';

  function openSaveToDeal(toolName){
    var frameId = toolName==='discovery' ? 'frame-discovery' : 'frame-configurator';
    var f = $("#"+frameId);
    var summary = '';
    try{ summary = (f && f.contentWindow && f.contentWindow.__summary) || ''; }catch(e){}
    if(!summary){
      alert('Nothing to save yet \u2014 use the tool first to generate a scorecard or configure a deal.');
      return;
    }
    _savingTool     = toolName;
    _pendingSummary = summary;

    $("#saveDealTitle").textContent = toolName==='discovery' ? 'Save Scorecard to Deal' : 'Save Config to Deal';
    $("#saveSummaryPreview").textContent = summary.length>350 ? summary.slice(0,350)+'\u2026' : summary;

    var sel=$("#saveDealSelect");
    var deals=loadDeals();
    sel.innerHTML='<option value="">— pick an existing deal —</option>';
    deals.forEach(function(d){
      var opt=document.createElement('option');
      opt.value=d.id;
      opt.textContent=d.co+' \u00b7 '+esc(STAGES[d.stage]||d.stage);
      sel.appendChild(opt);
    });

    $("#saveNewDealName").value='';
    $("#saveDealModal").classList.remove('hidden');
    setTimeout(function(){ $("#saveDealSelect").focus(); },50);
  }

  function executeSaveToDeal(){
    var dealId  = ($("#saveDealSelect").value||'').trim();
    var newName = ($("#saveNewDealName").value||'').trim();
    var now     = new Date().toISOString();

    if(!dealId && !newName){
      alert('Select an existing deal or enter an account name to create a new one.');
      return;
    }

    var deals=loadDeals();

    if(newName){
      var newDeal={
        id:'deal_'+Date.now(), co:newName, persona:'Neocloud', stage:'disc',
        amt:'', notes:'',
        scorecardNotes:  _savingTool==='discovery'   ? _pendingSummary : '',
        scorecardSavedAt:_savingTool==='discovery'   ? now : null,
        scorecardExtra:  '',
        quoteNotes:      _savingTool==='configurator' ? _pendingSummary : '',
        configSavedAt:   _savingTool==='configurator' ? now : null,
        quoteExtra:      '',
        dateAdded:       now.slice(0,10)
      };
      deals.unshift(newDeal);
    } else {
      var deal=deals.find(function(d){ return d.id===dealId; });
      if(deal){
        if(_savingTool==='discovery'){
          if(deal.scorecardSavedAt && !confirm('This deal already has a saved scorecard. Replace it?')) return;
          deal.scorecardNotes  = _pendingSummary;
          deal.scorecardSavedAt= now;
          deal.scorecardExtra  = '';
        } else {
          if(deal.configSavedAt && !confirm('This deal already has a saved config. Replace it?')) return;
          deal.quoteNotes   = _pendingSummary;
          deal.configSavedAt= now;
          deal.quoteExtra   = '';
        }
      }
    }

    saveDeals(deals);
    $("#saveDealModal").classList.add('hidden');

    // Flash the save button
    var btnId=_savingTool==='discovery'?'saveDiscovery':'saveConfigurator';
    var btn=$("#"+btnId);
    if(btn){ btn.textContent='Saved \u2713'; setTimeout(function(){ btn.textContent='Save to Deal'; },2000); }
  }

  // ============================================================
  // GLOBAL EVENT DELEGATION
  // ============================================================
  document.addEventListener('click',function(e){
    // Toolbar: Save to Deal
    if(e.target.closest('#saveDiscovery'))   { openSaveToDeal('discovery');   return; }
    if(e.target.closest('#saveConfigurator')){ openSaveToDeal('configurator'); return; }
    // Toolbar: Refresh
    if(e.target.closest('#refreshDiscovery'))   { loadFrame('discovery');   return; }
    if(e.target.closest('#refreshConfigurator')){ loadFrame('configurator'); return; }

    // Save-to-deal modal
    if(e.target.closest('#saveDealClose')||e.target.closest('#saveDealCancel')){ $("#saveDealModal").classList.add('hidden'); return; }
    if(e.target.closest('#saveDealConfirm')){ executeSaveToDeal(); return; }

    // Add deal
    if(e.target.closest('#addDealBtn')){ openAddDeal(); return; }
    // Deal form modal
    if(e.target.closest('#dealModalClose')||e.target.closest('#dealModalCancel')){ $("#dealModal").classList.add('hidden'); return; }
    if(e.target.closest('#dealModalSave')){ saveDealForm(); return; }
    // Deal detail
    if(e.target.closest('#dealDetailClose')||e.target.closest('#detailCloseBtn')){ closeDetail(); return; }
    if(e.target.closest('#detailSaveBtn')) { saveDetailNotes(); return; }
    if(e.target.closest('#detailEditBtn')) { openEditDeal();    return; }
    if(e.target.closest('#detailDeleteBtn')){ deleteDeal();     return; }

    // Stage filter tabs
    var tab=e.target.closest('[data-stage-filter]');
    if(tab){ _pipeFilter=tab.dataset.stageFilter; renderPipeline(); return; }

    // Deal row
    var tr=e.target.closest('tr[data-deal-id]');
    if(tr){ openDealDetail(tr.dataset.dealId); return; }
  });

  // Close modals on overlay click
  ['dealModal','dealDetail','saveDealModal'].forEach(function(id){
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
      {t:"Battlecards",             d:"30-sec pitch, objection handling, discovery Qs per line",  x:"PDF",  href:"tools/battlecards.pdf"},
      {t:"Buyer Personas",          d:"Frontier Lab \u00b7 Neocloud \u00b7 Enterprise/Sovereign \u2014 who they are, pain points, objections, pitch", x:"Doc", href:"tools/personas.html"},
      {t:"Deal Qualification Template", d:"Fillable scorecard for prospect meetings or to send prospects \u2014 10-dimension GPUaaS qualification", x:"PDF", href:"tools/deal-qual-template.pdf"},
      {t:"Fillable Quote (current)",d:"36/48/60-mo \u00b7 256-GPU default \u00b7 downpayment",   x:"PDF",  href:"tools/quote.pdf"}
    ];
    var icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    var html='<div class="panel"><div class="ref-list">';
    refs.forEach(function(r){
      html+='<a class="ref-item" href="'+r.href+'" target="_blank" rel="noopener">'+
        '<span class="ri-ic">'+icon+'</span>'+
        '<span><span class="ri-t">'+r.t+'</span><br><span class="ri-d">'+r.d+'</span></span>'+
        '<span class="ri-x">'+r.x+'</span>'+
        '</a>';
    });
    html+='</div></div>';
    el.innerHTML=html;
  }

  // ============================================================
  // NEWS TICKER — The GPU
  // ============================================================
  (function(){
    var inner  = $("#tickerInner");
    var track  = $("#tickerTrack");
    if(!inner||!track) return;

    var _pos   = 0;
    var _speed = 0.6; // px per frame
    var _raf;
    var _paused= false;
    var _halfW = 0;

    function step(){
      if(!_paused && _halfW>0){
        _pos -= _speed;
        if(_pos <= -_halfW) _pos = 0;
        inner.style.transform = 'translateX('+_pos+'px)';
      }
      _raf = requestAnimationFrame(step);
    }

    track.addEventListener('mouseenter', function(){ _paused=true; });
    track.addEventListener('mouseleave', function(){ _paused=false; });

    function buildTicker(items){
      if(!items||!items.length){
        inner.innerHTML='<a class="ticker-item" href="https://thegpu.ai" target="_blank" rel="noopener">Visit The GPU for the latest GPU &amp; AI news</a>';
        return;
      }
      // Build items once, duplicate for seamless loop
      function makeItems(){
        return items.map(function(it){
          return '<a class="ticker-item" href="'+esc(it.link)+'" target="_blank" rel="noopener">'+
            esc(it.title)+
            '</a><span class="ticker-sep">&bull;</span>';
        }).join('');
      }
      inner.innerHTML = makeItems() + makeItems();
      // Measure half-width after render
      requestAnimationFrame(function(){
        _halfW = inner.scrollWidth / 2;
        _pos   = 0;
      });
    }

    async function loadTicker(){
      var feedUrl  = encodeURIComponent('https://thegpu.ai/feed');
      var api      = 'https://api.rss2json.com/v1/api.json?rss_url='+feedUrl+'&count=10';
      try{
        var r = await fetch(api);
        var j = await r.json();
        if(j.status==='ok' && j.items && j.items.length){
          buildTicker(j.items);
        } else {
          throw new Error('empty');
        }
      }catch(e){
        buildTicker(null);
      }
      // Refresh every 30 minutes
      setTimeout(loadTicker, 30*60*1000);
    }

    loadTicker();
    step();
  })();

  window.NS_show=show;
})();
