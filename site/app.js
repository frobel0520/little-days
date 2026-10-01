import { levels, dimensions, canPlace, fitInside, isComplete, suggestion, unproject } from './model.js';
import { artwork, sprig } from './art.js';
const $ = id => document.getElementById(id);
const storeKey = 'little-days-v2';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch {}
let levelIndex = Number.isInteger(saved.level) && levels[saved.level] ? saved.level : 0;
let completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(i => levels[i]) : []);
let layouts = saved.layouts || {}, placements = {}, selected = null, rotated = false, history = [], drag = null, preview = null;
let cursor = { x: 2, y: 1.5 }, pointerId = null, suppressClick = false;
const level = () => levels[levelIndex];
function persist() { layouts[levelIndex] = placements; try { localStorage.setItem(storeKey, JSON.stringify({ level: levelIndex, completed: [...completed], layouts })); } catch {} }
function message(text) { $('feedback').textContent = text; $('feedback').classList.remove('warning'); }
function pieceHTML(it, rotation) {
  const [w,h] = dimensions(it, rotation), [ow,oh] = dimensions(it);
  const svg = artwork(it);
  return `<div class="piece-body" style="--color:${it.color}"><div class="object-art" style="width:${rotation ? h/w*100 : 100}%;height:${rotation ? w/h*100 : 100}%;transform:translate(-50%,-50%) rotate(${rotation ? 90 : 0}deg)"><div class="object-side">${svg}</div><div class="object-top">${svg}</div></div></div>`;
}
function load(index) {
  if (levels[levelIndex]) persist(); levelIndex = index; placements = {}; selected = null; rotated = false; history = []; drag = null; cursor = { x: 2, y: 1.5 };
  $('drag-ghost').hidden = true; clearPreview(); if ($('completion').open) $('completion').close();
  for (const [id,p] of Object.entries(layouts[index] || {})) if (p && canPlace(level(), placements, id, p.x, p.y, p.rotated)) placements[id] = p;
  const l = level(); $('scene-number').textContent = `LITTLE DAY ${String(index+1).padStart(2,'0')} / 05`;
  $('scene-title').textContent=l.title; $('scene-caption').textContent=l.subtitle; $('scene-badge').textContent=l.scene; $('tabletop').dataset.theme=l.theme;
  $('board').style.setProperty('--cols',l.cols); $('board').style.setProperty('--rows',l.rows); $('sprig').innerHTML=sprig;
  message('把小物都收進來，就完成了。稍微疊放也沒關係。'); render(); persist();
}
function render() {
  const l=level();
  $('chapters').innerHTML=levels.map((l,i)=>`<button class="chapter ${i===levelIndex?'active':''} ${completed.has(i)?'done':''}" data-level="${i}" ${i===levelIndex?'aria-current="step"':''}><span class="chapter-number">${completed.has(i)?'✓':String(i+1).padStart(2,'0')}</span>${l.scene}</button>`).join('');
  $('total-stars').textContent=`${completed.size} / 5`;
  $('board').innerHTML='<i class="plane-marker" id="plane-origin"></i><i class="plane-marker" id="plane-right"></i><i class="plane-marker" id="plane-bottom"></i>'+Object.entries(placements).map(([id,p],index)=>{
    const it=l.items.find(i=>i.id===id),[w,h]=dimensions(it,p.rotated);
    return `<button class="piece ${selected===id?'selected':''}" data-item="${id}" aria-label="${it.name}，已收納，點選可移動" style="left:${p.x/l.cols*100}%;top:${p.y/l.rows*100}%;width:${w/l.cols*100}%;height:${h/l.rows*100}%;z-index:${index+2}">${pieceHTML(it,p.rotated)}</button>`;
  }).join('');
  const remaining=l.items.filter(i=>!placements[i.id]);
  $('tray').innerHTML=remaining.length?remaining.map(it=>{
    const rot=selected===it.id&&rotated,[w,h]=dimensions(it,rot),factor=Math.min(76/w,62/h);
    return `<button class="tray-item ${selected===it.id?'selected':''}" data-item="${it.id}" aria-label="${it.name}" aria-pressed="${selected===it.id}"><span class="item-preview"><span class="mini-piece" style="width:${w*factor}px;height:${h*factor}px">${pieceHTML(it,rot)}</span></span><span class="item-label">${it.name}</span></button>`;
  }).join(''):'<div class="tray-empty"><span>✳</span>每件小物都找到家了。<br>今天也整理得好好的。</div>';
  $('remaining').textContent=`${remaining.length} 件`; const count=l.items.length-remaining.length;
  $('progress-label').textContent=`${count} / ${l.items.length} 已收好`; $('progress-fill').style.width=`${count/l.items.length*100}%`;
  updateSelection(); $('undo').disabled=!history.length;
}
function updateSelection() { const it=level().items.find(i=>i.id===selected); $('selected-name').textContent=it?it.name:'先挑一件喜歡的小物'; $('rotate').disabled=!it; }
function clearPreview() { preview?.remove(); preview=null; }
function choose(id) { const same=selected===id; selected=id; rotated=same?rotated:(placements[id]?.rotated||false); clearPreview(); render(); message('找個喜歡的位置放下，可以靠近，也可以稍微疊放。'); }
function commit(id,x,y,rotation) {
  const p=fitInside(level(),id,x,y,rotation); if (!p) return false;
  history.push(structuredClone(placements)); delete placements[id]; placements[id]=p;
  selected=null; rotated=false; clearPreview(); render(); persist(); message('收好了，慢慢放下一件吧。');
  if (isComplete(level(),placements)) finish(); return true;
}
function finish() {
  completed.add(levelIndex); persist(); render(); message('都收進來了，今天也好好照顧了小日子。');
  $('completion-copy').textContent='每樣小物都回家了。不用排得完美，這樣就很好。'; $('completion-art').innerHTML=level().items.slice(0,3).map(artwork).join('');
  $('next').textContent=levelIndex===levels.length-1?'回到第一個小日常':'整理下一個小日常'; $('completion').showModal();
}
function plane() {
  const point=id=>{const r=$(id).getBoundingClientRect();return {x:r.x,y:r.y};};
  return {origin:point('plane-origin'),right:point('plane-right'),bottom:point('plane-bottom')};
}
function positionAt(clientX,clientY,offsetX=0,offsetY=0) {
  const {origin,right,bottom}=plane(); const p=unproject({x:clientX,y:clientY},origin,right,bottom,level().cols,level().rows);
  return {x:p.x-offsetX,y:p.y-offsetY,inside:p.x>=-.15&&p.x<=level().cols+.15&&p.y>=-.15&&p.y<=level().rows+.15};
}
function showPreview(x,y) {
  clearPreview(); if(!selected)return;
  const it=level().items.find(i=>i.id===selected),[w,h]=dimensions(it,rotated),p=fitInside(level(),selected,x,y,rotated);
  preview=document.createElement('div'); preview.className='placement-preview';
  preview.innerHTML=pieceHTML(it,rotated); Object.assign(preview.style,{left:`${p.x/level().cols*100}%`,top:`${p.y/level().rows*100}%`,width:`${w/level().cols*100}%`,height:`${h/level().rows*100}%`}); $('board').append(preview);
}
function rotate() { if(!selected||drag)return; rotated=!rotated; clearPreview(); render(); message('轉個方向，照自己的喜好放。'); }
$('chapters').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(b)load(Number(b.dataset.level));});
$('rotate').addEventListener('click',rotate);
$('undo').addEventListener('click',()=>{if(!history.length)return; placements=history.pop();selected=null;clearPreview();render();persist();message('退回一步，慢慢來。');});
$('reset').addEventListener('click',()=>{if(!Object.keys(placements).length)return;history.push(structuredClone(placements));placements={};selected=null;clearPreview();render();persist();message('小物都拿出來了，換個擺法也很好。');});
$('hint').addEventListener('click',()=>{
  if(isComplete(level(),placements)){finish();return;}
  const it=level().items.find(i=>i.id===selected&&!placements[i.id])||level().items.find(i=>!placements[i.id]);
  selected=it.id;rotated=false;render();const p=suggestion(level(),placements,it.id);cursor={x:p.x,y:p.y};showPreview(p.x,p.y);message(`這裡可以放${it.name}，也可以挑別的位置。`);
});
$('next').addEventListener('click',()=>load((levelIndex+1)%levels.length));$('stay').addEventListener('click',()=>$('completion').close());
document.addEventListener('keydown',e=>{
  if($('completion').open)return;
  if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey&&!e.altKey)rotate();
  if(e.key==='Escape'){selected=null;clearPreview();render();}
  if(e.target===$('board')&&selected){
    const step=e.shiftKey?.25:.08;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault(); if(e.key==='ArrowLeft')cursor.x-=step;if(e.key==='ArrowRight')cursor.x+=step;if(e.key==='ArrowUp')cursor.y-=step;if(e.key==='ArrowDown')cursor.y+=step;cursor=fitInside(level(),selected,cursor.x,cursor.y,rotated);showPreview(cursor.x,cursor.y);}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();commit(selected,cursor.x,cursor.y,rotated);}
  }
});
document.addEventListener('pointerdown',e=>{
  const source=e.target.closest('[data-item]');if(!source||e.button!==0||!e.isPrimary)return;
  const id=source.dataset.item,same=selected===id;selected=id;rotated=same?rotated:(placements[id]?.rotated||false);
  const it=level().items.find(i=>i.id===id),[w,h]=dimensions(it,rotated);
  let offsetX=w/2,offsetY=h/2;
  if(placements[id]){const local=positionAt(e.clientX,e.clientY);offsetX=local.x-placements[id].x;offsetY=local.y-placements[id].y;}
  else {const r=source.querySelector('.mini-piece').getBoundingClientRect();offsetX=Math.max(0,Math.min(w,(e.clientX-r.left)/r.width*w));offsetY=Math.max(0,Math.min(h,(e.clientY-r.top)/r.height*h));}
  drag={id,startX:e.clientX,startY:e.clientY,offsetX,offsetY,moving:false,wasPlaced:!!placements[id]};pointerId=e.pointerId;updateSelection();
});
document.addEventListener('pointermove',e=>{
  if(!drag){if(e.target.closest('#board')&&selected){const it=level().items.find(i=>i.id===selected),[w,h]=dimensions(it,rotated),p=positionAt(e.clientX,e.clientY,w/2,h/2);showPreview(p.x,p.y);}return;}
  if(e.pointerId!==pointerId)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6&&!drag.moving)return;
  e.preventDefault();drag.moving=true;const it=level().items.find(i=>i.id===drag.id),[w,h]=dimensions(it,rotated),unit=$('board').clientWidth/level().cols;
  const ghost=$('drag-ghost');ghost.hidden=false;ghost.innerHTML=pieceHTML(it,rotated);Object.assign(ghost.style,{width:`${w*unit}px`,height:`${h*unit}px`,left:`${e.clientX-drag.offsetX*unit}px`,top:`${e.clientY-drag.offsetY*unit}px`});
  const p=positionAt(e.clientX,e.clientY,drag.offsetX,drag.offsetY);if(p.inside)showPreview(p.x,p.y);else clearPreview();document.querySelectorAll(`[data-item="${drag.id}"]`).forEach(s=>s.classList.add('drag-source'));
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==pointerId)return;const d=drag;drag=null;$('drag-ghost').hidden=true;if(!d.moving)return;
  suppressClick=true;setTimeout(()=>suppressClick=false,0);const p=positionAt(e.clientX,e.clientY,d.offsetX,d.offsetY);
  if(p.inside)commit(d.id,p.x,p.y,rotated);
  else if(d.wasPlaced){history.push(structuredClone(placements));delete placements[d.id];selected=d.id;clearPreview();render();persist();message('拿出來了，想換位置隨時都可以。');}
  else{clearPreview();render();message('把小物帶進盒子裡就好。');}
});
document.addEventListener('pointercancel',()=>{drag=null;$('drag-ghost').hidden=true;clearPreview();render();});
document.addEventListener('click',e=>{
  if(suppressClick)return;const source=e.target.closest('[data-item]');if(source){choose(source.dataset.item);return;}
  if(e.target.closest('#board')&&selected){const it=level().items.find(i=>i.id===selected),[w,h]=dimensions(it,rotated),p=positionAt(e.clientX,e.clientY,w/2,h/2);if(p.inside)commit(selected,p.x,p.y,rotated);}
});
$('board').addEventListener('pointerleave',()=>{if(!drag)clearPreview();});
// Avoid overwriting the restored layout when initializing.
const initial=levelIndex;levelIndex=-1;load(initial);
