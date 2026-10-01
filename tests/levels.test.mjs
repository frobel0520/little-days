import test from 'node:test';
import assert from 'node:assert/strict';
import {levels,catMoment} from '../site/levels.js';
import {configureLevel,items,surfaces,initialState,isValid,fit,ready} from '../site/room-model.js';
import {objectAsset} from '../site/room-art.js';
import {roomJobs,catAsset} from '../site/chapter-art.js';
import {cats} from '../site/levels.js';
test('each chapter has valid natural-sized props, art, and relaxed completion',()=>{
 for(const level of levels){
  configureLevel(level.id);const state=initialState();assert.equal(ready(state),false);assert.equal(new Set(items.map(it=>it.id)).size,items.length);
  for(const it of items){assert.ok(isValid(it.id,state[it.id]),`${level.id}:${it.id}`);assert.ok(it.story);for(let orientation=0;orientation<4;orientation++){const a=objectAsset(it,orientation);assert.ok(a.svg.includes('<svg'));assert.ok(a.width>0&&a.height>0);assert.ok(!a.svg.includes('NaN'));}state[it.id]=fit('desk',it.id,2,2);}
  assert.ok(ready(state),'no precise slots or overlap rejection');for(const s of surfaces.filter(s=>s.accepts))for(const it of items)assert.ok(fit(s.id,it.id,s.x,s.y));
  assert.ok(roomJobs(level).decor.includes('<svg'));
 }
 configureLevel('home');
});
test('cat introductions progress without becoming a completion requirement',()=>{
 for(const level of levels){configureLevel(level.id);const state=initialState();for(let i=0;i<items.length;i++){state[items[i].id]=fit('desk',items[i].id,2,2);const m=catMoment(level,state);assert.ok(['hidden','peek','sit','sleep'].includes(m.pose));}assert.ok(ready(state));assert.equal(catMoment(level,state,true).pose,'sleep');}
 configureLevel('home');const state=initialState();assert.equal(catMoment(levels[0],state).pose,'hidden');state.camera=fit('desk','camera',2,2);state.book=fit('desk','book',2,2);assert.equal(catMoment(levels[0],state).pose,'peek');
 for(const cat of Object.values(cats))for(const pose of ['hidden','peek','sit','sleep'])assert.ok(catAsset(cat,pose).includes('<svg'));
});
