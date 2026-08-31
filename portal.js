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
    // Already authenticated — hide the overlay immediately (no fade)
    var _ov = document.getElementById('loginOverlay');
    if(_ov) _ov.style.display = 'none';
    nsApplyRepName(localStorage.getItem(NS_NAME_KEY));
    // Recovery: if the user closed the browser mid-demo, restore their real pipeline backup
    var _demoBak = sessionStorage.getItem('ns_demo_bak_pipeline');
    if(_demoBak){
      localStorage.setItem('ns_pipeline_v1', _demoBak);
      sessionStorage.removeItem('ns_demo_bak_pipeline');
    }
    var _taskBak = sessionStorage.getItem('ns_demo_bak_tasks');
    if(_taskBak){
      localStorage.setItem('ns_tasks_v1', _taskBak);
      sessionStorage.removeItem('ns_demo_bak_tasks');
    }
    sessionStorage.removeItem('ns_demo_v1');
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
    if(view==="dash")     { loadDailyBrief(); renderDashKPIs(); renderDashPipeline(); }
    if(view==="pipeline") renderKanban();
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

  // KPIs rendered after pipeline section defines ensureDeals / renderDashKPIs

  // Dashboard pipeline preview — rendered after pipeline section defines loadDeals/STAGES

  // ---- Tasks (localStorage-backed, full CRUD) ----
  var NS_TASKS_KEY = 'ns_tasks_v1';
  (function(){
    var list = $("#taskList"); if(!list) return;

    // Load tasks — demo reads from sessionStorage, real users from localStorage
    var tasks;
    try{
      var _demoTasks = sessionStorage.getItem('ns_demo_v1');
      tasks = JSON.parse((_demoTasks ? sessionStorage.getItem('ns_demo_tasks') : localStorage.getItem(NS_TASKS_KEY))||'null');
    }catch(e){ tasks=null; }
    if(!tasks){ tasks = []; }

    function saveTasks(){
      if(sessionStorage.getItem('ns_demo_v1'))
        sessionStorage.setItem('ns_demo_tasks', JSON.stringify(tasks));
      else
        localStorage.setItem(NS_TASKS_KEY, JSON.stringify(tasks));
    }

    var isAdding = false;
    var editingId = null;

    function render(){
      var open = tasks.filter(function(t){ return !t.done; });
      var done = tasks.filter(function(t){ return  t.done; });
      var tc = $("#taskCount");
      if(tc) tc.textContent = open.length ? open.length+' open' : '';
      list.innerHTML = '';

      // Empty state
      if(!open.length && !isAdding){
        var emp = document.createElement('div');
        emp.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--muted-2);text-align:center;padding:18px 0';
        emp.textContent = done.length ? 'All done \u2014 nothing left.' : 'No tasks. Hit + Add to create one.';
        list.appendChild(emp);
      }

      // Active tasks
      open.forEach(function(t){
        var row = document.createElement('div');
        row.className = 'task';
        if(editingId === t.id){
          row.innerHTML =
            '<input type="checkbox" disabled style="margin-top:3px;accent-color:var(--green);width:15px;height:15px;flex:none;opacity:.3">'+
            '<div style="flex:1;display:flex;flex-direction:column;gap:6px">'+
              '<input type="text" class="form-input ns-te-text" value="'+esc(t.text)+'" style="padding:6px 10px;font-size:13px" placeholder="Task description">'+
              '<input type="text" class="form-input ns-te-meta" value="'+esc(t.meta)+'" style="padding:5px 10px;font-size:11px;font-family:var(--mono)" placeholder="Label / due (optional)">'+
              '<div style="display:flex;gap:8px">'+
                '<button class="btn-primary ns-te-save" data-id="'+t.id+'" style="padding:5px 13px;font-size:12px">Save</button>'+
                '<button class="btn-ghost ns-te-cancel" style="padding:5px 13px;font-size:12px">Cancel</button>'+
              '</div>'+
            '</div>';
        } else {
          row.innerHTML =
            '<input type="checkbox" class="ns-cb" data-id="'+t.id+'" style="margin-top:3px;accent-color:var(--green);width:15px;height:15px;flex:none;cursor:pointer">'+
            '<div style="flex:1;min-width:0">'+
              '<div class="tt">'+esc(t.text)+'</div>'+
              (t.meta?'<div class="tm">'+esc(t.meta)+'</div>':'')+
            '</div>'+
            '<div style="display:flex;gap:2px;flex:none;align-items:center;opacity:0;transition:opacity .15s" class="ns-ta">'+
              '<button class="ns-eb" data-id="'+t.id+'" title="Edit" style="background:none;border:none;color:var(--muted-2);cursor:pointer;padding:4px 6px;border-radius:6px;line-height:1;transition:.12s">'+
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'+
              '</button>'+
              '<button class="ns-db" data-id="'+t.id+'" title="Delete" style="background:none;border:none;color:var(--muted-2);cursor:pointer;padding:4px 6px;border-radius:6px;font-size:15px;line-height:1;transition:.12s">&times;</button>'+
            '</div>';
          // Show action buttons on row hover
          row.addEventListener('mouseenter', function(){ var a=row.querySelector('.ns-ta'); if(a) a.style.opacity='1'; });
          row.addEventListener('mouseleave', function(){ var a=row.querySelector('.ns-ta'); if(a) a.style.opacity='0'; });
        }
        list.appendChild(row);
      });

      // Add form
      if(isAdding){
        var addRow = document.createElement('div');
        addRow.className = 'task';
        addRow.innerHTML =
          '<input type="checkbox" disabled style="margin-top:3px;width:15px;height:15px;flex:none;opacity:.3">'+
          '<div style="flex:1;display:flex;flex-direction:column;gap:6px">'+
            '<input type="text" class="form-input" id="nsNT" style="padding:6px 10px;font-size:13px" placeholder="What needs to be done?">'+
            '<input type="text" class="form-input" id="nsNM" style="padding:5px 10px;font-size:11px;font-family:var(--mono)" placeholder="Label / due (optional)">'+
            '<div style="display:flex;gap:8px">'+
              '<button class="btn-primary" id="nsAS" style="padding:5px 13px;font-size:12px">Add</button>'+
              '<button class="btn-ghost" id="nsAC" style="padding:5px 13px;font-size:12px">Cancel</button>'+
            '</div>'+
          '</div>';
        list.appendChild(addRow);
        setTimeout(function(){ var el=document.getElementById('nsNT'); if(el) el.focus(); }, 30);
      }

      // Done count + clear link
      if(done.length){
        var foot = document.createElement('div');
        foot.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:10px;font-family:var(--mono);font-size:10px;color:var(--muted-2)';
        foot.innerHTML = done.length+' completed &mdash; <button id="nsCLD" style="background:none;border:none;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--red);padding:0;text-decoration:underline">clear all</button>';
        list.appendChild(foot);
      }
    }

    // Checkbox → mark done (hidden)
    list.addEventListener('change', function(e){
      var cb = e.target.closest('.ns-cb'); if(!cb) return;
      var t = tasks.find(function(x){ return x.id===cb.dataset.id; });
      if(t){ t.done=true; saveTasks(); render(); }
    });

    list.addEventListener('click', function(e){
      // Edit button
      var eb = e.target.closest('.ns-eb');
      if(eb){ editingId=eb.dataset.id; isAdding=false; render(); return; }

      // Save edit
      var se = e.target.closest('.ns-te-save');
      if(se){
        var row = se.closest('.task');
        var txt = (row&&row.querySelector('.ns-te-text')||{}).value||'';
        var met = (row&&row.querySelector('.ns-te-meta')||{}).value||'';
        txt = txt.trim(); if(!txt) return;
        var t = tasks.find(function(x){ return x.id===se.dataset.id; });
        if(t){ t.text=txt; t.meta=met.trim(); saveTasks(); }
        editingId=null; render(); return;
      }

      // Cancel edit
      if(e.target.closest('.ns-te-cancel')){ editingId=null; render(); return; }

      // Delete
      var db = e.target.closest('.ns-db');
      if(db){ tasks=tasks.filter(function(x){ return x.id!==db.dataset.id; }); saveTasks(); render(); return; }

      // Save new task
      if(e.target.id==='nsAS'){
        var textEl=document.getElementById('nsNT'), metEl=document.getElementById('nsNM');
        var txt2=(textEl&&textEl.value||'').trim(); if(!txt2) return;
        tasks.unshift({id:'t'+Date.now(), text:txt2, meta:(metEl&&metEl.value||'').trim(), done:false});
        saveTasks(); isAdding=false; render(); return;
      }

      // Cancel new
      if(e.target.id==='nsAC'){ isAdding=false; render(); return; }

      // Clear done
      if(e.target.id==='nsCLD'){ tasks=tasks.filter(function(x){ return !x.done; }); saveTasks(); render(); return; }
    });

    // Enter key shortcuts
    list.addEventListener('keydown', function(e){
      if(e.key!=='Enter') return;
      var nt=document.getElementById('nsNT'), nm=document.getElementById('nsNM');
      var as=document.getElementById('nsAS');
      if((e.target===nt||e.target===nm) && as){ e.preventDefault(); as.click(); return; }
      var teText=list.querySelector('.ns-te-text'), teMeta=list.querySelector('.ns-te-meta');
      var teSave=list.querySelector('.ns-te-save');
      if((e.target===teText||e.target===teMeta) && teSave){ e.preventDefault(); teSave.click(); }
    });

    // Wire "+ Add" button in panel header
    document.getElementById('addTaskBtn').addEventListener('click', function(){
      isAdding=true; editingId=null; render();
    });

    render();
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
    var isDemo = sessionStorage.getItem('ns_demo_v1');
    var store = isDemo ? sessionStorage : localStorage;
    var key   = isDemo ? 'ns_demo_pipeline' : PIPELINE_KEY;
    try{ return JSON.parse(store.getItem(key)||'null')||[]; }catch(e){ return []; }
  }
  function saveDeals(d){
    if(sessionStorage.getItem('ns_demo_v1'))
      sessionStorage.setItem('ns_demo_pipeline', JSON.stringify(d));
    else
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(d));
  }

  var STAGE_WEIGHTS = {disc:0.10, qual:0.25, quote:0.50, nego:0.75, won:1.0, lost:0.0};

  function fmtAmt(n){
    if(n >= 1e6) return '$'+(n/1e6).toFixed(1)+'M';
    if(n >= 1e3) return '$'+Math.round(n/1e3)+'K';
    return '$'+Math.round(n||0);
  }

  function renderDashKPIs(){
    var wrap = $("#kpis"); if(!wrap) return;
    var deals  = ensureDeals();
    var active = deals.filter(function(d){ return d.stage!=='won'&&d.stage!=='lost'; });
    var won    = deals.filter(function(d){ return d.stage==='won'; });
    var quoting= deals.filter(function(d){ return d.stage==='quote'; });
    var openVal    = active.reduce(function(s,d){ return s+parseAmt(d.amt); }, 0);
    var weightedVal= active.reduce(function(s,d){ return s+parseAmt(d.amt)*(STAGE_WEIGHTS[d.stage]||0); }, 0);
    var wonVal     = won.reduce(function(s,d){ return s+parseAmt(d.amt); }, 0);
    var kpis = [
      {k:'Open pipeline', v:active.length?fmtAmt(openVal):'—', green:true,
       d:active.length+' active deal'+(active.length!==1?'s':'')},
      {k:'Weighted',      v:active.length?fmtAmt(weightedVal):'—', green:false,
       d:'stage-adjusted'},
      {k:'Quotes out',    v:String(quoting.length), green:false,
       d:quoting.length?'awaiting signature':'none out'},
      {k:'Closed won',    v:won.length?fmtAmt(wonVal):'—', green:false,
       d:won.length+' deal'+(won.length!==1?'s':'')}
    ];
    wrap.innerHTML='';
    kpis.forEach(function(k){
      var d=document.createElement('div'); d.className='kpi';
      d.innerHTML='<div class="k">'+k.k+'</div>'+
        '<div class="v'+(k.green?' green':'')+'">'+k.v+'</div>'+
        '<div class="d">'+k.d+'</div>';
      wrap.appendChild(d);
    });
  }

  function renderDashPipeline(){
    var tb = $("#pipeBody"); if(!tb) return;
    var active = ensureDeals().filter(function(d){ return d.stage!=='won' && d.stage!=='lost'; });
    tb.innerHTML = '';
    if(!active.length){
      var empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="4" style="text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted-2);padding:18px 0">No active deals — add one in Pipeline</td>';
      tb.appendChild(empty); return;
    }
    active.forEach(function(d){
      var tr = document.createElement('tr');
      tr.className = 'clickable';
      tr.dataset.dealId = d.id;
      tr.innerHTML = '<td class="co">'+esc(d.co)+'</td>'+
        '<td class="persona-tag">'+esc(d.persona||'')+'</td>'+
        '<td><span class="stage '+d.stage+'">'+esc(STAGES[d.stage]||d.stage)+'</span></td>'+
        '<td class="amt">'+esc(d.amt||'—')+'</td>';
      tb.appendChild(tr);
    });
  }

  function ensureDeals(){
    return loadDeals();
  }

  var STAGE_CFG = {
    disc:  {accent:'var(--muted)',       accentBg:'var(--panel-2)'},
    qual:  {accent:'var(--amber)',        accentBg:'rgba(224,167,60,.07)'},
    quote: {accent:'var(--green-bright)', accentBg:'rgba(46,122,31,.08)'},
    nego:  {accent:'var(--green-bright)', accentBg:'rgba(79,209,53,.09)'},
    won:   {accent:'var(--green-bright)', accentBg:'rgba(79,209,53,.09)'},
    lost:  {accent:'var(--red)',          accentBg:'rgba(217,88,74,.07)'}
  };

  function parseAmt(s){
    if(!s) return 0;
    var str=String(s).replace(/[$,\s]/g,'');
    var mult=1;
    if(/[Mm]$/.test(str)){ mult=1e6; str=str.slice(0,-1); }
    else if(/[Kk]$/.test(str)){ mult=1e3; str=str.slice(0,-1); }
    var n=parseFloat(str); return isNaN(n)?0:n*mult;
  }
  function fmtTotal(arr){
    var t=arr.reduce(function(s,d){ return s+parseAmt(d.amt); },0);
    if(!t) return '';
    if(t>=1e6) return '$'+(t/1e6).toFixed(1)+'M';
    if(t>=1e3) return '$'+(t/1e3).toFixed(1)+'K';
    return '$'+Math.round(t);
  }

  var LI_TITLES = {
    'Neocloud':    'Head of Infrastructure OR CTO OR VP Engineering OR Cloud Architect',
    'Frontier Lab':'Head of AI OR VP Research OR Chief Scientist OR ML Infrastructure',
    'Enterprise':  'CTO OR VP IT OR VP Infrastructure OR Director of Technology',
    'Sovereign':   'CTO OR Chief Digital Officer OR VP Technology OR Director IT'
  };
  function liSearchUrl(co, persona){
    var titles = LI_TITLES[persona] || 'CTO OR VP Technology OR Head of Infrastructure';
    return 'https://www.linkedin.com/search/results/people/?keywords='+
      encodeURIComponent(co+' '+titles);
  }

  var _dragId = null;

  function renderKanban(){
    var board=document.getElementById('kanbanBoard'); if(!board) return;
    var deals=ensureDeals();
    board.innerHTML='';

    Object.keys(STAGES).forEach(function(sk){
      var cfg=STAGE_CFG[sk]||STAGE_CFG.disc;
      var stageDeals=deals.filter(function(d){ return d.stage===sk; });
      var total=fmtTotal(stageDeals);

      // Column wrapper
      var col=document.createElement('div');
      col.className='kancol';

      // Header
      var head=document.createElement('div');
      head.className='kancol-head';
      head.style.cssText='border-color:'+cfg.accent+';background:'+cfg.accentBg+';border-left:3px solid '+cfg.accent;
      head.innerHTML=
        '<div>'+
          '<div style="font-family:var(--mono);font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:'+cfg.accent+';font-weight:700">'+esc(STAGES[sk])+'</div>'+
          (total?'<div style="font-family:var(--mono);font-size:9px;color:var(--muted-2);margin-top:3px">'+total+'</div>':'')+
        '</div>'+
        '<span style="font-family:var(--mono);font-size:11px;background:var(--panel-3);border:1px solid var(--line);border-radius:5px;padding:2px 8px;color:var(--muted-2);flex:none">'+stageDeals.length+'</span>';
      col.appendChild(head);

      // Body (drop zone)
      var body=document.createElement('div');
      body.className='kancol-body';

      body.addEventListener('dragover',function(e){
        e.preventDefault(); e.dataTransfer.dropEffect='move';
        body.classList.add('drag-over');
      });
      body.addEventListener('dragleave',function(e){
        if(!body.contains(e.relatedTarget)) body.classList.remove('drag-over');
      });
      body.addEventListener('drop',function(e){
        e.preventDefault(); body.classList.remove('drag-over');
        if(!_dragId) return;
        var all=loadDeals();
        var deal=all.find(function(d){ return d.id===_dragId; });
        if(deal && deal.stage!==sk){ deal.stage=sk; saveDeals(all); renderKanban(); renderDashKPIs(); renderDashPipeline(); }
      });

      // Cards
      if(stageDeals.length){
        stageDeals.forEach(function(d){
          var hasDocs=d.scorecardSavedAt||d.configSavedAt;
          var card=document.createElement('div');
          card.className='kancard';
          card.draggable=true;
          card.dataset.dealId=d.id;
          card.innerHTML=
            '<div class="kc-co">'+esc(d.co)+(hasDocs?'<span class="kc-docs">docs</span>':'')+' </div>'+
            '<div class="kc-persona">'+esc(d.persona)+'</div>'+
            (d.amt?'<div class="kc-amt">'+esc(d.amt)+'</div>':'')+
            '<div class="kc-date" style="display:flex;align-items:center;justify-content:space-between;gap:6px">'+
              '<span>'+(d.dateAdded?esc(fmtDate(d.dateAdded)):'')+'</span>'+
              '<button class="kc-li" data-li-url="'+esc(liSearchUrl(d.co,d.persona))+'">in</button>'+
            '</div>';

          card.addEventListener('dragstart',function(e){
            _dragId=d.id; card.classList.add('dragging');
            e.dataTransfer.effectAllowed='move';
            e.dataTransfer.setData('text/plain',d.id);
          });
          card.addEventListener('dragend',function(){
            card.classList.remove('dragging'); _dragId=null;
          });
          card.addEventListener('click',function(e){
            var liBtn = e.target.closest('.kc-li');
            if(liBtn){ e.stopPropagation(); window.open(liBtn.dataset.liUrl,'_blank'); return; }
            openDealDetail(d.id);
          });
          body.appendChild(card);
        });
      } else {
        var empty=document.createElement('div');
        empty.style.cssText='text-align:center;padding:22px 8px;font-family:var(--mono);font-size:9.5px;color:var(--muted-2);letter-spacing:.5px;line-height:2';
        empty.textContent='No deals';
        body.appendChild(empty);
      }

      // + Add button pinned at bottom of column
      var addBtn=document.createElement('button');
      addBtn.className='kancol-add';
      addBtn.textContent='+ Add deal';
      addBtn.dataset.addStage=sk;
      addBtn.addEventListener('click',function(){ openAddDeal(sk); });
      body.appendChild(addBtn);

      col.appendChild(body);
      board.appendChild(col);
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
  function openAddDeal(stage){
    $("#dealModalTitle").textContent='Add Deal';
    $("#dealId").value=''; $("#deal-co").value='';
    $("#deal-persona").value='Neocloud'; $("#deal-stage").value=stage||'disc';
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
    renderKanban();
    renderDashKPIs();
    renderDashPipeline();
  }

  function deleteDeal(){
    if(!_viewingDealId) return;
    var deals=loadDeals();
    var deal=deals.find(function(d){ return d.id===_viewingDealId; }); if(!deal) return;
    if(!confirm('Delete "'+deal.co+'"? This cannot be undone.')) return;
    saveDeals(deals.filter(function(d){ return d.id!==_viewingDealId; }));
    closeDetail(); renderKanban(); renderDashKPIs(); renderDashPipeline();
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

    // Deal row (dashboard preview table)
    var tr=e.target.closest('tr[data-deal-id]');
    if(tr){ openDealDetail(tr.dataset.dealId); return; }
  });

  // Close modals on overlay click (with dirty-state guard for deal form)
  ['dealModal','dealDetail','saveDealModal'].forEach(function(id){
    var ol=$("#"+id);
    if(!ol) return;
    ol.addEventListener('click',function(e){
      if(e.target!==ol) return;
      if(id==='dealModal'){
        var co=($("#deal-co")||{}).value||'';
        var amt=($("#deal-amt")||{}).value||'';
        var notes=($("#deal-notes")||{}).value||'';
        if((co||amt||notes) && !confirm('Discard unsaved changes?')) return;
      }
      ol.classList.add('hidden');
    });
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

    // ---- Google Workspace card ----
    var gConnected = !!nsGoogleToken();
    var gClientId  = localStorage.getItem(NS_GCLIENT_KEY)||'';
    var gDiv = document.createElement('div');
    gDiv.className = 'settings-card';
    gDiv.innerHTML =
      '<h3>Google Workspace <span class="prov-badge pb-gem">Calendar · Gmail · Drive</span></h3>'+
      '<p class="sc-desc">Connect your Google account to show today\'s calendar events, unread inbox messages, and recently viewed Drive files on the Dashboard.</p>'+
      '<div class="form-field" style="margin-bottom:14px">'+
        '<span class="form-label">Google OAuth Client ID</span>'+
        '<input class="form-input" type="text" id="g-client-id" autocomplete="off" '+
          'placeholder="xxxxxxxx.apps.googleusercontent.com" '+
          'value="'+esc(gClientId)+'" style="font-family:var(--mono);font-size:11px">'+
      '</div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
        '<button class="btn-primary" style="padding:7px 16px;font-size:12px" id="g-save-btn">Save Client ID</button>'+
        (gConnected
          ? '<button class="g-btn connected" onclick="nsGoogleDisconnect()">&#10003; Connected &mdash; Disconnect</button>'
          : '<button class="g-btn" onclick="nsGoogleConnect()">Connect Google</button>'
        )+
      '</div>'+
      '<div class="key-status" style="margin-top:12px">'+
        '<span class="dot'+(gConnected?' set':'')+'"></span>'+
        '<span class="ksl'+(gConnected?' set':'')+'">'+
          (gConnected ? 'Google connected — Daily Brief active' : 'Not connected')+
        '</span>'+
      '</div>';
    el.appendChild(gDiv);
    gDiv.querySelector('#g-save-btn').addEventListener('click', function(){
      var val = (gDiv.querySelector('#g-client-id').value||'').trim();
      if(val) localStorage.setItem(NS_GCLIENT_KEY, val);
      else    localStorage.removeItem(NS_GCLIENT_KEY);
      mountSettings();
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
  // GOOGLE WORKSPACE INTEGRATION
  // ============================================================
  var NS_GCLIENT_KEY = 'ns_google_client_v1';
  var NS_GTOKEN_KEY  = 'ns_google_token_v1';
  var NS_GEXPIRY_KEY = 'ns_google_expiry_v1';

  function nsGoogleToken(){
    var tok    = localStorage.getItem(NS_GTOKEN_KEY);
    var expiry = parseInt(localStorage.getItem(NS_GEXPIRY_KEY)||'0', 10);
    if(!tok || Date.now() > expiry) return null;
    return tok;
  }

  window.nsGoogleConnect = function(){
    var clientId = (localStorage.getItem(NS_GCLIENT_KEY)||'').trim();
    if(!clientId){
      alert('Enter your Google Client ID in Settings \u2192 Google Workspace first.');
      return;
    }
    if(typeof google === 'undefined' || !google.accounts){
      alert('Google Identity Services not loaded. Check your internet connection and refresh.');
      return;
    }
    var client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly',
      callback: function(resp){
        if(resp && resp.error){ console.error('GIS error:', resp.error); return; }
        var tok = resp.access_token;
        var exp = Date.now() + ((resp.expires_in||3600) - 30) * 1000;
        localStorage.setItem(NS_GTOKEN_KEY, tok);
        localStorage.setItem(NS_GEXPIRY_KEY, String(exp));
        loadDailyBrief();
        mountSettings();
      }
    });
    client.requestAccessToken();
  };

  window.nsGoogleDisconnect = function(){
    localStorage.removeItem(NS_GTOKEN_KEY);
    localStorage.removeItem(NS_GEXPIRY_KEY);
    loadDailyBrief();
    mountSettings();
  };

  function loadDailyBrief(){
    var mount = document.getElementById('dailyBriefMount');
    if(!mount) return;
    var tok = nsGoogleToken();
    if(!tok){
      var hadToken = !!localStorage.getItem(NS_GTOKEN_KEY);
      renderBriefDisconnected(mount, hadToken);
      return;
    }

    mount.innerHTML =
      '<div class="brief-grid">'+
        '<div class="brief-panel"><div class="brief-head"><span class="brief-head-title">Calendar</span></div><div class="brief-empty">Loading\u2026</div></div>'+
        '<div class="brief-panel"><div class="brief-head"><span class="brief-head-title">Gmail</span></div><div class="brief-empty">Loading\u2026</div></div>'+
        '<div class="brief-panel"><div class="brief-head"><span class="brief-head-title">Drive</span></div><div class="brief-empty">Loading\u2026</div></div>'+
      '</div>';

    Promise.all([fetchCalendarEvents(tok), fetchGmailMessages(tok), fetchDriveFiles(tok)])
      .then(function(res){ renderDailyBrief(mount, res[0], res[1], res[2]); })
      .catch(function(err){
        // Token likely expired — clear it and show reconnect prompt
        localStorage.removeItem(NS_GTOKEN_KEY);
        localStorage.removeItem(NS_GEXPIRY_KEY);
        renderBriefDisconnected(mount, true);
        console.warn('Daily Brief error:', err.message);
      });
  }

  function fetchCalendarEvents(tok){
    var now   = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    var end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    var url   = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'+
      '?timeMin='+encodeURIComponent(start)+'&timeMax='+encodeURIComponent(end)+
      '&singleEvents=true&orderBy=startTime&maxResults=8';
    return fetch(url, {headers:{Authorization:'Bearer '+tok}})
      .then(function(r){ if(!r.ok) throw new Error('Cal '+r.status); return r.json(); })
      .then(function(j){ return j.items||[]; });
  }

  function fetchGmailMessages(tok){
    var url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is%3Aunread+in%3Ainbox&maxResults=6';
    return fetch(url, {headers:{Authorization:'Bearer '+tok}})
      .then(function(r){ if(!r.ok) throw new Error('Gmail '+r.status); return r.json(); })
      .then(function(j){
        var msgs = j.messages||[];
        if(!msgs.length) return [];
        return Promise.all(msgs.slice(0,6).map(function(m){
          return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id+
            '?format=metadata&metadataHeaders=Subject&metadataHeaders=From',
            {headers:{Authorization:'Bearer '+tok}})
            .then(function(r){ return r.json(); })
            .then(function(data){
              var hdrs = (data.payload&&data.payload.headers)||[];
              var subj = (hdrs.find(function(h){ return h.name==='Subject'; })||{}).value||'(no subject)';
              var from = (hdrs.find(function(h){ return h.name==='From'; })||{}).value||'';
              var sender = from.replace(/"([^"]+)".*/, '$1').trim() || from.split('@')[0] || from;
              return {subject:subj, sender:sender};
            });
        }));
      });
  }

  function fetchDriveFiles(tok){
    var url = 'https://www.googleapis.com/drive/v3/files'+
      '?orderBy=viewedByMeTime+desc&pageSize=6'+
      '&fields=files(id,name,mimeType,webViewLink)';
    return fetch(url, {headers:{Authorization:'Bearer '+tok}})
      .then(function(r){ if(!r.ok) throw new Error('Drive '+r.status); return r.json(); })
      .then(function(j){ return j.files||[]; });
  }

  function renderDailyBrief(mount, events, emails, files){
    var calSvg   = '<svg class="brief-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    var gmailSvg = '<svg class="brief-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
    var driveSvg = '<svg class="brief-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>';

    var calHTML = '';
    if(!events.length){
      calHTML = '<div class="brief-empty">No events today</div>';
    } else {
      events.forEach(function(ev){
        var start = ev.start && (ev.start.dateTime||ev.start.date);
        var timeStr = '';
        if(start && start.indexOf('T') !== -1){
          var d = new Date(start);
          timeStr = d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).toLowerCase().replace(' ','');
        } else { timeStr = 'all day'; }
        calHTML += '<div class="brief-item">'+
          '<div class="brief-dot"></div>'+
          '<div class="brief-time">'+timeStr+'</div>'+
          '<div class="brief-text">'+esc(ev.summary||'(untitled)')+'</div>'+
        '</div>';
      });
    }

    var gmailHTML = '';
    if(!emails.length){
      gmailHTML = '<div class="brief-empty">Inbox is clear</div>';
    } else {
      emails.forEach(function(em){
        gmailHTML += '<div class="brief-item">'+
          '<div class="brief-dot" style="background:var(--amber)"></div>'+
          '<div style="min-width:0;flex:1">'+
            '<div class="brief-title">'+esc(em.subject)+'</div>'+
            '<div class="brief-sub">'+esc(em.sender)+'</div>'+
          '</div>'+
        '</div>';
      });
    }

    var driveHTML = '';
    if(!files.length){
      driveHTML = '<div class="brief-empty">No recent files</div>';
    } else {
      files.forEach(function(f){
        var ext = (f.mimeType||'').indexOf('spreadsheet')!==-1?'Sheet':
                  (f.mimeType||'').indexOf('document')!==-1?'Doc':
                  (f.mimeType||'').indexOf('presentation')!==-1?'Slides':
                  (f.mimeType||'').indexOf('pdf')!==-1?'PDF':'File';
        var onClick = f.webViewLink ? ' onclick="window.open('+JSON.stringify(f.webViewLink)+',\'_blank\')" class="brief-item clickable"' : ' class="brief-item"';
        driveHTML += '<div'+onClick+'>'+
          '<div class="brief-dot" style="background:var(--green-dim)"></div>'+
          '<div style="min-width:0;flex:1">'+
            '<div class="brief-title">'+esc(f.name)+'</div>'+
            '<div class="brief-sub">'+ext+'</div>'+
          '</div>'+
        '</div>';
      });
    }

    mount.innerHTML =
      '<div class="brief-grid">'+
        '<div class="brief-panel">'+
          '<div class="brief-head">'+calSvg+'<span class="brief-head-title">Today\'s Calendar</span></div>'+
          calHTML+
        '</div>'+
        '<div class="brief-panel">'+
          '<div class="brief-head">'+gmailSvg+'<span class="brief-head-title">Unread Gmail</span></div>'+
          gmailHTML+
        '</div>'+
        '<div class="brief-panel">'+
          '<div class="brief-head">'+driveSvg+'<span class="brief-head-title">Recent Drive</span></div>'+
          driveHTML+
        '</div>'+
      '</div>';
  }

  function renderBriefDisconnected(mount, expired){
    var label = expired ? 'Reconnect Google' : 'Connect Google';
    var subtitle = expired
      ? 'Your Google session expired. Reconnect to restore the Daily Brief.'
      : 'Connect Google Workspace to see today\'s calendar, unread emails, and recent Drive files.';
    mount.innerHTML =
      '<div class="brief-connect-bar">'+
        '<div>'+
          '<div style="font-size:13.5px;font-weight:600;margin-bottom:3px">Daily Brief'+
            (expired?' <span style="font-family:var(--mono);font-size:10px;color:var(--amber);font-weight:400">&mdash; session expired</span>':'')+
          '</div>'+
          '<div style="font-size:12px;color:var(--muted-2)">'+subtitle+'</div>'+
        '</div>'+
        '<button class="g-btn" onclick="nsGoogleConnect()">'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'+
          label+
        '</button>'+
      '</div>';
  }

  // Load brief + KPIs + pipeline preview on initial dash view
  loadDailyBrief();
  renderDashKPIs();
  renderDashPipeline();

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

  // Convert simple markdown to safe HTML (bold, italic, code, lists)
  function mdToHtml(raw){
    var s = esc(String(raw||''));
    // Bold **text**
    s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    // Italic *text*
    s = s.replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
    // Inline code `code`
    s = s.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    // Build output line by line to handle bullet lists
    var lines = s.split('\n');
    var out = []; var inList = false;
    lines.forEach(function(line){
      var bullet  = line.match(/^[\*\-]\s+([\s\S]+)/);
      var numbered= line.match(/^\d+\.\s+([\s\S]+)/);
      if(bullet || numbered){
        if(!inList){ out.push('<ul style="margin:4px 0 4px 16px;padding:0">'); inList=true; }
        out.push('<li style="margin:2px 0">'+(bullet?bullet[1]:numbered[1])+'</li>');
      } else {
        if(inList){ out.push('</ul>'); inList=false; }
        out.push(line===''?'<br>':line+'<br>');
      }
    });
    if(inList) out.push('</ul>');
    // Trim trailing <br> tags
    var result = out.join('').replace(/(<br>)+$/, '');
    return result;
  }

  function aiAppendMsg(role, text){
    var msgs=$("#aiMessages"); if(!msgs) return;
    var div=document.createElement('div');
    div.className='ai-msg '+role;
    var label=role==='user'?'You':'AI';
    div.innerHTML=
      '<div class="ai-avatar">'+label+'</div>'+
      '<div class="ai-bubble">'+(role==='ai'?mdToHtml(text):esc(text))+'</div>';
    msgs.appendChild(div);
    msgs.scrollTop=msgs.scrollHeight;
    return div;
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
    var url='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
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

  // ============================================================
  // DEMO MODE + GUIDED TOUR
  // ============================================================
  var NS_DEMO_KEY = 'ns_demo_v1';
  var _tourStep   = 0;

  var DEMO_DEALS = [
    {
      id:'demo_1', co:'Vertex Analytics', persona:'Neocloud', stage:'nego', amt:'$240K',
      notes:'Key contact: David Park (CTO). Contract under legal review — targeting signature by Aug 31. Board demo locked for Dec.',
      scorecardNotes:'Scorecard Score: 26 / 30\n\nBudget: $200–250K confirmed via CFO email. Within our range.\nAuthority: CTO is sole decision-maker. No procurement gate.\nNeed: 4× H100 SXM5 cluster for LLM fine-tuning. Current Azure setup is VRAM-capped on 70B model runs.\nTimeline: Q4 deployment locked. Urgency is real.\n\nFit: Strong — classic Neocloud buyer. High urgency, budget confirmed, champion is the decision-maker.',
      scorecardSavedAt:'2026-07-15T14:22:00.000Z', scorecardExtra:'Ask about multi-year extension on first renewal call.',
      quoteNotes:'Config: 4× H100 SXM5 80GB | NVLink fabric | DGX-compatible OS stack\nTerm: 24 months | ARR: $240,000\nDownpayment: 30% ($72K) due on signature\nSLA: 99.9% uptime, 4-hr hardware response\nCustom requirements: Dedicated VLAN, SOC 2 Type II attestation',
      configSavedAt:'2026-07-22T09:15:00.000Z', quoteExtra:'Legal reviewing indemnity clause — expect sign-off by end of week.',
      dateAdded:'2026-07-01'
    },
    {
      id:'demo_2', co:'Cascade Systems', persona:'Enterprise', stage:'quote', amt:'$180K',
      notes:'CFO wants revised pricing before sign-off. Champion: Rachel Torres (VP Infra). Next call Thu 2pm. Consider 5% discount.',
      scorecardNotes:'Scorecard Score: 22 / 30\n\nBudget: $150–200K approved by IT board. On the lower end.\nAuthority: VP Infra + CFO dual sign-off. Procurement adds 2–3 weeks.\nNeed: Mixed workload — 60% inference, 40% dev cluster access.\nTimeline: 90-day eval window closes Sep 15. Some urgency.\n\nFit: Good — procurement friction but champion is strong. Close-able with right pricing move.',
      scorecardSavedAt:'2026-07-28T11:00:00.000Z', scorecardExtra:'',
      quoteNotes:'Config: 2× H100 SXM5 + 4× A100 80GB | Hybrid burst model\nTerm: 12 months | ARR: $180,000 | Downpayment: 20% ($36K)\nPOC cluster: 2-week free access pre-contract\nFlexible start date: Oct 1 or Nov 1',
      configSavedAt:'2026-08-01T16:30:00.000Z', quoteExtra:'May need a 5% discount to get CFO sign-off — flagged to manager.',
      dateAdded:'2026-07-10'
    },
    {
      id:'demo_3', co:'Meridian Health', persona:'Sovereign', stage:'qual', amt:'$95K',
      notes:'HIPAA-compliant infra required. Looped in legal re: BAA. IT Director is compliance-first. Slow cycle — keep warm.',
      scorecardNotes:'Scorecard Score: 18 / 30\n\nBudget: $80–120K under board review. Not yet approved.\nAuthority: IT Director + CIO approval chain. Long procurement cycle.\nNeed: GPU infra for radiology imaging AI models. Compliance is top priority.\nTimeline: 6–12 months realistic. No urgency pressure.\n\nFit: Moderate — high compliance burden, long sales cycle. Nurture.',
      scorecardSavedAt:'2026-08-10T10:00:00.000Z', scorecardExtra:'',
      quoteNotes:'', configSavedAt:null, quoteExtra:'',
      dateAdded:'2026-07-25'
    },
    {
      id:'demo_4', co:'Apex Robotics', persona:'Neocloud', stage:'disc', amt:'$320K',
      notes:'Inbound from LinkedIn — CTO reached out directly. Building AV perception stack. Massive VRAM demand. First call next week.',
      scorecardNotes:'', scorecardSavedAt:null, scorecardExtra:'',
      quoteNotes:'', configSavedAt:null, quoteExtra:'',
      dateAdded:'2026-08-18'
    },
    {
      id:'demo_5', co:'Silverpeak Capital', persona:'Frontier Lab', stage:'won', amt:'$150K',
      notes:'Closed June 28. Deployed and live. Strong reference account — ask for intro to portfolio companies. Renewal talk in 10 months.',
      scorecardNotes:'Scorecard Score: 28 / 30\n\nQuick close — inbound from VC partner referral. Budget pre-approved. CTO has full authority. Immediate timeline for quant trading model infrastructure.',
      scorecardSavedAt:'2026-06-15T08:00:00.000Z', scorecardExtra:'',
      quoteNotes:'Config: 2× H100 SXM5 80GB | 12-month term | $150,000 ARR\nSigned: June 28, 2026 | Downpayment: 50% ($75K) wired on signature.',
      configSavedAt:'2026-06-20T14:00:00.000Z', quoteExtra:'',
      dateAdded:'2026-06-05'
    },
    {
      id:'demo_6', co:'Northbay Media', persona:'Enterprise', stage:'disc', amt:'$65K',
      notes:'Video transcoding + AI content moderation pipeline. Early-stage. Budget TBD — founder-led, no formal procurement yet.',
      scorecardNotes:'', scorecardSavedAt:null, scorecardExtra:'',
      quoteNotes:'', configSavedAt:null, quoteExtra:'',
      dateAdded:'2026-08-20'
    }
  ];

  var DEMO_TASKS = [
    {id:'dt1', text:'Follow up with Vertex Analytics on contract redlines', meta:'Negotiation \u00b7 Due today', done:false},
    {id:'dt2', text:'Send Cascade revised pricing deck to Rachel Torres', meta:'Quote \u00b7 Thu 2pm call', done:false},
    {id:'dt3', text:'Prep discovery brief for Apex Robotics first call', meta:'New account \u00b7 Next week', done:false}
  ];

  var TOUR_STEPS = [
    {
      title:"Welcome to Jordan's Rep Desk",
      body:"You're in demo mode as Jordan Mitchell, AE — a $770K active pipeline with deals at every stage. Let's take a quick tour.",
      nav:'dash', closeDeal:false, openDeal:null
    },
    {
      title:"Dashboard — Command Center",
      body:"KPIs at a glance: open pipeline, weighted value, quotes pending. Tasks and one-tap tool shortcuts live below.",
      nav:null, closeDeal:false, openDeal:null
    },
    {
      title:"Pipeline Kanban",
      body:"6 deals across all stages — Discovery through Closed Won. Drag cards between columns to advance a deal. Click any card for details.",
      nav:'pipeline', closeDeal:false, openDeal:null
    },
    {
      title:"Deal Detail — Scorecard & Config",
      body:"Vertex Analytics has a saved Scorecard (26/30) and a full GPU Config attached. All deal context in one place.",
      nav:null, closeDeal:false, openDeal:'demo_1'
    },
    {
      title:"Discovery & Scoring Tool",
      body:"Score new prospects across 10 scoring dimensions. Hit 'Save to Deal' in the toolbar to attach results to any pipeline deal.",
      nav:'discovery', closeDeal:true, openDeal:null
    },
    {
      title:"Deal Configurator",
      body:"Build GPU cluster configurations with pricing tiers, terms, and downpayment. Results feed directly into the Quote Builder.",
      nav:'configurator', closeDeal:false, openDeal:null
    },
    {
      title:"Ready to Get Started?",
      body:"That's the Rep Desk. Create your account to build your real pipeline, score your own deals, and configure live quotes.",
      nav:'dash', closeDeal:false, openDeal:null
    }
  ];

  window.nsLoadDemo = function(){
    // Demo data lives exclusively in sessionStorage — real localStorage is never touched
    sessionStorage.setItem(NS_DEMO_KEY, '1');
    sessionStorage.setItem('ns_demo_pipeline', JSON.stringify(DEMO_DEALS));
    sessionStorage.setItem('ns_demo_tasks', JSON.stringify(DEMO_TASKS));
    // Set demo rep name (DOM only, not in localStorage)
    var rn = document.getElementById('repName'), ri = document.getElementById('repInit');
    if(rn) rn.textContent = 'Jordan Mitchell';
    if(ri) ri.textContent = 'JM';
    // Hide login overlay
    var ov = document.getElementById('loginOverlay');
    if(ov){ ov.style.opacity='0'; setTimeout(function(){ ov.style.display='none'; ov.style.opacity='1'; },250); }
    // Show demo banner
    var banner = document.getElementById('nsDemoBanner');
    if(banner) banner.style.display = 'flex';
    // Navigate to dashboard and start tour
    show('dash');
    setTimeout(function(){ startTour(0); }, 500);
  };

  window.nsExitDemo = function(){
    // Clean up demo session data — real localStorage was never modified
    sessionStorage.removeItem(NS_DEMO_KEY);
    sessionStorage.removeItem('ns_demo_pipeline');
    sessionStorage.removeItem('ns_demo_tasks');
    // Hide banner + tour + deal detail
    var banner = document.getElementById('nsDemoBanner');
    if(banner) banner.style.display = 'none';
    closeTour();
    closeDetail();
    // Restore real rep name (or blank)
    var realName = localStorage.getItem(NS_NAME_KEY);
    if(realName){ nsApplyRepName(realName); }
    else {
      var rn = document.getElementById('repName'), ri = document.getElementById('repInit');
      if(rn) rn.textContent = 'Account Exec';
      if(ri) ri.textContent = 'AE';
    }
    // Show login screen
    nsShowLogin();
  };

  // Intercept logout during demo so it also cleans up demo data
  (function(){
    var _origLogout = window.nsLogout;
    window.nsLogout = function(){
      if(sessionStorage.getItem(NS_DEMO_KEY)){ window.nsExitDemo(); }
      else { _origLogout(); }
    };
  })();

  function startTour(stepIdx){
    _tourStep = stepIdx;
    var panel = document.getElementById('nsTour');
    if(panel) panel.style.display = 'block';
    renderTourStep();
  }

  function renderTourStep(){
    var step  = TOUR_STEPS[_tourStep]; if(!step) return;
    var total = TOUR_STEPS.length;
    // Navigate / open deal
    if(step.closeDeal) closeDetail();
    if(step.openDeal){
      var d = loadDeals().find(function(x){ return x.id === step.openDeal; });
      if(d){ setTimeout(function(){ openDealDetail(d.id); }, 120); }
    } else if(step.nav){
      show(step.nav);
    }
    // Update tour card UI
    var titleEl  = document.getElementById('tourTitle');
    var bodyEl   = document.getElementById('tourBody');
    var stepEl   = document.getElementById('tourStep');
    var fillEl   = document.getElementById('tourProgress');
    var nextBtn  = document.getElementById('tourNextBtn');
    if(titleEl) titleEl.textContent = step.title;
    if(bodyEl)  bodyEl.textContent  = step.body;
    if(stepEl)  stepEl.textContent  = (_tourStep+1) + ' / ' + total;
    if(fillEl)  fillEl.style.width  = ((_tourStep+1) / total * 100) + '%';
    if(nextBtn) nextBtn.textContent = (_tourStep === total-1) ? 'Done \u2713' : 'Next \u2192';
  }

  window.nsTourNext = function(){
    if(_tourStep >= TOUR_STEPS.length - 1){ closeTour(); return; }
    _tourStep++;
    renderTourStep();
  };

  function closeTour(){
    var panel = document.getElementById('nsTour');
    if(panel) panel.style.display = 'none';
  }
  window.nsTourClose = closeTour;

  window.NS_show=show;
})();
