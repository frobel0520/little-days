import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hitObjects,pickObject,nextOverlap} from '../site/room-picking.js';
const mask=(alpha)=>({alpha,width:3,height:3,displayWidth:3,displayHeight:3});
const camera={id:'camera',x:0,y:0,mask:mask([255,255,255,255,255,255,255,255,255])};
const plant={id:'plant',x:0,y:0,mask:mask([0,0,0,0,255,0,0,0,0])};
test('transparent padding on the front object cannot steal the camera',()=>{
 assert.deepEqual(hitObjects([camera,plant],{x:.5,y:.5}),['camera']);
});
test('overlapping painted pixels follow render order and support deliberate selection',()=>{
 const hits=hitObjects([camera,plant],{x:1.5,y:1.5});
 assert.deepEqual(hits,['plant','camera']);assert.equal(pickObject(hits,null),'plant');assert.equal(pickObject(hits,'camera'),'camera');
 assert.equal(nextOverlap(hits,'plant'),'camera');assert.equal(nextOverlap(hits,'camera'),'plant');
});
test('forgiving edge hits never outrank a directly painted pixel',()=>{
 assert.deepEqual(hitObjects([camera,plant],{x:.5,y:.5},2),['camera']);
 assert.deepEqual(hitObjects([camera],{x:-.5,y:1.5},1),['camera']);
 assert.deepEqual(hitObjects([camera],{x:-10,y:1.5},1),[]);
});

test('edge forgiveness chooses the closest painted object before front order',()=>{
 const distant={...camera,id:'distant',x:2};
 assert.deepEqual(hitObjects([camera,distant],{x:-.5,y:1.5},3),['camera','distant']);
});
