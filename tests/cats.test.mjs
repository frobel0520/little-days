import test from 'node:test';
import assert from 'node:assert/strict';
import {reactionFor,greetingFor,memories} from '../site/cat-behavior.js';
import {configureLevel,items,surfaces,fit,initialState,ready,project,surfaceAt} from '../site/room-model.js';
import {levels} from '../site/levels.js';
test('each chapter uses different support geometry and all props remain freely placeable',()=>{
 const geometries=[];
 for(const level of levels){configureLevel(level.id);geometries.push(JSON.stringify(surfaces.filter(s=>s.accepts).map(({x,y,w,d,z})=>[x,y,w,d,z])));const state=initialState();for(const it of items)state[it.id]=fit('desk',it.id,3,4);assert.ok(ready(state));for(const surface of surfaces.filter(s=>s.accepts)){const p=project(surface.x+surface.w/2,surface.y+surface.d/2,surface.z);assert.equal(surfaceAt(p.x,p.y,items[0].id,0,surface.id).surface,surface.id);}}
 assert.equal(new Set(geometries).size,3);configureLevel('home');
});
test('cat memories react to any valid placement and have no required slot',()=>{
 for(const [levelId,itemId]of [['home','blanket'],['flowers','towel'],['books','cushion']]){const level=configureLevel(levelId),state=initialState();assert.equal(reactionFor(level,state,itemId),null);for(const s of surfaces.filter(s=>s.accepts)){state[itemId]=fit(s.id,itemId,s.x,s.y);const event=reactionFor(level,state,itemId);assert.ok(event&&memories[level.cat][event.memory]);}}
 assert.equal(greetingFor('ink','hidden'),null);assert.ok(greetingFor('ink','peek'));assert.ok(greetingFor('cream','sleep'));configureLevel('home');
});
