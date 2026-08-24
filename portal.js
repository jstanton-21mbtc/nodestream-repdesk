(function(){
  "use strict";
  var $  = function(s,el){ return (el||document).querySelector(s); };
  var $$ = function(s,el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };
  var DATA = {};
  try{ DATA = JSON.parse($("#portal-data").textContent); }catch(e){ DATA = {}; }

  // ============================================================
  // AUTH + THEME
  // ============================================================
  var NS_PW_KEY    = 'ns_pw_v1';
  var NS_NAME_KEY  = 'ns_repname_v1';
  var NS_THEME_KEY = 'ns_theme_v1';
  var NS_STAY_KEY  = 'ns_stay_v1';
  var NS_SESS_KEY  = 'ns_session_v1';

  function nsGetHash(){ return localStorage.getItem(NS_PW_KEY); }
  function nsIsFirstTime(){ return !nsGetHash(); }
  function nsIsLoggedIn(){
    return localStorage.getItem(NS_STAY_KEY)==='1' || sessionStorage.getItem(NS_SESS_KEY)==='1';
  }

  function nsHashPw(pw){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    });
  }

  function nsApplyRepName(name){
    if(!name) return;
    var initials = name.split(' ').filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
    var repNameEl = document.getElementById('repName');
    var repInitEl = document.getElementById('repInit');
    if(repNameEl) repNameEl.textContent = name;
    if(repInitEl) repInitEl.textContent = initials || 'AE';
  }

  // --- Theme ---
  function nsApplyTheme(t){
    document.documentElement.setAttribute('data-theme', t || 'dark');
    var icon = document.getElementById('themeIcon');
    var label = document.getElementById('themeLabel');
    if(t === 'light'){
      if(icon) icon.innerHTML='<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      if(label) label.textContent = 'Dark';
    } else {
      if(icon) icon.innerHTML='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      if(label) label.textContent = 'Light';
    }
  }
  window.nsSetTheme = function(t){
    localStorage.setItem(NS_THEME_KEY, t);
    nsApplyTheme(t);
    // Re-render settings if open
    if(!document.getElementById('view-settings').classList.contains('hidden')) mountSettings();
  };
  window.nsToggleTheme = function(){
    var cur = localStorage.getItem(NS_THEME_KEY) || 'dark';
    window.nsSetTheme(cur === 'dark' ? 'light' : 'dark');
  };

  // Apply saved theme immediately
  nsApplyTheme(localStorage.getItem(NS_THEME_KEY) || 'dark');

  // --- Login ---
  function nsShowLogin(){
    var ov = document.getElementById('loginOverlay');
    if(!ov) return;
    ov.style.display = 'flex';
    if(nsIsFirstTime()){
      document.getElementById('loginHeading').textContent = 'Set up your desk';
      document.getElementById('loginSub').textContent = 'Choose your name and create an access code.';
      document.getElementById('loginNameWrap').style.display = 'block';
      document.getElementById('loginConfirmWrap').style.display = 'block';
      document.getElementById('loginBtn').textContent = 'Create & Enter';
      document.getElementById('loginStay').checked = true;
    } else {
      var name = localStorage.getItem(NS_NAME_KEY);
      if(name) document.getElementById('loginHeading').textContent = 'Welcome back, ' + name.split(' ')[0];
      document.getElementById('loginStay').checked = true;
    }
    setTimeout(function(){
      var f = nsIsFirstTime() ? document.getElementById('loginName') : document.getElementById('loginPw');
      if(f) f.focus();
    }, 80);
  }

  function nsHideLogin(){
    var ov = document.getElementById('loginOverlay');
    if(!ov) return;
    ov.style.opacity = '0';
    setTimeout(function(){ ov.style.display = 'none'; ov.style.opacity = '1'; }, 250);
  }

  window.nsSubmitLogin = function(){
    var err = document.getElementById('loginError');
    var btn = document.getElementById('loginBtn');
    var pw  = (document.getElementById('loginPw').value || '').trim();
    err.style.display = 'none';
    if(!pw){ err.textContent = 'Please enter an access code.'; err.style.display = 'block'; return; }

    if(nsIsFirstTime()){
      var name    = (document.getElementById('loginName').value || '').trim();
      var confirm = (document.getElementById('loginConfirm').value || '').trim();
      if(!name)    { err.textContent = 'Please enter your name.'; err.style.display = 'block'; return; }
      if(pw.length < 4){ err.textContent = 'Access code must be at least 4 characters.'; err.style.display = 'block'; return; }
      if(pw !== confirm){ err.textContent = 'Access codes do not match.'; err.style.display = 'block'; return; }
      nsHashPw(pw).then(function(hash){
        localStorage.setItem(NS_PW_KEY, hash);
        localStorage.setItem(NS_NAME_KEY, name);
        if(document.getElementById('loginStay').checked) localStorage.setItem(NS_STAY_KEY, '1');
        else sessionStorage.setItem(NS_SESS_KEY, '1');
        nsApplyRepName(name);
        nsHideLogin();
      });
    } else {
      btn.disabled = true; btn.textContent = 'Verifying\u2026';
      nsHashPw(pw).then(function(hash){
        if(hash === nsGetHash()){
          if(document.getElementById('loginStay').checked) localStorage.setItem(NS_STAY_KEY, '1');
          else { localStorage.removeItem(NS_STAY_KEY); sessionStorage.setItem(NS_SESS_KEY, '1'); }
          btn.disabled = false; btn.textContent = 'Sign In';
          nsHideLogin();
        } else {
          btn.disabled = false; btn.textContent = 'Sign In';
          err.textContent = 'Incorrect access code. Please try again.';
          err.style.display = 'block';
          document.getElementById('loginPw').value = '';
          document.getElementById('loginPw').focus();
        }
      });
    }
  };

  window.nsToggleEye = function(){
    var inp  = document.getElementById('loginPw');
    var icon = document.getElementById('loginEyeIcon');
    if(inp.type === 'password'){
      inp.type = 'text';
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      inp.type = 'password';
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  };

  window.nsLogout = function(){
    localStorage.removeItem(NS_STAY_KEY);
    sessionStorage.removeItem(NS_SESS_KEY);
    // Reset login form state
    document.getElementById('loginPw').value = '';
    var errEl = document.getElementById('loginError');
    if(errEl) errEl.style.display = 'none';
    nsShowLogin();
  };

  // Init auth check
  if(!nsIsLoggedIn()){
    nsShowLogin();
  } else {
    nsApplyRepName(localStorage.getItem(NS_NAME_KEY));
  }

  var VIEW_LABEL = {
    dash:"Dashboard", pipeline:"Pipeline",
    discovery:"Discovery & Scoring", configurator:"Deal Configurator",
    quote:"Quote Builder", ornn:"Compute Index", playbook:"Docs",
    settings:"Settings"
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
    if(view==="settings") mountSettings();
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

  // ---- Rep ---- (stored name takes priority over portal-data default)
  if(localStorage.getItem(NS_NAME_KEY)){
    nsApplyRepName(localStorage.getItem(NS_NAME_KEY));
  } else if(DATA.rep){
    $("#repName").textContent=DATA.rep.name; $("#repInit").textContent=DATA.rep.initials;
  }

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

  // ============================================================
  // SETTINGS — API Keys
  // ============================================================
  var KEY_ANTHROPIC = 'ns_anthropic_key_v1';
  var KEY_OPENAI    = 'ns_openai_key_v1';
  var KEY_GEMINI    = 'ns_gemini_key_v1';

  function getKey(k){ return localStorage.getItem(k)||''; }
  function setKey(k,v){ if(v) localStorage.setItem(k,v); else localStorage.removeItem(k); }

  function mountSettings(){
    var el=$("#settingsMount"); if(!el) return;
    var providers=[
      { id:'anthropic', label:'Anthropic', model:'Claude Sonnet 4.6', storageKey:KEY_ANTHROPIC, badgeClass:'pb-anth',
        desc:'Powers the Claude Sonnet model. Best for long-form reasoning, deal analysis, and objection coaching.', placeholder:'sk-ant-...' },
      { id:'openai',    label:'OpenAI',    model:'GPT-4o',             storageKey:KEY_OPENAI,    badgeClass:'pb-oai',
        desc:'Enables GPT-4o. Strong for structured output, concise answers, and data-heavy questions.',          placeholder:'sk-...' },
      { id:'gemini',    label:'Google',    model:'Gemini 2.0 Flash',   storageKey:KEY_GEMINI,    badgeClass:'pb-gem',
        desc:'Enables Gemini 2.0 Flash. Fast, multimodal, great for market research and quick lookups.',          placeholder:'AIza...' }
    ];

    el.innerHTML='';
    providers.forEach(function(p){
      var current=getKey(p.storageKey);
      var isSet=!!current;
      var masked=isSet ? (p.id==='gemini' ? current.slice(0,8)+'…' : current.slice(0,12)+'…') : '';

      var div=document.createElement('div');
      div.className='settings-card';
      div.innerHTML=
        '<h3>'+p.label+' <span class="prov-badge '+p.badgeClass+'">'+p.model+'</span></h3>'+
        '<p class="sc-desc">'+p.desc+'</p>'+
        '<div class="form-field">'+
          '<span class="form-label">API Key</span>'+
          '<input class="form-input" type="password" id="key-'+p.id+'" autocomplete="off" '+
            'placeholder="'+p.placeholder+'" value="'+(isSet?current:'')+'" style="font-family:var(--mono);font-size:12px">'+
        '</div>'+
        '<div style="display:flex;gap:10px;align-items:center;margin-top:12px">'+
          '<button class="btn-primary" style="padding:7px 16px;font-size:12px" data-save-key="'+p.id+'">Save</button>'+
          (isSet?'<button class="btn-danger" style="padding:7px 14px;font-size:12px" data-clear-key="'+p.id+'">Remove</button>':'')+
        '</div>'+
        '<div class="key-status" id="kstat-'+p.id+'">'+
          '<span class="dot'+(isSet?' set':'')+'"></span>'+
          '<span class="ksl'+(isSet?' set':'')+'">'+( isSet?'Key saved ('+masked+')' : 'No key saved' )+'</span>'+
        '</div>';
      el.appendChild(div);
    });

    // ---- Theme card ----
    var currentTheme = localStorage.getItem(NS_THEME_KEY) || 'dark';
    function themeOptHtml(val, label, icon){
      var active = val === currentTheme;
      return '<button onclick="window.nsSetTheme(\''+val+'\')" style="flex:1;background:'+(active?'rgba(60,160,40,.10)':'var(--panel-2)')+';border:2px solid '+(active?'var(--green-dim)':'var(--line)')+';border-radius:10px;padding:16px 10px;cursor:pointer;color:'+(active?'var(--green-bright)':'var(--muted)')+';font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;transition:.13s;font-weight:'+(active?'700':'400')+';display:flex;flex-direction:column;align-items:center;gap:7px">'+
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'+icon+'</svg>'+label+'</button>';
    }
    var moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    var sunIcon  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    var themeDiv = document.createElement('div');
    themeDiv.className = 'settings-card';
    themeDiv.innerHTML =
      '<h3>Appearance</h3>'+
      '<p class="sc-desc">Choose how the Rep Desk looks. Saved locally in this browser.</p>'+
      '<div style="display:flex;gap:12px;margin-top:4px">'+
        themeOptHtml('dark','Dark',moonIcon)+
        themeOptHtml('light','Light',sunIcon)+
      '</div>';
    el.appendChild(themeDiv);

    // ---- Access Code card ----
    var accessDiv = document.createElement('div');
    accessDiv.className = 'settings-card';
    accessDiv.innerHTML =
      '<h3>Access Code</h3>'+
      '<p class="sc-desc">Change your SHA-256 protected access code. You will need to re-enter it on next login.</p>'+
      '<div class="form-field" style="margin-bottom:10px">'+
        '<span class="form-label">Current Code</span>'+
        '<input class="form-input" type="password" id="ac-current" placeholder="Current access code" style="font-family:var(--mono);font-size:12px">'+
      '</div>'+
      '<div class="form-field" style="margin-bottom:10px">'+
        '<span class="form-label">New Code</span>'+
        '<input class="form-input" type="password" id="ac-new" placeholder="Min 4 characters" style="font-family:var(--mono);font-size:12px">'+
      '</div>'+
      '<div class="form-field" style="margin-bottom:14px">'+
        '<span class="form-label">Confirm New Code</span>'+
        '<input class="form-input" type="password" id="ac-confirm" placeholder="Repeat new code" style="font-family:var(--mono);font-size:12px">'+
      '</div>'+
      '<div id="ac-msg" style="display:none;font-size:12px;margin-bottom:10px;padding:9px 12px;border-radius:8px"></div>'+
      '<button class="btn-primary" id="ac-save-btn" style="padding:7px 16px;font-size:12px">Update Code</button>';
    el.appendChild(accessDiv);

    // Wire access code save
    accessDiv.querySelector('#ac-save-btn').addEventListener('click', function(){
      var cur     = (accessDiv.querySelector('#ac-current').value||'').trim();
      var nw      = (accessDiv.querySelector('#ac-new').value||'').trim();
      var confirm = (accessDiv.querySelector('#ac-confirm').value||'').trim();
      var msg     = accessDiv.querySelector('#ac-msg');
      function showMsg(txt, ok){
        msg.textContent = txt;
        msg.style.display = 'block';
        msg.style.background = ok ? 'rgba(60,160,40,.08)' : 'rgba(217,88,74,.08)';
        msg.style.border = ok ? '1px solid rgba(60,160,40,.25)' : '1px solid rgba(217,88,74,.2)';
        msg.style.color = ok ? 'var(--green-bright)' : 'var(--red)';
      }
      if(!cur || !nw || !confirm){ showMsg('Please fill in all three fields.', false); return; }
      if(nw.length < 4){ showMsg('New code must be at least 4 characters.', false); return; }
      if(nw !== confirm){ showMsg('New codes do not match.', false); return; }
      nsHashPw(cur).then(function(curHash){
        if(curHash !== nsGetHash()){ showMsg('Current access code is incorrect.', false); return; }
        nsHashPw(nw).then(function(newHash){
          localStorage.setItem(NS_PW_KEY, newHash);
          accessDiv.querySelector('#ac-current').value = '';
          accessDiv.querySelector('#ac-new').value = '';
          accessDiv.querySelector('#ac-confirm').value = '';
          showMsg('Access code updated successfully.', true);
        });
      });
    });

    // Settings event delegation
    el.addEventListener('click', function(e){
      var saveBtn=e.target.closest('[data-save-key]');
      var clearBtn=e.target.closest('[data-clear-key]');
      if(saveBtn){
        var pid=saveBtn.dataset.saveKey;
        var val=($("#key-"+pid).value||'').trim();
        var sk=pid==='anthropic'?KEY_ANTHROPIC:pid==='openai'?KEY_OPENAI:KEY_GEMINI;
        setKey(sk,val);
        mountSettings(); // re-render to refresh status
        return;
      }
      if(clearBtn){
        var pid2=clearBtn.dataset.clearKey;
        var sk2=pid2==='anthropic'?KEY_ANTHROPIC:pid2==='openai'?KEY_OPENAI:KEY_GEMINI;
        setKey(sk2,'');
        mountSettings();
        return;
      }
    });
  }

  // ============================================================
  // AI ANALYST
  // ============================================================
  var _aiHistory = []; // {role:'user'|'assistant', content:''}
  var _aiLoading = false;

  var AI_SYSTEM = 'You are an expert AI deal analyst for Nodestream, a verified AI compute marketplace specializing in HPC GPU-as-a-service (GPUaaS). Help sales reps with:\n'+
    '- Deal strategy, stage advancement, and close tactics\n'+
    '- GPU SKU guidance: H100 SXM5, A100 80GB, H200, B200, B300, MI300X — specs, use cases, pricing context\n'+
    '- Market pricing context: ~$1.80–$3.20/GPU-hr depending on GPU and contract term\n'+
    '- Contract structuring: 36/48/60-month terms, downpayment options, amortization schedules\n'+
    '- Persona-specific selling: Frontier Labs (research-focused, performance-first), Neoclouds (resellers, economics-driven), Enterprise/Sovereign (compliance, SLA, procurement-heavy)\n'+
    '- Objection handling, competitive positioning, and qualification coaching\n'+
    '- HPC/AI market trends and competitive landscape\n\n'+
    'Be concise, tactical, and specific. Use bullet points where helpful. Always tailor advice to the rep\'s actual situation.';

  function aiAppendMsg(role, text){
    var msgs=$("#aiMessages"); if(!msgs) return;
    var div=document.createElement('div');
    div.className='ai-msg '+role;
    var label=role==='user'?'You':'AI';
    div.innerHTML=
      '<div class="ai-avatar">'+label+'</div>'+
      '<div class="ai-bubble">'+escHtml(text)+'</div>';
    msgs.appendChild(div);
    msgs.scrollTop=msgs.scrollHeight;
    return div;
  }

  function escHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function aiShowTyping(){
    var msgs=$("#aiMessages"); if(!msgs) return null;
    var div=document.createElement('div');
    div.className='ai-msg ai';
    div.id='ai-typing-indicator';
    div.innerHTML='<div class="ai-avatar">AI</div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
    msgs.appendChild(div);
    msgs.scrollTop=msgs.scrollHeight;
    return div;
  }

  function aiRemoveTyping(){
    var el=$("#ai-typing-indicator"); if(el) el.remove();
  }

  function getActiveKey(){
    var prov=($("#aiProviderSel")||{}).value||'anthropic';
    if(prov==='anthropic') return {prov:'anthropic', key:getKey(KEY_ANTHROPIC)};
    if(prov==='openai')    return {prov:'openai',    key:getKey(KEY_OPENAI)};
    if(prov==='gemini')    return {prov:'gemini',    key:getKey(KEY_GEMINI)};
    return {prov:'anthropic', key:''};
  }

  async function callAnthropic(key, messages){
    var body={
      model:'claude-sonnet-4-6',
      max_tokens:1024,
      system:AI_SYSTEM,
      messages:messages
    };
    var r=await fetch('/api/anthropic/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify(body)
    });
    if(!r.ok){ var e=await r.text(); throw new Error('Anthropic '+r.status+': '+e.slice(0,200)); }
    var j=await r.json();
    return j.content[0].text;
  }

  async function callOpenAI(key, messages){
    var oaiMsgs=[{role:'system',content:AI_SYSTEM}].concat(messages);
    var body={model:'gpt-4o', max_tokens:1024, messages:oaiMsgs};
    var r=await fetch('/api/openai/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify(body)
    });
    if(!r.ok){ var e=await r.text(); throw new Error('OpenAI '+r.status+': '+e.slice(0,200)); }
    var j=await r.json();
    return j.choices[0].message.content;
  }

  async function callGemini(key, messages){
    // Convert to Gemini format
    var contents=messages.map(function(m){
      return {role:m.role==='assistant'?'model':'user', parts:[{text:m.content}]};
    });
    // Prepend system as first user turn if history starts with assistant
    var fullContents=[{role:'user',parts:[{text:AI_SYSTEM+'\n\n---\nUnderstood. Ready to help.'}]},{role:'model',parts:[{text:'Understood. Ready to help.'}]}].concat(contents);
    var body={contents:fullContents,generationConfig:{maxOutputTokens:1024}};
    var url='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+encodeURIComponent(key);
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){ var e=await r.text(); throw new Error('Gemini '+r.status+': '+e.slice(0,200)); }
    var j=await r.json();
    return j.candidates[0].content.parts[0].text;
  }

  async function sendAIMessage(){
    if(_aiLoading) return;
    var inp=$("#aiInput"); if(!inp) return;
    var text=(inp.value||'').trim(); if(!text) return;

    var kInfo=getActiveKey();
    if(!kInfo.key){
      aiAppendMsg('ai','No API key found for this provider. Go to Settings to add your '+kInfo.prov+' API key.');
      return;
    }

    inp.value=''; inp.style.height='40px';
    aiAppendMsg('user', text);
    _aiHistory.push({role:'user', content:text});

    var send=$("#aiSend"); if(send) send.disabled=true;
    _aiLoading=true;
    aiShowTyping();

    try{
      var reply='';
      if(kInfo.prov==='anthropic') reply=await callAnthropic(kInfo.key, _aiHistory);
      else if(kInfo.prov==='openai') reply=await callOpenAI(kInfo.key, _aiHistory);
      else reply=await callGemini(kInfo.key, _aiHistory);
      _aiHistory.push({role:'assistant', content:reply});
      aiRemoveTyping();
      aiAppendMsg('ai', reply);
    }catch(err){
      aiRemoveTyping();
      aiAppendMsg('ai','Error: '+err.message);
    }

    _aiLoading=false;
    if(send) send.disabled=false;
    if(inp) inp.focus();
  }

  // AI Panel open/close
  document.getElementById('aiFab').addEventListener('click', function(){
    var p=$("#aiPanel"); if(p) p.classList.toggle('open');
    var inp=$("#aiInput"); if(inp && p && p.classList.contains('open')) setTimeout(function(){ inp.focus(); },260);
  });
  document.getElementById('aiClose').addEventListener('click', function(){
    var p=$("#aiPanel"); if(p) p.classList.remove('open');
  });

  // Send on button click
  document.getElementById('aiSend').addEventListener('click', function(){ sendAIMessage(); });

  // Send on Enter (Shift+Enter = newline)
  document.getElementById('aiInput').addEventListener('keydown', function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendAIMessage(); }
  });

  // Auto-resize textarea
  document.getElementById('aiInput').addEventListener('input', function(){
    this.style.height='40px';
    this.style.height=Math.min(this.scrollHeight, 120)+'px';
  });

  // Clear conversation
  document.getElementById('aiClear').addEventListener('click', function(){
    _aiHistory=[];
    var msgs=$("#aiMessages"); if(!msgs) return;
    msgs.innerHTML='<div class="ai-msg ai"><div class="ai-avatar">AI</div><div class="ai-bubble">Conversation cleared. What can I help you with?</div></div>';
  });

  window.NS_show=show;
})();
