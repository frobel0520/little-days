// Sprite bounds contain transparent padding. Pick painted pixels, in render order.
export function paintedAt(mask, x, y) {
 const px=Math.floor(x*mask.width/mask.displayWidth),py=Math.floor(y*mask.height/mask.displayHeight);
 return px>=0&&py>=0&&px<mask.width&&py<mask.height&&mask.alpha[py*mask.width+px]>32;
}
export function hitObjects(entries, point, tolerance=0) {
 const exact=[],near=[];
 for(const entry of entries){
  const x=point.x-entry.x,y=point.y-entry.y;
  if(paintedAt(entry.mask,x,y)){exact.unshift(entry.id);continue;}
  if(tolerance<=0||x< -tolerance||y< -tolerance||x>entry.mask.displayWidth+tolerance||y>entry.mask.displayHeight+tolerance)continue;
  let distance=Infinity;
  for(let dy=-tolerance;dy<=tolerance;dy+=1)for(let dx=-tolerance;dx<=tolerance;dx+=1)if(dx*dx+dy*dy<=tolerance*tolerance&&paintedAt(entry.mask,x+dx,y+dy)){distance=Math.min(distance,dx*dx+dy*dy);}
  if(Number.isFinite(distance))near.unshift({id:entry.id,distance});
 }
 return exact.length?exact:near.sort((a,b)=>a.distance-b.distance).map(entry=>entry.id);
}
export function pickObject(ids, selected){return ids.includes(selected)?selected:ids[0]??null;}
export function nextOverlap(ids, selected){const index=ids.indexOf(selected);return ids[(index+1)%ids.length]??null;}
