
const stores = [
  {id:"cpt01",name:"Canal Walk",region:"Western Cape",expected:46,present:44,late:2,absent:2,passby:14280,entries:746,conversion:31,basket:910,lateOpen:18,offline:0,devices:{attendance:"online",counter:"online",cctv:"online"}},
  {id:"cpt02",name:"V&A Waterfront",region:"Western Cape",expected:51,present:50,late:1,absent:1,passby:19840,entries:1065,conversion:34,basket:1180,lateOpen:0,offline:0,devices:{attendance:"online",counter:"online",cctv:"online"}},
  {id:"cpt03",name:"Cavendish Square",region:"Western Cape",expected:38,present:35,late:3,absent:3,passby:10480,entries:472,conversion:27,basket:830,lateOpen:27,offline:1,devices:{attendance:"online",counter:"warning",cctv:"online"}},
  {id:"gpt01",name:"Sandton City",region:"Gauteng",expected:62,present:59,late:2,absent:3,passby:23860,entries:1248,conversion:36,basket:1260,lateOpen:12,offline:0,devices:{attendance:"online",counter:"online",cctv:"online"}},
  {id:"gpt02",name:"Mall of Africa",region:"Gauteng",expected:58,present:54,late:4,absent:4,passby:21540,entries:1118,conversion:33,basket:1100,lateOpen:34,offline:1,devices:{attendance:"warning",counter:"online",cctv:"online"}},
  {id:"gpt03",name:"Eastgate",region:"Gauteng",expected:44,present:39,late:5,absent:5,passby:15120,entries:625,conversion:25,basket:790,lateOpen:41,offline:2,devices:{attendance:"warning",counter:"offline",cctv:"online"}},
  {id:"kzn01",name:"Gateway",region:"KwaZulu-Natal",expected:55,present:52,late:2,absent:3,passby:18420,entries:954,conversion:32,basket:970,lateOpen:8,offline:0,devices:{attendance:"online",counter:"online",cctv:"online"}},
  {id:"kzn02",name:"Pavilion",region:"KwaZulu-Natal",expected:40,present:37,late:3,absent:3,passby:12680,entries:522,conversion:26,basket:760,lateOpen:22,offline:1,devices:{attendance:"online",counter:"warning",cctv:"online"}},
  {id:"ec01",name:"Hemingways",region:"Eastern Cape",expected:31,present:29,late:1,absent:2,passby:8240,entries:378,conversion:29,basket:720,lateOpen:0,offline:0,devices:{attendance:"online",counter:"online",cctv:"online"}},
  {id:"fs01",name:"Mimosa Mall",region:"Free State",expected:28,present:25,late:2,absent:3,passby:7180,entries:287,conversion:24,basket:690,lateOpen:31,offline:1,devices:{attendance:"offline",counter:"online",cctv:"online"}}
];

const state = {
  view:"overview", region:"all", store:"all", period:1, sort:{key:"opportunity",dir:"desc"},
  search:"", risk:"all", attendanceThreshold:0, captureDesc:true, deviceFilter:"all", pinnedHour:null
};

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("en-ZA");
const money = n => "R" + Math.round(n).toLocaleString("en-ZA");
const pct = n => (Math.round(n*10)/10).toFixed(1) + "%";
const clamp = (n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const periodLabel = () => state.period===1?"Today":state.period===7?"Last 7 days":"Last 30 days";
const periodFactor = () => state.period===1?1:state.period===7?6.4:27.2;

function captureRate(s){ return s.passby ? s.entries/s.passby*100 : 0; }
function attendanceRate(s){ return s.expected ? s.present/s.expected*100 : 0; }
function storeOpportunity(s){
  if(!s.lateOpen) return 0;
  const lateWindowShare = clamp(s.lateOpen/600, .015, .12);
  const passers = s.passby * lateWindowShare;
  return passers * (captureRate(s)/100) * (s.conversion/100) * s.basket;
}
function statusFor(s){ return attendanceRate(s)<92 || s.lateOpen>=30 || s.offline>0 ? "attention" : "healthy"; }

function filteredStores(){
  return stores.filter(s => (state.region==="all" || s.region===state.region) && (state.store==="all" || s.id===state.store));
}
function scaled(s){
  const f=periodFactor();
  return {...s, expected:s.expected*f, present:s.present*f, late:s.late*f, absent:s.absent*f, passby:s.passby*f, entries:s.entries*f};
}
function totals(list=filteredStores()){
  const f=periodFactor(), base=list;
  const sum=k=>base.reduce((a,s)=>a+s[k],0)*f;
  const expected=sum("expected"),present=sum("present"),late=sum("late"),absent=sum("absent"),passby=sum("passby"),entries=sum("entries");
  const opp=base.reduce((a,s)=>a+storeOpportunity(s),0)*f;
  const avgConv=base.length?base.reduce((a,s)=>a+s.conversion,0)/base.length:0;
  const offline=base.reduce((a,s)=>a+s.offline,0);
  const lateStores=base.filter(s=>s.lateOpen>0).length;
  const avgDelay=lateStores?base.filter(s=>s.lateOpen>0).reduce((a,s)=>a+s.lateOpen,0)/lateStores:0;
  return {expected,present,late,absent,passby,entries,opp,avgConv,offline,lateStores,avgDelay};
}

function populateFilters(){
  const regions=[...new Set(stores.map(s=>s.region))].sort();
  $("regionFilter").innerHTML='<option value="all">All regions</option>'+regions.map(r=>'<option>'+r+'</option>').join("");
  updateStoreOptions();
}
function updateStoreOptions(){
  const options=stores.filter(s=>state.region==="all"||s.region===state.region);
  $("storeFilter").innerHTML='<option value="all">All stores</option>'+options.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join("");
  if(!options.some(s=>s.id===state.store)) state.store="all";
  $("storeFilter").value=state.store;
}
function updateContext(){
  const region=state.region==="all"?"All regions":state.region;
  const store=state.store==="all"?"All stores":stores.find(s=>s.id===state.store)?.name||"All stores";
  $("filterContext").textContent=region+" · "+store+" · "+periodLabel();
}

function hourlySeries(list=filteredStores()){
  const total=totals(list);
  const hours=["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
  const shape=[.06,.09,.11,.13,.15,.14,.13,.11,.08];
  return hours.map((h,i)=>({hour:h,passby:total.passby*shape[i],entries:total.entries*shape[i]*(i===4?1.08:i===0?.88:1)}));
}

function renderOverview(){
  const t=totals();
  const ar=t.expected?t.present/t.expected*100:0, cap=t.passby?t.entries/t.passby*100:0;
  $("ovAttendance").textContent=pct(ar); $("ovAttendanceSub").textContent=fmt(t.present)+" present of "+fmt(t.expected);
  $("ovLate").textContent=fmt(t.late); $("ovLateSub").textContent=pct(t.expected?t.late/t.expected*100:0)+" of scheduled";
  $("ovEntries").textContent=fmt(t.entries); $("ovCapture").textContent=pct(cap)+" capture";
  $("ovOpportunity").textContent=money(t.opp); $("ovOpportunitySub").textContent=t.lateStores+" late-opening store"+(t.lateStores===1?"":"s");
  $("ovOffline").textContent=fmt(t.offline); $("ovOfflineSub").textContent=t.offline?"Requires review":"All sources healthy";
  $("ovImpactBig").textContent=money(t.opp); $("ovLateStores").textContent=t.lateStores; $("ovAvgDelay").textContent=Math.round(t.avgDelay)+" min";
  const possible=t.opp/Math.max(1,filteredStores().reduce((a,s)=>a+s.basket,0)/Math.max(filteredStores().length,1));
  $("ovPossibleSales").textContent=fmt(possible);

  const series=hourlySeries(), max=Math.max(...series.map(x=>x.passby),1), peak=series.reduce((a,b)=>b.entries>a.entries?b:a,series[0]||{hour:"—"});
  $("trafficPeak").textContent="Peak "+peak.hour;
  $("trafficChart").innerHTML=series.map(x=>{
    const p=x.passby/max*100,e=x.entries/max*100*5.5;
    return '<div class="bar-group" tabindex="0"><div class="bar-tooltip"><b>'+x.hour+'</b><br>Pass-by '+fmt(x.passby)+'<br>Entries '+fmt(x.entries)+'<br>Capture '+pct(x.passby?x.entries/x.passby*100:0)+'</div><button class="pass" style="height:'+Math.max(5,p)+'%" aria-label="'+x.hour+' pass-by"></button><button class="entry" style="height:'+Math.max(5,e)+'%" aria-label="'+x.hour+' entries"></button><label>'+x.hour.slice(0,2)+'</label></div>';
  }).join("");
  renderOverviewTable();
}
function renderOverviewTable(){
  let rows=filteredStores().filter(s=>(s.name+" "+s.region).toLowerCase().includes(state.search.toLowerCase()));
  if(state.risk!=="all") rows=rows.filter(s=>statusFor(s)===state.risk);
  rows=[...rows].sort((a,b)=>{
    let av,bv; const k=state.sort.key;
    if(k==="attendance"){av=attendanceRate(a);bv=attendanceRate(b)}
    else if(k==="capture"){av=captureRate(a);bv=captureRate(b)}
    else if(k==="opportunity"){av=storeOpportunity(a);bv=storeOpportunity(b)}
    else {av=a[k];bv=b[k]}
    if(typeof av==="string") return state.sort.dir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
    return state.sort.dir==="asc"?av-bv:bv-av;
  });
  $("overviewRows").innerHTML=rows.map(s=>{
    const f=periodFactor(),st=statusFor(s);
    return '<tr class="clickable" data-store="'+s.id+'"><td><span class="store-title">'+s.name+'</span><span class="store-sub">'+s.region+'</span></td><td>'+pct(attendanceRate(s))+'</td><td>'+fmt(s.late*f)+'</td><td>'+fmt(s.entries*f)+'</td><td>'+pct(captureRate(s))+'</td><td>'+money(storeOpportunity(s)*f)+'</td><td><span class="status-pill '+st+'">'+(st==="healthy"?"Healthy":"Needs attention")+'</span></td></tr>';
  }).join("") || '<tr><td colspan="7">No stores match the current filters.</td></tr>';
  document.querySelectorAll("#overviewRows tr[data-store]").forEach(tr=>tr.addEventListener("click",()=>focusStore(tr.dataset.store)));
}

function renderAttendance(){
  const t=totals(), rate=t.expected?t.present/t.expected*100:0;
  $("atExpected").textContent=fmt(t.expected); $("atPresent").textContent=fmt(t.present); $("atPresentSub").textContent=pct(rate);
  $("atLate").textContent=fmt(t.late); $("atLateSub").textContent=pct(t.expected?t.late/t.expected*100:0);
  $("atAbsent").textContent=fmt(t.absent); $("atAbsentSub").textContent=pct(t.expected?t.absent/t.expected*100:0);
  $("atLateStores").textContent=t.lateStores;
  let rows=filteredStores().filter(s=>!state.attendanceThreshold || attendanceRate(s)<state.attendanceThreshold).sort((a,b)=>attendanceRate(a)-attendanceRate(b));
  $("attendanceBars").innerHTML=rows.map(s=>'<div class="rank-row"><span>'+s.name+'</span><div class="rank-track"><div class="rank-fill" style="width:'+attendanceRate(s)+'%"></div></div><strong>'+pct(attendanceRate(s))+'</strong></div>').join("")||'<p class="kpi-foot">No branches fall below this threshold.</p>';
  const minor=Math.round(t.late*.46),medium=Math.round(t.late*.34),major=Math.max(0,Math.round(t.late)-minor-medium);
  $("lateDonutValue").textContent=fmt(t.late);$("lateMinor").textContent=fmt(minor);$("lateMedium").textContent=fmt(medium);$("lateMajor").textContent=fmt(major);
  const totalLate=Math.max(1,minor+medium+major),a=minor/totalLate*100,b=(minor+medium)/totalLate*100;
  $("lateDonut").style.background='conic-gradient(var(--green) 0 '+a+'%,var(--yellow) '+a+'% '+b+'%,var(--red) '+b+'% 100%)';
  const exc=filteredStores().filter(s=>statusFor(s)==="attention");
  $("attendanceExceptionCount").textContent=exc.length+" exception"+(exc.length===1?"":"s");
  $("attendanceRows").innerHTML=exc.map(s=>'<tr class="clickable" data-store="'+s.id+'"><td><span class="store-title">'+s.name+'</span><span class="store-sub">'+s.region+'</span></td><td>'+fmt(s.expected*periodFactor())+'</td><td>'+fmt(s.present*periodFactor())+'</td><td>'+fmt(s.late*periodFactor())+'</td><td>'+fmt(s.absent*periodFactor())+'</td><td>'+pct(attendanceRate(s))+'</td><td>'+(s.lateOpen?'<span class="status-pill attention">'+s.lateOpen+' min late</span>':'<span class="status-pill healthy">On time</span>')+'</td></tr>').join("")||'<tr><td colspan="7">No attendance exceptions in this view.</td></tr>';
  document.querySelectorAll("#attendanceRows tr[data-store]").forEach(tr=>tr.addEventListener("click",()=>focusStore(tr.dataset.store)));
}

function renderFootfall(){
  const t=totals(), cap=t.passby?t.entries/t.passby*100:0,buyers=t.entries*(t.avgConv/100);
  $("ffPassby").textContent=fmt(t.passby);$("ffEntries").textContent=fmt(t.entries);$("ffCapture").textContent=pct(cap);$("ffBuyers").textContent=fmt(buyers);$("ffOffline").textContent=fmt(filteredStores().filter(s=>s.devices.counter!=="online").length);
  const series=hourlySeries(), max=Math.max(...series.map(x=>x.entries),1);
  $("footfallChart").innerHTML=series.map((x,i)=>'<div class="hour-card"><button data-hour="'+i+'" class="'+(state.pinnedHour===i?"active":"")+'" style="height:'+Math.max(6,x.entries/max*100)+'%"><span class="hour-tip">'+x.hour+' · '+fmt(x.entries)+' entries</span></button><label>'+x.hour.slice(0,2)+'</label></div>').join("");
  document.querySelectorAll("#footfallChart button").forEach(btn=>btn.addEventListener("click",()=>{state.pinnedHour=Number(btn.dataset.hour);$("footfallPinned").textContent=series[state.pinnedHour].hour+" · "+fmt(series[state.pinnedHour].entries)+" entries";renderFootfall()}));
  $("funnelPassVal").textContent=fmt(t.passby);$("funnelEntryVal").textContent=fmt(t.entries);$("funnelBuyerVal").textContent=fmt(buyers);
  $("funnelPass").style.width="100%";$("funnelEntry").style.width=Math.max(3,cap*4)+"%";$("funnelBuyer").style.width=Math.max(2,cap*(t.avgConv/100)*4)+"%";
  let rows=[...filteredStores()].sort((a,b)=>state.captureDesc?captureRate(b)-captureRate(a):captureRate(a)-captureRate(b));
  $("footfallRows").innerHTML=rows.map(s=>'<tr class="clickable" data-store="'+s.id+'"><td><span class="store-title">'+s.name+'</span><span class="store-sub">'+s.region+'</span></td><td>'+fmt(s.passby*periodFactor())+'</td><td>'+fmt(s.entries*periodFactor())+'</td><td>'+pct(captureRate(s))+'</td><td>'+s.conversion+'%</td><td>'+money(s.basket)+'</td><td><span class="status-pill '+(captureRate(s)>=4.5?"healthy":"attention")+'">'+(captureRate(s)>=4.5?"Strong":"Review")+'</span></td></tr>').join("");
  document.querySelectorAll("#footfallRows tr[data-store]").forEach(tr=>tr.addEventListener("click",()=>focusStore(tr.dataset.store)));
}

function loadStoreModel(){
  const list=filteredStores(), s=list.length===1?list[0]:null, t=totals(list);
  const delay=s?s.lateOpen:Math.round(t.avgDelay)||35;
  const cap=s?captureRate(s):(t.passby?t.entries/t.passby*100:4.8);
  const conv=s?s.conversion:t.avgConv||28;
  const basket=s?s.basket:Math.round(list.reduce((a,x)=>a+x.basket,0)/Math.max(1,list.length))||850;
  const windowPassers=s?Math.round(s.passby*clamp(delay/600,.015,.12)):Math.max(100,Math.round(t.passby*Math.max(delay,20)/600/Math.max(list.length,1)));
  $("scheduled").value="09:00"; const h=9+Math.floor(delay/60),m=delay%60;$("actual").value=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
  $("passers").value=windowPassers;$("capture").value=cap.toFixed(1);$("captureRange").value=clamp(cap,0,30);$("conversion").value=Math.round(conv);$("conversionRange").value=Math.round(conv);$("basket").value=basket;
  $("modelStoreName").textContent=s?s.name:"Selected network"; setScenarioActive("baseline"); calculateModel();
}
function minutes(t){const [h,m]=(t||"00:00").split(":").map(Number);return h*60+m}
function calculateModel(source){
  if(source==="captureRange")$("capture").value=$("captureRange").value;if(source==="capture")$("captureRange").value=clamp($("capture").value,0,30);
  if(source==="conversionRange")$("conversion").value=$("conversionRange").value;if(source==="conversion")$("conversionRange").value=clamp($("conversion").value,0,100);
  const late=Math.max(0,minutes($("actual").value)-minutes($("scheduled").value));
  const passers=clamp($("passers").value,0,10000000),cap=clamp($("capture").value,0,30)/100,conv=clamp($("conversion").value,0,100)/100,basket=clamp($("basket").value,0,1000000);
  const entrants=passers*cap,sales=entrants*conv,value=sales*basket;
  $("lateBadge").textContent=late+" min late";$("resultBig").textContent=money(value);$("likelyEntrants").textContent=entrants.toFixed(1);$("possibleSales").textContent=sales.toFixed(1);$("valuePerMinute").textContent=money(late?value/late:0);
  $("resultNarrative").textContent="At these assumptions, the late window could represent roughly "+Math.round(sales)+" missed transactions.";
}
function setScenarioActive(name){document.querySelectorAll(".scenario-btn").forEach(b=>b.classList.toggle("active",b.dataset.scenario===name))}
function applyScenario(name){
  const baseCap=Number($("capture").value)||4.8,baseConv=Number($("conversion").value)||28;
  const mult=name==="conservative"?.75:name==="ambitious"?1.25:1;
  $("capture").value=(baseCap*mult).toFixed(1);$("captureRange").value=clamp(baseCap*mult,0,30);$("conversion").value=Math.round(baseConv*mult);$("conversionRange").value=clamp(baseConv*mult,0,100);setScenarioActive(name);calculateModel();
}

function renderDevices(){
  const list=filteredStores(), rows=[];
  list.forEach(s=>{
    [["Attendance terminal","attendance"],["People counter","counter"],["CCTV analytics","cctv"]].forEach(([name,key],idx)=>{
      const status=s.devices[key]; rows.push({store:s,device:name,status,last:status==="online"?"Just now":status==="warning"?(8+idx*3)+" min ago":"47 min ago",fresh:status==="online"?"Live":status==="warning"?"Delayed":"No feed"});
    });
  });
  const filtered=rows.filter(r=>state.deviceFilter==="all"||r.status===state.deviceFilter);
  const online=rows.filter(r=>r.status==="online").length,total=rows.length;
  const countType=k=>list.filter(s=>s.devices[k]==="online").length;
  $("dvAttendance").textContent=countType("attendance")+" / "+list.length;$("dvCounters").textContent=countType("counter")+" / "+list.length;$("dvCctv").textContent=countType("cctv")+" / "+list.length;$("dvUptime").textContent=pct(total?online/total*100:0);$("dvAttention").textContent=rows.filter(r=>r.status!=="online").length;
  $("deviceRows").innerHTML=filtered.map(r=>'<tr><td><span class="store-title">'+r.store.name+'</span><span class="store-sub">'+r.store.region+'</span></td><td>'+r.device+'</td><td><span class="status-pill '+r.status+'">'+(r.status==="online"?"Online":r.status==="warning"?"Delayed":"Offline")+'</span></td><td>'+r.last+'</td><td>'+r.fresh+'</td><td><button class="mini-link" data-device-store="'+r.store.id+'">View store</button></td></tr>').join("")||'<tr><td colspan="6">No devices match this status.</td></tr>';
  document.querySelectorAll("[data-device-store]").forEach(b=>b.addEventListener("click",()=>focusStore(b.dataset.deviceStore)));
}

function renderAll(){
  updateContext();renderOverview();renderAttendance();renderFootfall();renderDevices();
  if(state.view==="opportunity" && !$("resultBig").dataset.loaded){loadStoreModel();$("resultBig").dataset.loaded="1";}
}

const titles={
  overview:["National Retail Overview","Attendance, customer traffic and commercial opportunity in one live-style view."],
  attendance:["Time & Attendance","Explore staffing compliance, late arrivals, absence and store-opening readiness."],
  footfall:["People Counting & Footfall","Compare pass-by traffic, customer entry, capture and estimated conversion."],
  opportunity:["Revenue Opportunity","Test how delayed opening may translate into commercial opportunity."],
  devices:["Device Health","Separate real operating exceptions from offline or delayed data sources."]
};
function navigate(view){
  state.view=view;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("view-"+view).classList.add("active");$("pageTitle").textContent=titles[view][0];$("pageSub").textContent=titles[view][1];
  if(view==="opportunity") loadStoreModel(); if(innerWidth<721)scrollTo({top:0,behavior:"smooth"});
}
function focusStore(id){
  const s=stores.find(x=>x.id===id);if(!s)return;state.region=s.region;state.store=id;$("regionFilter").value=state.region;updateStoreOptions();$("storeFilter").value=id;renderAll();toast("Dashboard focused on "+s.name);
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2200)}
function exportCSV(){
  const rows=filteredStores().map(s=>[s.name,s.region,attendanceRate(s).toFixed(1),s.late*periodFactor(),s.passby*periodFactor(),s.entries*periodFactor(),captureRate(s).toFixed(2),Math.round(storeOpportunity(s)*periodFactor())]);
  const csv=[["Store","Region","Attendance %","Late","Pass-by","Entries","Capture %","Opportunity R"],...rows].map(r=>r.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="maxim-retail-"+Date.now()+".csv";a.click();URL.revokeObjectURL(url);toast("CSV exported");
}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
document.querySelector(".brand").addEventListener("click",e=>{e.preventDefault();navigate("overview")});
$("regionFilter").addEventListener("change",e=>{state.region=e.target.value;state.store="all";updateStoreOptions();renderAll()});
$("storeFilter").addEventListener("change",e=>{state.store=e.target.value;renderAll()});
$("periodFilter").addEventListener("change",e=>{state.period=Number(e.target.value);renderAll()});
$("resetFilters").addEventListener("click",()=>{state.region="all";state.store="all";state.period=1;$("regionFilter").value="all";updateStoreOptions();$("periodFilter").value="1";renderAll();toast("Filters reset")});
$("storeSearch").addEventListener("input",e=>{state.search=e.target.value;renderOverviewTable()});
$("storeRiskFilter").addEventListener("change",e=>{state.risk=e.target.value;renderOverviewTable()});
document.querySelectorAll("[data-sort]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.sort;state.sort.dir=state.sort.key===k&&state.sort.dir==="desc"?"asc":"desc";state.sort.key=k;renderOverviewTable()}));
$("attendanceThreshold").addEventListener("change",e=>{state.attendanceThreshold=Number(e.target.value);renderAttendance()});
$("captureSortBtn").addEventListener("click",()=>{state.captureDesc=!state.captureDesc;$("captureSortBtn").textContent="Sort: "+(state.captureDesc?"Highest":"Lowest")+" capture";renderFootfall()});
document.querySelectorAll("[data-device-filter]").forEach(b=>b.addEventListener("click",()=>{state.deviceFilter=b.dataset.deviceFilter;document.querySelectorAll("[data-device-filter]").forEach(x=>x.classList.toggle("active",x===b));renderDevices()}));
["scheduled","actual","passers","captureRange","capture","conversionRange","conversion","basket"].forEach(id=>$(id).addEventListener("input",()=>calculateModel(id)));
document.querySelectorAll(".scenario-btn").forEach(b=>b.addEventListener("click",()=>applyScenario(b.dataset.scenario)));
$("loadStoreModel").addEventListener("click",()=>{loadStoreModel();toast("Store assumptions reloaded")});
$("exportBtn").addEventListener("click",exportCSV);
document.querySelectorAll("[data-late-band]").forEach(b=>b.addEventListener("click",()=>toast("Late-arrival band selected: "+b.dataset.lateBand)));

populateFilters();$("regionFilter").value="all";$("storeFilter").value="all";renderAll();loadStoreModel();
