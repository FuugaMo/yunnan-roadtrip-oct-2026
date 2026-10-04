let current = 0;
let mode = 'overview';
const RETURN_START = 10;
let map, routeLayer, markerLayer;
const $ = id => document.getElementById(id);
const range = (r, unit) => `${r[0]}–${r[1]} ${unit}`;
const coords = id => PLACES[id].slice(1);
const navLink = id => `https://uri.amap.com/search?keyword=${encodeURIComponent(PLACES[id][0])}&callnative=0`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const total = [0,1].map(i => DAYS.reduce((s,d) => s+d.km[i],0));
$('distance').textContent = `${total[0].toLocaleString()}–${total[1].toLocaleString()} km`;
function details(d, index, navigation=true) {
 return `<div class="date-line">${d.date} · ${d.week}<span class="tag ${index>=RETURN_START?'return-tag':''}">${d.tag}</span></div><h3>${d.title}</h3><p class="detail-note">${d.route}</p><div class="daily-metrics"><span><strong>${range(d.km,'km')}</strong></span><span><strong>${range(d.hours,'h')}</strong> 纯驾驶</span></div><ol class="timeline">${d.time.map(t=>`<li><time>${t[0]}</time><p>${t[1]}</p></li>`).join('')}</ol><div class="sleep">今晚住<strong>${d.sleep}</strong>${d.hotel}</div><p class="detail-note"><b>停车：</b>${d.parking}</p><p class="detail-note"><b>吃什么：</b>${d.food}</p><p class="detail-note"><b>安排依据：</b>${d.tip}</p><p class="detail-note"><b>可删减：</b>${d.cut}</p>${navigation?`<p class="small">在高德查找以下地点，再选择实际酒店 / 停车场：</p><div class="navigation">${[...new Set(d.points)].map(id=>`<a href="${navLink(id)}" target="_blank" rel="noopener">${PLACES[id][0]} ↗</a>`).join('')}</div>`:''}`;
}
$('days').innerHTML = DAYS.map((d,i)=>`<button data-day="${i}" class="${i>=RETURN_START?'return':''}" aria-label="${d.date}，${d.route}" aria-pressed="false"><small>DAY ${String(i+1).padStart(2,'0')} · ${d.date}</small><strong>${d.sleep.split('市区')[0].replace('原酒店连住','').replace('返回塘厦，不计住宿','回到塘厦').replace('县城近高速','').replace('独克宗外围可停车酒店','香格里拉').replace('古城东侧或才村外围','').replace('游客中心附近','').replace('昆明市嵩明县近高速','嵩明').replace('东侧近高速酒店','').replace('临桂区或西侧','').replace('束河或白沙外围','').replace('近高速酒店','')}</strong></button>`).join('');
$('all-days').innerHTML = DAYS.map((d,i)=>`<tr data-row="${i}"><td><button class="row-link" data-day="${i}" aria-label="查看 ${d.date} ${d.route}">${d.date} ${d.week}</button></td><td>${d.route}</td><td>${range(d.km,'km')}</td><td>${range(d.hours,'h')}</td><td>${d.sleep}</td></tr>`).join('');
$('sources').innerHTML = SOURCES.map(s=>`<div class="source"><a href="${s[1]}" target="_blank" rel="noopener">${s[0]} ↗</a><p>${s[2]}</p></div>`).join('');
$('print-details').innerHTML = DAYS.map((d,i)=>`<article><h2>DAY ${i+1} · ${d.date}</h2>${details(d,i,false)}</article>`).join('');
function selectDay(index, focusMap=false) {
 current = Math.max(0,Math.min(DAYS.length-1,index));
 $('day-label').textContent = `DAY ${String(current+1).padStart(2,'0')} / 13`;
 $('day-detail').innerHTML = details(DAYS[current],current);
 $('prev').disabled = current===0; $('next').disabled = current===12;
 document.querySelectorAll('#days [data-day]').forEach(b=>{const yes=+b.dataset.day===current;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',yes)});
 document.querySelectorAll('[data-row]').forEach(r=>r.classList.toggle('selected',+r.dataset.row===current));
 document.querySelector('.day-panel').scrollTop=0;
 if(focusMap) mode='day';
 updateMap();
 const chosen = document.querySelector(`#days [data-day="${current}"]`);
 $('days').scrollTo({left:Math.max(0,chosen.offsetLeft-$('days').offsetLeft-$('days').clientWidth/2+50),behavior:'smooth'});
}
function updateMap() {
 $('overview').classList.toggle('active',mode==='overview');$('overview').setAttribute('aria-pressed',mode==='overview');
 $('daymap').classList.toggle('active',mode==='day');$('daymap').setAttribute('aria-pressed',mode==='day');
 if(!map){drawFallback();return;}
 routeLayer.clearLayers();markerLayer.clearLayers();
 const shown=mode==='overview'?DAYS:[DAYS[current]];
 shown.forEach(d=>{const i=DAYS.indexOf(d);L.polyline(d.points.map(coords),{color:i>=RETURN_START?'#b65b21':'#12659a',weight:mode==='day'?5:3,opacity:.85,dashArray:i>=RETURN_START?'7 6':undefined}).addTo(routeLayer);});
 const used=new Set();
 if(mode==='overview') {
  const stopIds=['tangxia',...DAYS.map(d=>d.points.at(-1))];
  stopIds.forEach((id,n)=>{if(used.has(id))return;used.add(id);const indices=DAYS.map((d,i)=>d.points.at(-1)===id?i:-1).filter(i=>i>=0);const day=n===0?0:indices[0];const label=n===0?'起终点':indices.map(i=>i+1).join('/');addMarker(id,day,label);});
  DAYS.forEach((d,i)=>d.points.forEach(id=>{if(!used.has(id)){used.add(id);addMarker(id,i,'景',false);}}));
 } else [...new Set(DAYS[current].points)].forEach((id,i)=>addMarker(id,current,i+1));
 const all=shown.flatMap(d=>d.points.map(coords));
 if(all.length)map.fitBounds(L.latLngBounds(all),{padding:[40,45],maxZoom:11,animate:false});
}
function addMarker(id,day,label,permanent=true){
 const marker=L.marker(coords(id),{title:`${PLACES[id][0]}，查看第${day+1}天`,icon:L.divIcon({className:'route-marker',html:`<div class="marker ${day>=10?'back':''} ${day===current?'selected':''}">${label}</div>`,iconSize:[30,30],iconAnchor:[15,15]}),keyboard:true}).addTo(markerLayer);
 marker.bindTooltip(PLACES[id][0],{permanent:mode==='overview'&&permanent,direction:'top',offset:[0,-15]});
 marker.on('click',()=>selectDay(day,true));
}
function drawFallback(){
 const shown=mode==='overview'?DAYS:[DAYS[current]], ids=[...new Set(shown.flatMap(d=>d.points))];
 const xs=ids.map(id=>PLACES[id][2]),ys=ids.map(id=>PLACES[id][1]);const minX=Math.min(...xs)-.4,maxX=Math.max(...xs)+.4,minY=Math.min(...ys)-.4,maxY=Math.max(...ys)+.4;
 const p=id=>[50+(PLACES[id][2]-minX)/(maxX-minX)*680,400-(PLACES[id][1]-minY)/(maxY-minY)*340];
 $('map').innerHTML=`<svg class="fallback-map" viewBox="0 0 800 470" role="img" aria-label="按近似经纬度绘制的站点示意图，无道路底图"><text x="25" y="28">站点位置示意 · 非道路地图</text>${shown.map(d=>`<polyline points="${d.points.map(id=>p(id).join(',')).join(' ')}" stroke="${DAYS.indexOf(d)>=RETURN_START?'#b65b21':'#12659a'}" fill="none" stroke-width="3"/>`).join('')}${ids.map(id=>`<circle cx="${p(id)[0]}" cy="${p(id)[1]}" r="6" fill="#12659a"/><text x="${p(id)[0]+9}" y="${p(id)[1]-9}">${esc(PLACES[id][0])}</text>`).join('')}</svg>`;
 $('map-status').hidden=false;
}
if(typeof L!=='undefined') {
 map=L.map('map',{scrollWheelZoom:false});
 routeLayer=L.layerGroup().addTo(map);markerLayer=L.layerGroup().addTo(map);
 let loaded=0,failed=0;
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
 tiles.on('tileload',()=>{loaded++;if(loaded>2)$('map-status').hidden=true;});
 tiles.on('tileerror',()=>{failed++;if(failed>2&&!loaded)$('map-status').hidden=false;});
 setTimeout(()=>{if(!loaded)$('map-status').hidden=false;},9000);
}
document.addEventListener('click',event=>{const day=event.target.closest('[data-day]');if(day){selectDay(+day.dataset.day,true);if(day.closest('#all-days'))document.querySelector('.workspace').scrollIntoView({behavior:'smooth',block:'start'});}});
$('all-days').addEventListener('click',e=>{const row=e.target.closest('[data-row]');if(row&&!e.target.closest('button')){selectDay(+row.dataset.row,true);document.querySelector('.workspace').scrollIntoView({behavior:'smooth',block:'start'});}});
$('prev').onclick=()=>selectDay(current-1,true);$('next').onclick=()=>selectDay(current+1,true);
$('overview').onclick=()=>{mode='overview';updateMap();};$('daymap').onclick=()=>{mode='day';updateMap();};
$('print').onclick=()=>window.print();
selectDay(0);
