import test from 'node:test';
import assert from 'node:assert/strict';
import {levels,dimensions,canPlace,fitInside,isComplete,suggestion,unproject} from '../site/model.js';
for(const l of levels) test(`${l.scene}: relaxed completion with all objects`,()=>{
  const p=Object.fromEntries(l.items.map(i=>[i.id,fitInside(l,i.id,.23,.41)]));
  assert.ok(isComplete(l,p),'layering is allowed');
  delete p[l.items[0].id];assert.equal(isComplete(l,p),false);
  const hint=suggestion(l,p,l.items[0].id);assert.ok(canPlace(l,p,l.items[0].id,hint.x,hint.y));
});
test('natural sizes, fractional coordinates, rotation and forgiving edges',()=>{
  const l=levels[0],book=l.items[0],camera=l.items[1];
  assert.notDeepEqual(dimensions(book),dimensions(camera));
  assert.deepEqual(dimensions(book,true),dimensions(book).toReversed());
  assert.ok(canPlace(l,{},'book',.123,.567));
  assert.ok(canPlace(l,{camera:{x:0,y:0}},'book',0,0));
  assert.equal(canPlace(l,{},'book',-1,0),false);
  assert.equal(canPlace(l,{},'book',NaN,0),false);
  assert.equal(canPlace(l,{},'missing',0,0),false);
  for(const rotated of [false,true]){const p=fitInside(l,'book',10,-2,rotated);assert.ok(canPlace(l,{},'book',p.x,p.y,rotated));}
});
test('inverse oblique projection for drag, including resize',()=>{
  for(const scale of [1,.55]){
    const origin={x:100,y:80},right={x:100+600*scale,y:80-72*scale},bottom={x:100+92*scale,y:80+312*scale};
    const x=2.317,y=1.289;
    const screen={x:origin.x+(right.x-origin.x)*x/6+(bottom.x-origin.x)*y/4,y:origin.y+(right.y-origin.y)*x/6+(bottom.y-origin.y)*y/4};
    const p=unproject(screen,origin,right,bottom,6,4);assert.ok(Math.abs(p.x-x)<1e-10);assert.ok(Math.abs(p.y-y)<1e-10);
  }
});
