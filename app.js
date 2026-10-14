
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

const eventLabels={absence:"30+ min no-one-present",late_open:"Late store opening",device:"Device offline",traffic:"Low entry conversion"};
const eventWindows=["opening","midday","closing"];
const whatsappEvents=stores.flatMap((s,si)=>{
  const counts={absence:Math.max(0,Math.round(s.lateOpen/10)-1),late_open:s.lateOpen?1:0,device:s.offline,traffic:captureRate(s)<4.6?2:0};
  return Object.entries(counts).flatMap(([type,count])=>Array.from({length:count},(_,i)=>{
    const delivered=(si+i)%7!==0, acknowledged=delivered&&(si+i)%3!==0, escalated=!acknowledged&&((si+i)%2===0||type==="absence");
    return {id:s.id+"-"+type+"-"+i,storeId:s.id,type,window:eventWindows[(si+i)%3],triggered:1,sent:(si+i)%11!==0?1:0,delivered:delivered?1:0,acknowledged:acknowledged?1:0,escalated:escalated?1:0,duration:type==="absence"?32+((si*7+i*9)%39):0};
  }));
});

const defaultReceivers=[
  {id:"r1",name:"Store Operations Demo",phone:"+27 82 000 0101",storeId:"all",events:["absence","late_open"]},
  {id:"r2",name:"Regional Response Demo",phone:"+27 82 000 0102",storeId:"gpt03",events:["absence","device","traffic"]}
];

const state = {
  view:"overview", region:"all", store:"all", period:1, sort:{key:"opportunity",dir:"desc"},
  search:"", risk:"all", attendanceThreshold:0, captureDesc:true, deviceFilter:"all", pinnedHour:null,
  time:"all",event:"all",receivers:loadReceivers()
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
function loadReceivers(){
  try{return JSON.parse(localStorage.getItem("maxim-demo-receivers"))||defaultReceivers.map(x=>({...x,events:[...x.events]}))}catch{return defaultReceivers.map(x=>({...x,events:[...x.events]}))}
}
function saveReceivers(){localStorage.setItem("maxim-demo-receivers",JSON.stringify(state.receivers))}

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
  const event=state.event==="all"?"All WhatsApp events":eventLabels[state.event];
  const time=state.time==="all"?"All day":state.time[0].toUpperCase()+state.time.slice(1);
  $("filterContext").textContent=region+" · "+store+" · "+periodLabel()+" · "+time+" · "+event;
}

function filteredEvents(){
  const allowed=new Set(filteredStores().map(s=>s.id));
  return whatsappEvents.filter(e=>allowed.has(e.storeId)&&(state.time==="all"||e.window===state.time)&&(state.event==="all"||e.type===state.event));
}
function eventTotals(list=filteredEvents()){
  const f=periodFactor(),sum=k=>Math.round(list.reduce((a,e)=>a+e[k],0)*f);
  return {triggered:sum("triggered"),sent:sum("sent"),delivered:sum("delivered"),acknowledged:sum("acknowledged"),escalated:sum("escalated")};
}
function renderWhatsApp(){
  const events=filteredEvents(),t=eventTotals(events),rate=(a,b)=>pct(b?a/b*100:0);
  $("waTriggered").textContent=fmt(t.triggered);$("waSent").textContent=fmt(t.sent);$("waDelivered").textContent=fmt(t.delivered);$("waAcknowledged").textContent=fmt(t.acknowledged);$("waEscalated").textContent=fmt(t.escalated);
  $("waSentRate").textContent=rate(t.sent,t.triggered)+" of triggered";$("waDeliveryRate").textContent=rate(t.delivered,t.sent)+" of sent";$("waAckRate").textContent=rate(t.acknowledged,t.delivered)+" of delivered";$("waEscRate").textContent=rate(t.escalated,t.triggered)+" of triggered";
  $("waEventTotal").textContent=fmt(t.triggered)+" events";
  const byType=Object.keys(eventLabels).map(type=>({type,count:events.filter(e=>e.type===type).length*periodFactor()})),max=Math.max(1,...byType.map(x=>x.count));
  $("eventTypeChart").innerHTML=byType.map(x=>'<button class="event-row" data-event-type="'+x.type+'"><span>'+eventLabels[x.type]+'</span><div><i style="width:'+Math.max(x.count?7:0,x.count/max*100)+'%"></i></div><strong>'+fmt(x.count)+'</strong></button>').join("");
  document.querySelectorAll("[data-event-type]").forEach(b=>b.addEventListener("click",()=>{state.event=b.dataset.eventType;$("eventFilter").value=state.event;renderAll()}));
  const absence=events.filter(e=>e.type==="absence").sort((a,b)=>b.duration-a.duration).slice(0,6),aMax=Math.max(60,...absence.map(e=>e.duration));
  $("absenceChart").innerHTML=absence.length?absence.map(e=>{const s=stores.find(x=>x.id===e.storeId);return '<button data-absence-store="'+s.id+'"><span>'+s.name+'</span><div><i style="width:'+(e.duration/aMax*100)+'%"></i><b style="left:'+(30/aMax*100)+'%"></b></div><strong>'+e.duration+' min</strong></button>'}).join(""):'<p class="empty-state">No 30-minute absence alerts match these filters.</p>';
  document.querySelectorAll("[data-absence-store]").forEach(b=>b.addEventListener("click",()=>focusStore(b.dataset.absenceStore)));
  const rows=filteredStores().map(s=>{const list=events.filter(e=>e.storeId===s.id),x=eventTotals(list),top=Object.keys(eventLabels).sort((a,b)=>list.filter(e=>e.type===b).length-list.filter(e=>e.type===a).length)[0];return {s,x,top};}).filter(r=>r.x.triggered).sort((a,b)=>b.x.triggered-a.x.triggered);
  $("whatsappStoreRows").innerHTML=rows.map(({s,x,top})=>'<tr class="clickable" data-wa-store="'+s.id+'"><td><span class="store-title">'+s.name+'</span><span class="store-sub">'+s.region+'</span></td><td>'+fmt(x.triggered)+'</td><td>'+fmt(x.delivered)+'</td><td>'+fmt(x.acknowledged)+'</td><td><span class="status-pill '+(x.escalated?"offline":"healthy")+'">'+fmt(x.escalated)+'</span></td><td>'+eventLabels[top]+'</td><td>'+rate(x.acknowledged,x.delivered)+'</td></tr>').join("")||'<tr><td colspan="7">No demo events match the current filters.</td></tr>';
  document.querySelectorAll("[data-wa-store]").forEach(tr=>tr.addEventListener("click",()=>focusStore(tr.dataset.waStore)));
}

function receiverStoreName(id){return id==="all"?"All stores":stores.find(s=>s.id===id)?.name||"Unknown store"}
function clearReceiverForm(){
  $("receiverForm").reset();$("receiverId").value="";$("receiverFormTitle").textContent="Add receiver";
}
function renderReceivers(){
  $("receiverCount").textContent=state.receivers.length+" browser-local demo route"+(state.receivers.length===1?"":"s");
  $("receiverRows").innerHTML=state.receivers.map(r=>'<tr><td><span class="store-title">'+r.name+'</span><span class="store-sub">'+r.phone+'</span></td><td>'+receiverStoreName(r.storeId)+'</td><td><div class="tag-list">'+r.events.map(e=>'<span>'+eventLabels[e]+'</span>').join("")+'</div></td><td><span class="status-pill warning">Local demo only</span></td><td><div class="row-actions"><button class="mini-link" data-edit-receiver="'+r.id+'">Edit</button><button class="delete-btn" data-delete-receiver="'+r.id+'">Delete</button></div></td></tr>').join("")||'<tr><td colspan="5">No demo receiver routes saved in this browser.</td></tr>';
  document.querySelectorAll("[data-edit-receiver]").forEach(b=>b.addEventListener("click",()=>editReceiver(b.dataset.editReceiver)));
  document.querySelectorAll("[data-delete-receiver]").forEach(b=>b.addEventListener("click",()=>deleteReceiver(b.dataset.deleteReceiver)));
}
function editReceiver(id){
  const r=state.receivers.find(x=>x.id===id);if(!r)return;$("receiverId").value=r.id;$("receiverName").value=r.name;$("receiverPhone").value=r.phone;$("receiverStore").value=r.storeId;document.querySelectorAll('[name="receiverEvent"]').forEach(c=>c.checked=r.events.includes(c.value));$("receiverFormTitle").textContent="Edit receiver";$("receiverName").focus();
}
function deleteReceiver(id){state.receivers=state.receivers.filter(r=>r.id!==id);saveReceivers();renderReceivers();clearReceiverForm();toast("Demo receiver removed from this browser")}
function submitReceiver(e){
  e.preventDefault();const events=[...document.querySelectorAll('[name="receiverEvent"]:checked')].map(c=>c.value);if(!events.length){toast("Choose at least one event type");return}
  const item={id:$("receiverId").value||"r"+Date.now(),name:$("receiverName").value.trim(),phone:$("receiverPhone").value.trim(),storeId:$("receiverStore").value,events};const i=state.receivers.findIndex(r=>r.id===item.id);if(i>=0)state.receivers[i]=item;else state.receivers.push(item);saveReceivers();renderReceivers();clearReceiverForm();toast("Demo route saved locally — no message sent");
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

function renderPeopleCounting(){
  const chart=$("peopleFlowChart"); if(!chart)return;
  const series=hourlySeries(),max=Math.max(...series.map(x=>x.entries),1);
  chart.innerHTML=series.map(x=>'<div class="hour-card"><button style="height:'+Math.max(6,x.entries/max*100)+'%"><span class="hour-tip">'+x.hour+' · '+fmt(x.entries)+' people</span></button><label>'+x.hour.slice(0,2)+'</label></div>').join("");
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
  updateContext();renderWhatsApp();renderOverview();renderAttendance();renderFootfall();renderPeopleCounting();renderDevices();renderReceivers();
  if(state.view==="opportunity" && !$("resultBig").dataset.loaded){loadStoreModel();$("resultBig").dataset.loaded="1";}
}

const titles={
  overview:["Homechoice Retail Operations","WhatsApp event monitoring first, with attendance, customer traffic and store entry retained below."],
  receivers:["WhatsApp Receivers","Browser-local demo routing for recipient and event assignment. No production routing is changed."],
  attendance:["Time & Attendance","Explore staffing compliance, late arrivals, absence and store-opening readiness."],
  frontdoor:["Showroom Front Door Events","Monitor unattended entrances, after-hours openings and WhatsApp response escalation."],
  people:["People Counting","Monitor showroom occupancy, hourly flow, queues and people-counting alerts."],
  footfall:["Foot Counter","Compare pass-by traffic, customer entry, capture and estimated conversion."],
  standards:["Showroom Standards","Track showroom compliance exceptions and the WhatsApp follow-up workflow."],
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
  const rows=filteredStores().map(s=>{const w=eventTotals(filteredEvents().filter(e=>e.storeId===s.id));return [s.name,s.region,w.triggered,w.sent,w.delivered,w.acknowledged,w.escalated,attendanceRate(s).toFixed(1),s.late*periodFactor(),s.passby*periodFactor(),s.entries*periodFactor(),captureRate(s).toFixed(2),Math.round(storeOpportunity(s)*periodFactor())]});
  const csv=[["Store","Region","WhatsApp triggered","WhatsApp sent","WhatsApp delivered","WhatsApp acknowledged","WhatsApp escalated","Attendance %","Late","Pass-by","Entries","Capture %","Opportunity R"],...rows].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="maxim-retail-"+Date.now()+".csv";a.click();URL.revokeObjectURL(url);toast("CSV exported");
}

document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
document.querySelectorAll(".nav-item[data-locked]").forEach(b=>b.addEventListener("click",()=>toast(b.dataset.locked+" is a locked preview add-on")));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
document.querySelector(".brand").addEventListener("click",e=>{e.preventDefault();navigate("overview")});
$("regionFilter").addEventListener("change",e=>{state.region=e.target.value;state.store="all";updateStoreOptions();renderAll()});
$("storeFilter").addEventListener("change",e=>{state.store=e.target.value;renderAll()});
$("periodFilter").addEventListener("change",e=>{state.period=Number(e.target.value);renderAll()});
$("timeFilter").addEventListener("change",e=>{state.time=e.target.value;renderAll()});
$("eventFilter").addEventListener("change",e=>{state.event=e.target.value;renderAll()});
$("resetFilters").addEventListener("click",()=>{state.region="all";state.store="all";state.period=1;state.time="all";state.event="all";$("regionFilter").value="all";updateStoreOptions();$("periodFilter").value="1";$("timeFilter").value="all";$("eventFilter").value="all";renderAll();toast("Filters reset")});
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
$("receiverForm").addEventListener("submit",submitReceiver);
$("receiverCancel").addEventListener("click",clearReceiverForm);
$("receiverReset").addEventListener("click",()=>{state.receivers=defaultReceivers.map(x=>({...x,events:[...x.events]}));saveReceivers();clearReceiverForm();renderReceivers();toast("Demo receivers restored")});
document.querySelectorAll("[data-late-band]").forEach(b=>b.addEventListener("click",()=>toast("Late-arrival band selected: "+b.dataset.lateBand)));

populateFilters();$("receiverStore").innerHTML='<option value="all">All stores</option>'+stores.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join("");$("regionFilter").value="all";$("storeFilter").value="all";renderAll();loadStoreModel();

