// ══ DATA ══════════════════════════════════════════════════════════════════════
const CITIES = [
  {
    name:"Bhopal", state:"Madhya Pradesh", icon:"🏛️", color:"#00e5a0",
    areas:[
      {name:"Habibganj",    lat:23.2293,lon:77.4344},
      {name:"Arera Colony", lat:23.2108,lon:77.4497},
      {name:"MP Nagar",     lat:23.2270,lon:77.4329},
      {name:"New Market",   lat:23.2362,lon:77.4040},
      {name:"Kolar Road",   lat:23.1714,lon:77.4486},
      {name:"Berasia Road", lat:23.3001,lon:77.4200},
      {name:"Hoshangabad Rd",lat:23.2000,lon:77.3900},
      {name:"Raisen Road",  lat:23.2480,lon:77.5000},
      {name:"TT Nagar",     lat:23.2349,lon:77.4032},
      {name:"Govindpura",   lat:23.2595,lon:77.4750},
    ]
  },
  {
    name:"Indore", state:"Madhya Pradesh", icon:"🏙️", color:"#ff6b35",
    areas:[
      {name:"Vijay Nagar",  lat:22.7530,lon:75.8937},
      {name:"Palasia",      lat:22.7279,lon:75.8765},
      {name:"Rajwada",      lat:22.7180,lon:75.8577},
      {name:"Scheme 54",    lat:22.7450,lon:75.9010},
      {name:"AB Road",      lat:22.7200,lon:75.8900},
      {name:"Rau",          lat:22.6800,lon:75.8500},
      {name:"Lasudia",      lat:22.7700,lon:75.9200},
      {name:"Bhawarkuan",   lat:22.7100,lon:75.8700},
    ]
  },
  {
    name:"Delhi", state:"NCT of Delhi", icon:"🕌", color:"#f59e0b",
    areas:[
      {name:"Connaught Place",lat:28.6315,lon:77.2167},
      {name:"Karol Bagh",    lat:28.6514,lon:77.1908},
      {name:"Lajpat Nagar",  lat:28.5670,lon:77.2431},
      {name:"Dwarka",        lat:28.5921,lon:77.0460},
      {name:"Rohini",        lat:28.7371,lon:77.1264},
      {name:"Saket",         lat:28.5245,lon:77.2066},
      {name:"Janakpuri",     lat:28.6218,lon:77.0881},
      {name:"Noida Sec-18",  lat:28.5697,lon:77.3226},
      {name:"Nehru Place",   lat:28.5493,lon:77.2543},
    ]
  },
  {
    name:"Mumbai", state:"Maharashtra", icon:"🌊", color:"#3b82f6",
    areas:[
      {name:"Andheri",       lat:19.1136,lon:72.8697},
      {name:"Bandra",        lat:19.0596,lon:72.8295},
      {name:"Dadar",         lat:19.0178,lon:72.8478},
      {name:"Borivali",      lat:19.2307,lon:72.8567},
      {name:"Thane",         lat:19.2183,lon:72.9781},
      {name:"Kurla",         lat:19.0728,lon:72.8826},
      {name:"Navi Mumbai",   lat:19.0330,lon:73.0297},
      {name:"Worli",         lat:18.9940,lon:72.8166},
      {name:"Churchgate",    lat:18.9322,lon:72.8264},
    ]
  },
  {
    name:"Bangalore", state:"Karnataka", icon:"🌿", color:"#a78bfa",
    areas:[
      {name:"Koramangala",   lat:12.9352,lon:77.6245},
      {name:"Indiranagar",   lat:12.9784,lon:77.6408},
      {name:"Whitefield",    lat:12.9698,lon:77.7500},
      {name:"Electronic City",lat:12.8399,lon:77.6770},
      {name:"Jayanagar",     lat:12.9308,lon:77.5838},
      {name:"Marathahalli",  lat:12.9591,lon:77.6974},
      {name:"Hebbal",        lat:13.0358,lon:77.5970},
      {name:"BTM Layout",    lat:12.9166,lon:77.6101},
    ]
  },
  {
    name:"Jaipur", state:"Rajasthan", icon:"🏰", color:"#f43f5e",
    areas:[
      {name:"Amer",          lat:26.9855,lon:75.8513},
      {name:"Vaishali Nagar",lat:26.9279,lon:75.7466},
      {name:"Malviya Nagar", lat:26.8574,lon:75.8147},
      {name:"C-Scheme",      lat:26.9124,lon:75.8044},
      {name:"Mansarovar",    lat:26.8495,lon:75.7610},
      {name:"Sodala",        lat:26.9290,lon:75.7750},
      {name:"Tonk Road",     lat:26.8700,lon:75.8200},
      {name:"Raja Park",     lat:26.9053,lon:75.8193},
    ]
  },
];

// Colors for areas (per-area within a city)
const AREA_COLORS = [
  "#00e5a0","#ff6b35","#f59e0b","#3b82f6","#a78bfa",
  "#f43f5e","#06b6d4","#84cc16","#e879f9","#fb923c"
];

// ══ STATE ══════════════════════════════════════════════════════════════════════
let currentCity = null;
let selectedAreas = [];  // indices into currentCity.areas
let mapSel = [];         // up to 2 area indices for route

// ══ HAVERSINE ══════════════════════════════════════════════════════════════════
function hav(a, b) {
  const R=6371, r=Math.PI/180;
  const dL=(b.lat-a.lat)*r, dO=(b.lon-a.lon)*r;
  const x=Math.sin(dL/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dO/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}

// ══ STEP NAV ══════════════════════════════════════════════════════════════════
function goStep(n) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen'+n).classList.add('active');
  ['step1','step2','step3'].forEach((id,i)=>{
    const el=document.getElementById(id);
    el.className='step';
    if(i+1<n) el.classList.add('done');
    else if(i+1===n) el.classList.add('active');
  });
  if(n===3) buildMap();
}

// ══ SCREEN 1: CITY GRID ════════════════════════════════════════════════════════
const cityGrid = document.getElementById('cityGrid');
CITIES.forEach((city,ci)=>{
  const card=document.createElement('div');
  card.className='city-card';
  card.style.setProperty('--card-color',city.color);
  card.innerHTML=`
    <div class="city-card-icon">${city.icon}</div>
    <div class="city-card-count">${city.areas.length} areas</div>
    <div class="city-card-name" style="color:${city.color}">${city.name}</div>
    <div class="city-card-state">${city.state}</div>
  `;
  card.addEventListener('click',()=>{
    currentCity=city;
    selectedAreas=[];
    mapSel=[];
    buildAreaGrid();
    goStep(2);
  });
  cityGrid.appendChild(card);
});

// ══ SCREEN 2: AREA GRID ════════════════════════════════════════════════════════
function buildAreaGrid() {
  document.getElementById('s2Title').innerHTML=`Select <span style="color:${currentCity.color}">Areas</span> in ${currentCity.name}`;
  const grid=document.getElementById('areaGrid');
  grid.innerHTML='';
  currentCity.areas.forEach((area,ai)=>{
    const chip=document.createElement('div');
    chip.className='area-chip';
    chip.dataset.ai=ai;
    chip.innerHTML=`<div class="dot" style="background:${AREA_COLORS[ai]}"></div>${area.name}`;
    chip.addEventListener('click',()=>toggleArea(ai));
    grid.appendChild(chip);
  });
  updateAreaCount();
}

function toggleArea(ai) {
  if(selectedAreas.includes(ai)) selectedAreas=selectedAreas.filter(x=>x!==ai);
  else selectedAreas.push(ai);
  document.querySelectorAll('.area-chip').forEach(c=>{
    c.classList.toggle('selected',selectedAreas.includes(+c.dataset.ai));
  });
  updateAreaCount();
}

function selectAllAreas() {
  selectedAreas=currentCity.areas.map((_,i)=>i);
  document.querySelectorAll('.area-chip').forEach(c=>c.classList.add('selected'));
  updateAreaCount();
}

function clearAreas() {
  selectedAreas=[];
  document.querySelectorAll('.area-chip').forEach(c=>c.classList.remove('selected'));
  updateAreaCount();
}

function updateAreaCount() {
  const n=selectedAreas.length;
  document.getElementById('selCount').textContent=`${n} selected`;
  document.getElementById('proceedBtn').disabled=n<2;
}

// ══ SCREEN 3: MAP ═════════════════════════════════════════════════════════════
function buildMap() {
  const city=currentCity;
  const areas=selectedAreas.map(i=>({...city.areas[i],color:AREA_COLORS[i],origIdx:i}));
  mapSel=[];

  document.getElementById('mhCity').innerHTML=`<span style="color:${city.color}">${city.name}</span> — Distance Map`;
  document.getElementById('mhSub').textContent=`${areas.length} areas · ${areas.length*(areas.length-1)/2} routes`;

  // Build distance matrix for selected areas
  const M=areas.length;
  const dist=Array.from({length:M},(_,i)=>Array.from({length:M},(_,j)=>i===j?0:hav(areas[i],areas[j])));

  // ── Area list (left panel)
  const listEl=document.getElementById('areaListEl');
  listEl.innerHTML='';
  areas.forEach((a,i)=>{
    const item=document.createElement('div');
    item.className='area-list-item';
    item.dataset.i=i;
    item.innerHTML=`
      <div class="dot" style="width:10px;height:10px;border-radius:50%;background:${a.color};flex-shrink:0"></div>
      <div class="name">${a.name}</div>
      <div class="from-dist" id="ld${i}"></div>
    `;
    item.addEventListener('click',()=>pickArea(i,areas,dist));
    listEl.appendChild(item);
  });

  // ── SVG Map
  const svg=document.getElementById('mapSvg');
  svg.innerHTML='';
  const W=svg.parentElement.clientWidth||600, H=svg.parentElement.clientHeight||400;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('width',W); svg.setAttribute('height',H);
  const NS='http://www.w3.org/2000/svg';
  const mk=(tag,attrs,p)=>{
    const e=document.createElementNS(NS,tag);
    Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));
    (p||svg).appendChild(e); return e;
  };

  // Background
  mk('rect',{width:W,height:H,fill:'#0e0e12'});
  // Grid
  for(let i=0;i<=10;i++){
    mk('line',{x1:W*i/10,y1:0,x2:W*i/10,y2:H,stroke:'rgba(255,255,255,0.02)','stroke-width':1});
    mk('line',{x1:0,y1:H*i/10,x2:W,y2:H*i/10,stroke:'rgba(255,255,255,0.02)','stroke-width':1});
  }

  const pad=60;
  const lats=areas.map(a=>a.lat), lons=areas.map(a=>a.lon);
  const latMin=Math.min(...lats)-0.015, latMax=Math.max(...lats)+0.015;
  const lonMin=Math.min(...lons)-0.015, lonMax=Math.max(...lons)+0.015;

  function proj(lat,lon){
    return {
      x:pad+(lon-lonMin)/(lonMax-lonMin||0.001)*(W-pad*2),
      y:pad+(1-(lat-latMin)/(latMax-latMin||0.001))*(H-pad*2)
    };
  }

  // Lines group & highlight group
  const lineG=mk('g',{});
  const hlG=mk('g',{});
  const nodeG=mk('g',{});

  // All faint lines
  for(let i=0;i<M;i++) for(let j=i+1;j<M;j++){
    const p1=proj(areas[i].lat,areas[i].lon);
    const p2=proj(areas[j].lat,areas[j].lon);
    mk('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
      stroke:'rgba(255,255,255,0.06)','stroke-width':1.2,
      class:`base-ln ln-${i}-${j}`},lineG);
  }

  // Nodes
  const nodeEls=[];
  areas.forEach((a,i)=>{
    const {x,y}=proj(a.lat,a.lon);
    mk('circle',{cx:x,cy:y,r:20,fill:a.color,opacity:0.07},nodeG);
    const nd=mk('circle',{cx:x,cy:y,r:9,fill:a.color,stroke:'#0e0e12','stroke-width':2.5,
      style:'cursor:pointer;transition:r 0.15s','data-i':i},nodeG);
    nd.addEventListener('click',()=>pickArea(i,areas,dist));
    nd.addEventListener('mouseenter',()=>{ if(!mapSel.includes(i)) nd.setAttribute('r',13); });
    nd.addEventListener('mouseleave',()=>{ if(!mapSel.includes(i)) nd.setAttribute('r',9); });
    nodeEls.push(nd);

    // Label
    const py=proj(a.lat,a.lon);
    const offY=py.y>H/2?-18:20;
    const lw=a.name.length*6.5+14;
    mk('rect',{x:py.x-lw/2,y:py.y+offY-13,width:lw,height:18,fill:'rgba(14,14,18,0.9)',rx:4},nodeG);
    const t=mk('text',{x:py.x,y:py.y+offY,
      'text-anchor':'middle',fill:a.color,
      'font-family':'Syne,sans-serif','font-size':11,'font-weight':700,
      'pointer-events':'none'},nodeG);
    t.textContent=a.name;
  });

  // ── Route picker
  function pickArea(i,areas,dist){
    if(mapSel.includes(i)) mapSel=mapSel.filter(x=>x!==i);
    else{ if(mapSel.length>=2) mapSel.shift(); mapSel.push(i); }
    renderMapSel(areas,dist,nodeEls,hlG,proj,W,H,mk,NS);
  }

  // expose for list clicks
  window._pickArea=(i)=>pickArea(i,areas,dist);

  // ── Matrix
  buildMatrix(areas,dist);
}

function renderMapSel(areas,dist,nodeEls,hlG,proj,W,H,mk,NS){
  while(hlG.firstChild) hlG.removeChild(hlG.firstChild);

  nodeEls.forEach((nd,i)=>{
    if(mapSel.includes(i)){nd.setAttribute('r',12);nd.setAttribute('stroke-width',3.5);}
    else{nd.setAttribute('r',9);nd.setAttribute('stroke-width',2.5);}
  });

  document.querySelectorAll('.area-list-item').forEach(el=>{
    el.className='area-list-item';
    const i=+el.dataset.i;
    if(mapSel[0]===i) el.classList.add('sel1');
    else if(mapSel[1]===i) el.classList.add('sel2');
  });

  // Draw lines from selected areas to all others
  mapSel.forEach(i=>{
    areas.forEach((_,j)=>{
      if(j===i) return;
      const p1=proj(areas[i].lat,areas[i].lon);
      const p2=proj(areas[j].lat,areas[j].lon);
      mk('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
        stroke:areas[i].color,opacity:0.2,'stroke-width':1.5},hlG);
    });
  });

  // Side distances
  if(mapSel.length>=1){
    const ref=mapSel[mapSel.length-1];
    document.querySelectorAll('.area-list-item').forEach(el=>{
      const j=+el.dataset.i;
      const ld=document.getElementById('ld'+j);
      if(ld) ld.textContent = ref===j ? '' : dist[ref][j]+' km';
    });
  }

  if(mapSel.length===2){
    const [a,b]=mapSel;
    const p1=proj(areas[a].lat,areas[a].lon);
    const p2=proj(areas[b].lat,areas[b].lon);
    const km=dist[a][b];

    mk('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:areas[a].color,opacity:0.2,'stroke-width':18},hlG);
    mk('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:areas[a].color,'stroke-width':3,'stroke-dasharray':'10 5'},hlG);

    const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
    const lw=String(km).length*8+32;
    mk('rect',{x:mx-lw/2,y:my-14,width:lw,height:26,fill:areas[a].color,rx:7},hlG);
    const NS='http://www.w3.org/2000/svg';
    const t=document.createElementNS(NS,'text');
    t.setAttribute('x',mx);t.setAttribute('y',my+4);
    t.setAttribute('text-anchor','middle');t.setAttribute('fill','#000');
    t.setAttribute('font-family','DM Mono,monospace');t.setAttribute('font-size',12);t.setAttribute('font-weight',700);
    t.textContent=`${km} km`;
    t.style.pointerEvents='none';
    hlG.appendChild(t);

    const hrs=(km/40).toFixed(1);
    document.getElementById('routeCard').innerHTML=`
      <div class="route-result has-route">
        <div class="from-to-row">
          <div class="loc-tag" style="background:${areas[a].color}">${areas[a].name}</div>
          <span style="color:var(--muted);font-size:18px">→</span>
          <div class="loc-tag" style="background:${areas[b].color}">${areas[b].name}</div>
        </div>
        <div class="dist-big">${km}<sub>km</sub></div>
        <div class="stats-row">
          <div class="stat-pill">~${hrs} hrs city drive</div>
          <div class="stat-pill">${(km*0.621).toFixed(1)} miles</div>
          <div class="stat-pill">${(km*1000).toLocaleString()} m</div>
        </div>
      </div>`;

    highlightMatrixCells(a,b);
  } else {
    document.getElementById('routeCard').innerHTML=`<div style="color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;">Click two areas to compare</div>`;
    highlightMatrixCells(-1,-1);
  }
}

// ── Override list click to call window._pickArea
document.getElementById('areaListEl').addEventListener('click',e=>{
  const item=e.target.closest('.area-list-item');
  if(item && window._pickArea) window._pickArea(+item.dataset.i);
});

// ── MATRIX ════════════════════════════════════════════════════════════════════
function buildMatrix(areas,dist){
  const M=areas.length;
  let html=`<table class="dtable"><thead><tr><th>↓ From / To →</th>`;
  areas.forEach(a=>{ html+=`<th>${a.name}</th>`; });
  html+=`</tr></thead><tbody>`;
  areas.forEach((r,i)=>{
    html+=`<tr><td style="border-left:3px solid ${r.color}">${r.name}</td>`;
    areas.forEach((_,j)=>{
      if(i===j) html+=`<td class="zero">—</td>`;
      else html+=`<td class="dcel" data-i="${i}" data-j="${j}">${dist[i][j]}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById('matrixContent').innerHTML=html;

  document.querySelectorAll('.dcel').forEach(cell=>{
    cell.addEventListener('click',()=>{
      if(window._pickArea){
        window._pickArea(+cell.dataset.i);
        window._pickArea(+cell.dataset.j);
      }
    });
  });
}

function highlightMatrixCells(a,b){
  document.querySelectorAll('.dcel').forEach(cell=>{
    cell.classList.remove('hl');
    if(a>=0&&b>=0){
      const ci=+cell.dataset.i,cj=+cell.dataset.j;
      if((ci===a&&cj===b)||(ci===b&&cj===a)) cell.classList.add('hl');
    }
  });
}

let matCollapsed=false;
function toggleMatrix(){
  matCollapsed=!matCollapsed;
  document.getElementById('matrixBar').classList.toggle('collapsed',matCollapsed);
  document.getElementById('matToggleLbl').textContent=matCollapsed
    ?'DISTANCE MATRIX — CLICK TO EXPAND'
    :'DISTANCE MATRIX (km) — CLICK TO COLLAPSE';
  document.querySelector('#matrixBar .matrix-toggle span').textContent=matCollapsed?'▼':'▲';
}
