import { Application, Container, Sprite, Texture, Graphics } from './vendor/pixi.js';
import { items, surfaces, project, size, fit, surfaceAt, initialState, isValid, ready, depth, gentlePlacement, configureLevel } from './room-model.js';
import * as art from './room-art.js';
import {levels,cats,placedCount,catMoment} from './levels.js';
import {memories,reactionFor,greetingFor} from './cat-behavior.js';
import {roomJobs,catAsset} from './chapter-art.js';
import {hitObjects,pickObject,nextOverlap} from './room-picking.js';
const $ = id => document.getElementById(id);
const playtest=new URLSearchParams(location.search).has('playtest');
const key=playtest?'little-days-cats-playtest-v1':'little-days-cats-v1', reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
let saved={levels:{},met:[],memories:{},current:'home'};
try{const data=JSON.parse(localStorage.getItem(key)||'null');if(data&&typeof data.levels==='object'&&data.levels&&!Array.isArray(data.levels)){saved.levels=data.levels;if(data.memories&&typeof data.memories==='object')for(const id of Object.keys(cats))saved.memories[id]=Array.isArray(data.memories[id])?data.memories[id].filter(m=>memories[id][m]):[];saved.met=Array.isArray(data.met)?data.met.filter(id=>cats[id]):[];saved.current=levels.some(l=>l.id===data.current)?data.current:'home';}
 if(!playtest&&!saved.levels.home){const old=JSON.parse(localStorage.getItem('little-days-room-v1')||'null');if(old?.state)saved.levels.home=old;}
}catch{}
let level=configureLevel(saved.current),state=restore(level.id),history=[],selected=null,preferred=null,completed=!!saved.levels[level.id]?.completed,sound=false,audio=null,loading=true,catSprites=[],catClock=0,catPositions=new Map(),greetingUntil=0;
function restore(id){const restored=initialState(),stored=saved.levels[id]?.state;for(const it of items)if(isValid(it.id,stored?.[it.id]))restored[it.id]={...stored[it.id]};else if(stored?.[it.id]){const p=stored[it.id],fitted=fit(p.surface,it.id,p.x,p.y,p.orientation);if(fitted)restored[it.id]=fitted;}return restored;}
function persist(){saved.current=level.id;saved.levels[level.id]={state:structuredClone(state),completed};try{localStorage.setItem(key,JSON.stringify(saved));}catch{}}
function remember(id,memory){saved.memories[id]??=[];if(!saved.memories[id].includes(memory)){saved.memories[id].push(memory);persist();}}
function recordEncounter(id){if(!saved.met.includes(id)){saved.met.push(id);persist();}}
function tell(text){$('message').textContent=text;}
let app,view,world,overlay,dragLayer,drag=null,pan=null,suppressClick=false,zoom=1,panX=0,panY=0;
let hitMasks=new Map(),textures=new Map(),objects=new Map(),surfaceGroups=new Map(),staticTextures=new Map(),tweens=[];
const surface=id=>surfaces.find(s=>s.id===id);
function ui(){
 const count=items.filter(it=>surface(state[it.id].surface).accepts).length;
 $('count').textContent=`${count} / ${items.length}`;
 $('item-list').innerHTML=items.map(it=>{
  const p=state[it.id],a=art.objectAsset(it,p.orientation),s=surface(p.surface);
  return `<button class="item-button ${selected===it.id?'selected':''} ${s.accepts?'homed':''}" data-item="${it.id}" data-surface="${p.surface}" data-x="${p.x}" data-y="${p.y}" data-z="${s.z}" data-orientation="${p.orientation}" aria-label="${it.name}，目前在${s.name}" aria-pressed="${selected===it.id}"><span class="item-icon">${a.svg}</span><span class="item-name">${it.name}</span><span class="item-location">${s.accepts?'✓ ':''}${s.name}</span></button>`;
 }).join('');
 $('selection-name').textContent=selected?items.find(it=>it.id===selected).name:'先挑一件小物';$('rotate').disabled=!selected||!!drag?.active;$('deselect').disabled=!selected;
 $('surface-controls').innerHTML=surfaces.filter(s=>s.accepts).map(s=>`<button data-target="${s.id}" ${!selected?'disabled':''} class="${preferred===s.id?'active':''}">${s.name}</button>`).join('');
 $('undo').disabled=!history.length;$('finish').disabled=!ready(state);$('finish').textContent=completed&&ready(state)?'再欣賞今天的小日子 ♡':'今天收好了 ♡';
 $('item-story').hidden=!selected;$('item-story').textContent=selected?items.find(it=>it.id===selected).story:'';
 $('finish-note').textContent=ready(state)?'已經都拿出來了。滿意時再收尾，隨時可以調整。':'把小物從箱子裡拿出來就好。';
 chapterUI();
}
function deselect(){pan=null;clearDrag();selected=null;preferred=null;ui();updateOutline();setHover([]);tell('已取消選取。再挑一件小物，或拖動空白處移動畫面。');}
function choose(id){if(!items.some(i=>i.id===id))return;selected=id;preferred=null;ui();updateOutline();tell('拖到喜歡的位置，或點下方的家具名稱。');}
function soundEffect(kind){
 if(!sound)return;
 try{audio??=new AudioContext();audio.resume();const t=audio.currentTime;
  const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=kind==='tin'?'sine':'triangle';
  const frequency={book:280,letter:440,mug:690,plant:340,camera:390,tin:790}[kind]||400;
  o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.55,t+.12);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.start(t);o.stop(t+.18);
 }catch{}
}
function commit(id,requested){
 if(!requested)return false;
 const p=gentlePlacement(state,id,requested);if(!p)return false;
 history.push(structuredClone(state));state={...state,[id]:p};selected=id;preferred=p.surface;persist();renderWorld();ui();updateOutline();setHover([]);
 const sprite=objects.get(id);if(sprite&&!reduced){const endY=sprite.y;sprite.y-=12;tweens.push({sprite,endY,time:0});}
 const reaction=reactionFor(level,state,id);if(reaction){remember(level.cat,reaction.memory);$('cat-status').textContent=reaction.text;}
 soundEffect(items.find(it=>it.id===id).kind);tell(ready(state)?'每件小物都有家了。還可以調整，滿意了再按「今天收好了」。':`放到${surface(p.surface).name}了。也可以再換個位置。`);return true;
}
function moveTo(id,surfaceId){const it=items.find(i=>i.id===id),s=surface(surfaceId),{w,d}=size(it,state[id].orientation);commit(id,fit(s.id,id,s.x+(s.w-w)/2,s.y+(s.d-d)/2,state[id].orientation));}
async function texture(svg,width=1000,height=720,maskKey=null){
 const img=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const c=document.createElement('canvas');const scale=1.5;c.width=Math.ceil(width*scale);c.height=Math.ceil(height*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);if(maskKey){const rgba=ctx.getImageData(0,0,c.width,c.height).data;const alpha=new Uint8Array(c.width*c.height);for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];hitMasks.set(maskKey,{alpha,width:c.width,height:c.height,displayWidth:width,displayHeight:height});}return Texture.from(c);}finally{URL.revokeObjectURL(url);}
}
function staticSprite(key){const s=new Sprite(staticTextures.get(key));s.width=1000;s.height=720;s.eventMode='none';return s;}
function objectSprite(it,p,interactive=true){
 const a=art.objectAsset(it,p.orientation),s=surface(p.surface),point=project(p.x,p.y,s.z);const sprite=new Sprite(textures.get(`${it.id}:${p.orientation}`));
 sprite.width=a.width;sprite.height=a.height;sprite.position.set(point.x+a.offsetX,point.y+a.offsetY);
 sprite.eventMode='none';
 return sprite;
}
function addObjects(group,ids){
 const candidates=items.filter(it=>ids.includes(state[it.id].surface)).sort((a,b)=>depth(state[a.id],a)-depth(state[b.id],b));
 for(const it of candidates){const p=state[it.id],s=surface(p.surface),{w,d}=size(it,p.orientation),point=project(p.x+w/2,p.y+d/2,s.z);
  const shadow=new Graphics().ellipse(point.x,point.y+3,(w+d)*16,(w+d)*5).fill({color:0x6f604d,alpha:.12});shadow.eventMode='none';group.addChild(shadow);
  const sprite=objectSprite(it,p);group.addChild(sprite);objects.set(it.id,sprite);
 }
}
function renderWorld(){
 if(!world)return;catPositions=new Map(catSprites.map(c=>[c.id,{x:c.sprite.x,y:c.sprite.y}]));world.removeChildren().forEach(c=>c.destroy({children:true}));objects.clear();surfaceGroups.clear();tweens=[];
 world.addChild(staticSprite('background'),staticSprite('decor'),staticSprite('rug'));
 // Each support surface owns the props above it. Draw shelves from bottom to top and
 // finish with the front posts, so their geometry can actually occlude the objects.
 const desk=new Container();world.addChild(desk);desk.addChild(staticSprite('desk'));
 const drawer=new Container();drawer.addChild(staticSprite('drawer'));addObjects(drawer,['drawer']);drawer.addChild(staticSprite('drawerFront'));desk.addChild(drawer);surfaceGroups.set('drawer',drawer);
 const desktop=new Container();addObjects(desktop,['desk']);desk.addChild(desktop);surfaceGroups.set('desk',desktop);
 const shelves=new Container();world.addChild(shelves);shelves.addChild(staticSprite('shelf'));
 for(const id of ['shelf-low','shelf-high']){const tier=new Container();tier.addChild(staticSprite(id));addObjects(tier,[id]);shelves.addChild(tier);surfaceGroups.set(id,tier);}shelves.addChild(staticSprite('shelfFront'));
 world.addChild(staticSprite('lamp'),staticSprite('stool'),staticSprite('plantDecor'));
 const rug=new Container();addObjects(rug,['floor']);world.addChild(rug);surfaceGroups.set('floor',rug);
 const movingBox=new Container();movingBox.addChild(staticSprite('box'));addObjects(movingBox,['box']);movingBox.addChild(staticSprite('boxFront'));world.addChild(movingBox);surfaceGroups.set('box',movingBox);
 renderCats();updateOutline();
}
function setHover(ids){
 const id=pickObject(ids,selected),label=$('pick-label');label.hidden=!id;
 if(id)label.textContent=`${items.find(it=>it.id===id).name}${ids.length>1?' · 再點換選':''}`;
 if(app)app.canvas.style.cursor=id?'grab':selected?'crosshair':'default';
}
function updateOutline(){
 overlay.removeChildren().forEach(c=>c.destroy({children:true}));if(!selected)return;
 const reveal=objectSprite(items.find(it=>it.id===selected),state[selected],false);reveal.tint=0xfff3bf;reveal.alpha=.28;overlay.addChild(reveal);
 const p=state[selected],it=items.find(i=>i.id===selected),{w,d}=size(it,p.orientation),s=surface(p.surface);
 const points=[[p.x,p.y],[p.x+w,p.y],[p.x+w,p.y+d],[p.x,p.y+d]].flatMap(([x,y])=>{const a=project(x,y,s.z+.012);return[a.x,a.y]});
 const outline=new Graphics().poly(points).stroke({color:0xf8eac4,width:2.5,alpha:.9});outline.eventMode='none';overlay.addChild(outline);
}
function highlight(p){
 overlay.removeChildren().forEach(c=>c.destroy({children:true}));if(!p)return;
 const s=surface(p.surface);const vertices=[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.d],[s.x,s.y+s.d]].flatMap(([x,y])=>{const a=project(x,y,s.z+.015);return[a.x,a.y]});
 const area=new Graphics().poly(vertices).fill({color:0xc4d4a7,alpha:.22}).stroke({color:0x8da577,width:1.6,alpha:.8});area.eventMode='none';overlay.addChild(area);
}
function resize(){const host=$('scene-host'),w=host.clientWidth,h=host.clientHeight;app.renderer.resize(w,h);const s=Math.min(w/1000,h/720)*zoom;view.scale.set(s);view.position.set(w/2-(500-panX)*s,h/2-(360-panY)*s);}
function screenToWorld(clientX,clientY){const r=app.canvas.getBoundingClientRect();const px=(clientX-r.left)*app.renderer.width/r.width,py=(clientY-r.top)*app.renderer.height/r.height;return{x:(px-view.x)/view.scale.x,y:(py-view.y)/view.scale.y};}
function begin(id,point,pointerId,fromScene=false){
 selected=id;preferred=null;const p=state[id],it=items.find(i=>i.id===id),s=surface(p.surface),{w,d}=size(it,p.orientation),base=project(p.x+w/2,p.y+d/2,s.z);
 drag={id,pointerId,start:point,active:false,offset:fromScene?{x:point.x-base.x,y:point.y-base.y}:{x:0,y:-17},candidate:null,ghost:null};ui();updateOutline();
}
function clearDrag(){if(drag?.ghost){drag.ghost.destroy();drag.ghost=null;}if(drag){const sprite=objects.get(drag.id);if(sprite)sprite.alpha=1;}drag=null;ui();updateOutline();setHover([]);}
function updateDrag(point){
 const d=drag,it=items.find(i=>i.id===d.id),p=state[d.id],{w, d:depth}=size(it,p.orientation);
 const foot={x:point.x-d.offset.x,y:point.y-d.offset.y};d.candidate=surfaceAt(foot.x,foot.y,it.id,p.orientation,preferred);highlight(d.candidate);
 if(!d.ghost){d.ghost=objectSprite(it,p,false);dragLayer.addChild(d.ghost);const original=objects.get(it.id);if(original)original.alpha=.22;}
 const a=art.objectAsset(it,p.orientation);d.ghost.position.set(foot.x-43*(w-depth)/2+a.offsetX,foot.y-22*(w+depth)/2+a.offsetY-(reduced?0:18));
}
function sceneHits(point,padding=5){
 const entries=[...objects].map(([id,sprite])=>({id,x:sprite.x,y:sprite.y,mask:hitMasks.get(`${id}:${state[id].orientation}`)}));
 return hitObjects(entries,point,Math.min(24,padding/view.scale.x));
}
function sceneCatAt(point){
 const cat=catSprites.find(c=>c.id===level.cat),moment=catMoment(level,state,completed);if(!cat||moment.pose==='hidden')return false;
 const mask=hitMasks.get(`cat:${cat.id}:${moment.pose}`);return !!mask&&hitObjects([{id:cat.id,x:cat.sprite.x,y:cat.sprite.y,mask:{...mask,displayWidth:cat.sprite.width,displayHeight:cat.sprite.height}}],point,3/view.scale.x).length>0;
}
function bindInput(){
 $('greet-cat').addEventListener('click',()=>greetCat());
 $('level-nav').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)changeLevel(b.dataset.level);});
 $('open-notebook').addEventListener('click',()=>{notebookUI();$('notebook').showModal();});$('close-notebook').addEventListener('click',()=>$('notebook').close());
 $('next-level').addEventListener('click',()=>{const next=levels[levels.indexOf(level)+1];if(next){$('completion').close();changeLevel(next.id);}});

 $('item-list').addEventListener('pointerdown',e=>{if(loading)return;const b=e.target.closest('[data-item]');if(!b||e.button!==0||!e.isPrimary)return;begin(b.dataset.item,screenToWorld(e.clientX,e.clientY),e.pointerId);});
 $('item-list').addEventListener('click',e=>{if(loading||suppressClick)return;const b=e.target.closest('[data-item]');if(b)choose(b.dataset.item);});
 app.canvas.addEventListener('pointerdown',e=>{
  if(loading||drag||!e.isPrimary||e.button!==0)return;
  const point=screenToWorld(e.clientX,e.clientY),ids=sceneHits(point,e.pointerType==='touch'?10:5),id=pickObject(ids,selected);
  if(id){const previous=selected;begin(id,point,e.pointerId,true);app.canvas.setPointerCapture(e.pointerId);drag.hitIds=ids;drag.previous=previous;drag.threshold=e.pointerType==='touch'?10:6;e.preventDefault();}
  else {app.canvas.setPointerCapture(e.pointerId);pan={id:e.pointerId,x:e.clientX,y:e.clientY,px:panX,py:panY,moved:false,cat:!selected&&sceneCatAt(point)};}
 });
 document.addEventListener('pointermove',e=>{
  if(pan&&pan.id===e.pointerId){e.preventDefault();pan.moved||=Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>5;panX=pan.px+(e.clientX-pan.x)/view.scale.x;panY=pan.py+(e.clientY-pan.y)/view.scale.y;resize();return;}
  if(!drag){const ids=sceneHits(screenToWorld(e.clientX,e.clientY));setHover(e.target===app.canvas?ids:[]);if(!ids.length&&!selected&&e.target===app.canvas&&sceneCatAt(screenToWorld(e.clientX,e.clientY))){$('pick-label').hidden=false;$('pick-label').textContent=`${cats[level.cat].name} · 輕點打招呼`;app.canvas.style.cursor='pointer';}return;}if(e.pointerId!==drag.pointerId)return;const point=screenToWorld(e.clientX,e.clientY);
  if(!drag.active&&Math.hypot(point.x-drag.start.x,point.y-drag.start.y)*view.scale.x<(drag.threshold||6))return;e.preventDefault();drag.active=true;updateDrag(point);
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(pan&&pan.id===e.pointerId){if(pan.moved||pan.cat){suppressClick=true;setTimeout(()=>suppressClick=false,0);}if(pan.cat&&!pan.moved)greetCat();pan=null;return;}
  if(!drag||e.pointerId!==drag.pointerId)return;const d=drag;
  if(d.active){suppressClick=true;setTimeout(()=>suppressClick=false,0);const candidate=d.candidate;clearDrag();if(candidate)commit(d.id,candidate);else tell('這裡沒有放置表面。小物先回到原處，慢慢挑就好。');}
  else{clearDrag();selected=d.hitIds?.length>1&&d.previous===d.id?nextOverlap(d.hitIds,d.id):d.id;ui();updateOutline();setHover(d.hitIds||[]);suppressClick=true;setTimeout(()=>suppressClick=false,0);tell(d.hitIds?.length>1?'小物重疊了：再點同一處可換選，拖動會拿起目前選取的小物。':'選好了，可以拖動，或點下方的家具名稱。');}
 });
 document.addEventListener('pointercancel',e=>{if(pan?.id===e.pointerId)pan=null;if(drag?.pointerId===e.pointerId)clearDrag();});
 app.canvas.addEventListener('lostpointercapture',e=>{if(pan?.id===e.pointerId)pan=null;if(drag?.pointerId===e.pointerId)clearDrag();});
 window.addEventListener('blur',()=>{pan=null;clearDrag();});
 $('deselect').addEventListener('click',deselect);
 app.canvas.addEventListener('pointerleave',()=>{if(!drag)setHover([]);});
 app.canvas.addEventListener('click',e=>{if(loading||suppressClick||!selected)return;const p=screenToWorld(e.clientX,e.clientY),orientation=state[selected].orientation;const candidate=surfaceAt(p.x,p.y,selected,orientation,preferred);if(candidate)commit(selected,candidate);else deselect();});
 $('surface-controls').addEventListener('click',e=>{const b=e.target.closest('[data-target]');if(!loading&&b&&selected)moveTo(selected,b.dataset.target);});
 $('rotate').addEventListener('click',()=>{if(loading||!selected||drag?.active)return;const p=state[selected];commit(selected,fit(p.surface,selected,p.x,p.y,(p.orientation+1)%4));});
 $('undo').addEventListener('click',()=>{if(loading||!history.length)return;clearDrag();state=history.pop();selected=null;preferred=null;persist();renderWorld();ui();tell('退回一步，怎麼擺都可以。');});
 $('reset').addEventListener('click',()=>{if(loading)return;clearDrag();history.push(structuredClone(state));state=initialState();selected=null;preferred=null;completed=false;persist();renderWorld();ui();tell('小物都回箱子裡了。這次想怎麼擺呢？');});
 $('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'♫ 音效開':'♫ 音效關';$('sound').setAttribute('aria-pressed',String(sound));if(sound)soundEffect('mug');});
 $('finish').addEventListener('click',()=>{if(loading||!ready(state))return;completed=true;persist();renderWorld();ui();$('completion-title').textContent=level.id==='books'?(saved.met.length===3?'街角，已經多了三位朋友。':'街角，又多了一位朋友。'):'今天，也整理得好好的。';$('ending-text').textContent=level.ending;$('ending-clue').textContent=level.clue;$('next-level').hidden=!level.next;$('next-level').textContent=level.next||'';$('completion').showModal();});$('continue').addEventListener('click',()=>$('completion').close());
 $('zoom-in').addEventListener('click',()=>{zoom=Math.min(2.3,zoom+.2);resize();});$('zoom-out').addEventListener('click',()=>{zoom=Math.max(.7,zoom-.2);resize();});$('zoom-fit').addEventListener('click',()=>{zoom=1;panX=0;panY=0;resize();});
 document.addEventListener('keydown',e=>{if(loading||$('completion').open||$('notebook').open)return;if(e.key==='Escape')deselect();if(e.key.toLowerCase()==='r'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&selected)$('rotate').click();
  if(e.target===app.canvas&&selected&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const p=state[selected],delta=e.shiftKey?.25:.08;let x=p.x,y=p.y;if(e.key==='ArrowLeft')x-=delta;if(e.key==='ArrowRight')x+=delta;if(e.key==='ArrowUp')y-=delta;if(e.key==='ArrowDown')y+=delta;commit(selected,fit(p.surface,selected,x,y,p.orientation));}
 });
}
const catTextures=new Map();
function chapterUI(){
 $('level-nav').innerHTML=levels.map(l=>`<button data-level="${l.id}" aria-current="${l.id===level.id?'step':'false'}" ${loading?'disabled':''}>${l.number} · ${l.title}<small>${saved.levels[l.id]?.completed?'✓ 已整理過':l.place}</small></button>`).join('');
 document.querySelector('.game').setAttribute('aria-label',`${level.place}收納遊戲`);$('day-number').textContent=level.number;$('day-place').textContent=level.place;$('chapter-place').textContent=level.place;$('chapter-subtitle').textContent=level.subtitle;$('letter-author').textContent=level.author;$('chapter-letter').textContent=level.letter;
 document.title=`小日子收納 · ${level.title}`;if(app)app.canvas.setAttribute('aria-label',`${level.place}。可拖放小物、移動畫面；也可使用旁邊的小物與家具按鈕。`);
 const moment=catMoment(level,state,completed),cat=cats[level.cat];if(moment.pose!=='hidden')recordEncounter(level.cat);
 if(level.id!=='home'&&placedCount(level,state)>=3)recordEncounter('cream');
 $('cat-portrait').innerHTML=catAsset(cat,moment.pose);$('cat-name').textContent=saved.met.includes(level.cat)?`${cat.name} · ${cat.detail.split(' · ')[1]}`:'角落裡的小動靜';
 if($('cat-status').textContent!==moment.text)$('cat-status').textContent=moment.text;
 $('greet-cat').disabled=loading||moment.pose==='hidden'||catClock<greetingUntil;$('greet-cat').textContent=catClock<greetingUntil?'先陪牠待一下':moment.pose==='hidden'?'先讓牠安心看看':`輕聲和${cat.name}打招呼`;
 $('met-count').textContent=`${saved.met.length} / 3`;
}
function notebookUI(){
 $('notebook-cats').innerHTML=Object.entries(cats).map(([id,cat])=>`<article class="notebook-entry">${saved.met.includes(id)?catAsset(cat,'sit'):'<span style="width:90px;text-align:center;font-size:32px;color:#b8bca9">?</span>'}<div><strong>${saved.met.includes(id)?cat.name:'還沒見面的鄰居'}</strong><p>${saved.met.includes(id)?cat.habit:'在下一個街角，也許會聽見小小的腳步聲。'}</p><small>${saved.met.includes(id)?cat.detail:'慢慢認識就好'}</small>${saved.met.includes(id)?`<ul class="memory-list">${(saved.memories[id]||[]).map(m=>`<li>${memories[id][m]}</li>`).join('')}</ul><span class="memory-count">發現了 ${(saved.memories[id]||[]).length} 個小習慣 · 不用急著集滿</span>`:''}</div></article>`).join('');
 $('notebook-ending').hidden=!saved.levels.books?.completed;
}
function greetCat(){
 if(loading||catClock<greetingUntil)return;const moment=catMoment(level,state,completed),text=greetingFor(level.cat,moment.pose);if(!text)return;
 recordEncounter(level.cat);remember(level.cat,'hello');greetingUntil=catClock+1600;$('cat-status').textContent=text;$('greet-cat').disabled=true;$('greet-cat').textContent='先陪牠待一下';
 const cat=catSprites.find(c=>c.id===level.cat);if(cat&&['sit','peek'].includes(moment.pose)){cat.originalTexture=cat.sprite.texture;cat.sprite.texture=catTextures.get(`${level.cat}:${moment.pose==='peek'?'peek-blink':'blink'}`);cat.blinkUntil=catClock+1200;}
 soundEffect('letter');
}
function renderCats(){
 catSprites=[];const moment=catMoment(level,state,completed);
 const add=(id,pose,x,y,z=0,scale=.7)=>{const sprite=new Sprite(catTextures.get(`${id}:${pose}`));sprite.width=160*scale;sprite.height=140*scale;const p=project(x,y,z);sprite.position.set(p.x-80*scale,p.y-126*scale);sprite.eventMode='none';world.addChild(sprite);const old=catPositions.get(id),targetX=sprite.x,targetY=sprite.y;catSprites.push({id,sprite,x:targetX,y:targetY,startX:old?.x??targetX,startY:old?.y??targetY,moving:0,phase:catSprites.length*1.5});};
 const restItem=items.find(it=>['blanket','towel','cushion'].includes(it.id)),rest=restItem&&state[restItem.id];
 const resting=rest&&rest.surface!=='box'?{...rest,w:restItem.w,d:restItem.d}:null;
 if(level.id==='home'){
  if(moment.pose==='hidden'||moment.pose==='peek'||moment.pose==='sleep')add('cream',moment.pose,8.05,5.5,.5,.55);
  else if(resting){const p=size(restItem,rest.orientation);add('cream','sit',rest.x+p.w/2,rest.y+p.d/2,surface(rest.surface).z+restItem.h,.6);}
  else add('cream','sit',5.2,6.45,0,.65);
 }else if(level.id==='flowers'){
  if(resting){const p=size(restItem,rest.orientation);add('sesame',completed?'sleep':'sit',rest.x+p.w/2,rest.y+p.d/2,surface(rest.surface).z+restItem.h,.6);}else add('sesame','sit',1.15,5.8,0,.7);
  if(placedCount(level,state)>=3)add('cream','sleep',8.8,7.25,0,.5);
 }else {
  if(moment.pose==='hidden'||moment.pose==='peek')add('ink',moment.pose,surface('shelf-low').x+.55,surface('shelf-low').y+.75,surface('shelf-low').z,.52);
  else if(resting){const p=size(restItem,rest.orientation);add('ink',moment.pose,rest.x+p.w/2,rest.y+p.d/2,surface(rest.surface).z+restItem.h,.6);}else add('ink',moment.pose,4.2,6.4,0,.62);
  if(placedCount(level,state)>=3)add('cream','sleep',8.8,7.25,0,.5);
 }
}
async function changeLevel(id){
 if(loading||id===level.id||!levels.some(l=>l.id===id))return;
 persist();clearDrag();selected=null;preferred=null;pan=null;loading=true;$('scene-host').classList.add('busy');
 catPositions.clear();world.removeChildren().forEach(c=>c.destroy({children:true}));overlay.removeChildren().forEach(c=>c.destroy({children:true}));objects.clear();catSprites=[];tweens=[];
 for(const t of [...textures.values(),...staticTextures.values()])t.destroy(true);textures.clear();staticTextures.clear();for(const key of hitMasks.keys())if(!key.startsWith('cat:'))hitMasks.delete(key);
 greetingUntil=0;level=configureLevel(id);state=restore(id);completed=!!saved.levels[id]?.completed;history=[];zoom=1;panX=0;panY=0;ui();persist();
 try{await loadRoom();renderWorld();resize();tell('不急，先看看便條。每件小物都可以放到喜歡的位置。');}
 catch(error){console.error(error);tell('這個房間暫時沒有載入成功，重新整理頁面可以再試一次。');}
 finally{loading=false;$('scene-host').classList.remove('busy');chapterUI();}
}
async function loadRoom(){
 const jobs=roomJobs(level);
 await Promise.all(Object.entries(jobs).map(async([key,svg])=>staticTextures.set(key,await texture(svg))));
 await Promise.all(items.flatMap(it=>[0,1,2,3].map(async orientation=>{const a=art.objectAsset(it,orientation);textures.set(`${it.id}:${orientation}`,await texture(a.svg,a.width,a.height,`${it.id}:${orientation}`));})));
}
async function start(){
 ui();await loadRoom();
 await Promise.all(Object.entries(cats).flatMap(([id,cat])=>['hidden','peek','sit','sleep','blink','peek-blink'].map(async pose=>catTextures.set(`${id}:${pose}`,await texture(catAsset(cat,pose),160,140,`cat:${id}:${pose}`)))));
 app=new Application();await app.init({width:$('scene-host').clientWidth,height:$('scene-host').clientHeight,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl'});
 app.canvas.setAttribute('aria-label','午後的房間。可拖放小物、移動畫面；也可使用旁邊的小物與家具按鈕。');app.canvas.tabIndex=0;$('scene-host').append(app.canvas);$('loading').remove();
 view=new Container();world=new Container();overlay=new Container();dragLayer=new Container();overlay.eventMode='none';dragLayer.eventMode='none';view.addChild(world,overlay,dragLayer);app.stage.addChild(view);renderWorld();resize();new ResizeObserver(resize).observe($('scene-host'));loading=false;bindInput();chapterUI();
 app.ticker.add(t=>{catClock+=t.deltaMS;if(greetingUntil&&catClock>=greetingUntil){greetingUntil=0;const moment=catMoment(level,state,completed);$('greet-cat').disabled=loading||moment.pose==='hidden';$('greet-cat').textContent=moment.pose==='hidden'?'先讓牠安心看看':`輕聲和${cats[level.cat].name}打招呼`;}for(const cat of catSprites){cat.moving=Math.min(1,cat.moving+t.deltaMS/650);const ease=1-(1-cat.moving)**3;cat.sprite.x=reduced?cat.x:cat.startX+(cat.x-cat.startX)*ease;cat.sprite.y=(reduced?cat.y:cat.startY+(cat.y-cat.startY)*ease+Math.sin(catClock/950+cat.phase)*.8);if(cat.blinkUntil&&catClock>cat.blinkUntil){cat.sprite.texture=cat.originalTexture;cat.blinkUntil=0;}}
 for(const tween of tweens){tween.time+=t.deltaMS;const progress=Math.min(1,tween.time/210);tween.sprite.y=tween.endY-12*(1-progress)**3;}tweens=tweens.filter(t=>t.time<210);});
}
start().catch(error=>{console.error(error);const errorPanel=$('loading')||document.createElement('div');errorPanel.className='loading error';if(!errorPanel.parentNode)$('scene-host').append(errorPanel);errorPanel.innerHTML='房間暫時沒有載入成功。<br>請重新整理頁面，或先試玩 <a href="drawer.html">抽屜小品</a>。';});
