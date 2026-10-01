import { project, size } from './room-model.js';
const ink = '#766554';
const p = (x,y,z=0) => { const a=project(x,y,z); return [a.x,a.y]; };
const local = (x,y,z=0) => [43*(x-y),22*(x+y)-48*z];
const points = a => a.map(v=>v.join(',')).join(' ');
function polygon(a,fill,stroke=ink,width=1.35) { return `<polygon points="${points(a)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`; }
function path(d,fill='none',stroke=ink,width=1.35){return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;}
function line(a,b,color=ink,width=1.35){return path(`M${a}L${b}`,'none',color,width);}
function ellipse(x,y,rx,ry,fill,stroke=ink){return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.35"/>`;}
function shade(hex,n){return '#'+hex.slice(1).match(/../g).map(c=>Math.max(0,Math.min(255,parseInt(c,16)+n)).toString(16).padStart(2,'0')).join('');}
function box(x,y,z,w,d,h,color,proj=p){
 const a=proj(x,y,z+h),b=proj(x+w,y,z+h),c=proj(x+w,y+d,z+h),e=proj(x,y+d,z+h),bl=proj(x+w,y,z),cl=proj(x+w,y+d,z),el=proj(x,y+d,z);
 return polygon([e,c,cl,el],shade(color,-24))+polygon([b,c,cl,bl],shade(color,-41))+polygon([a,b,c,e],shade(color,12));
}
function plane(x,y,z,w,d,color,proj=p){return polygon([proj(x,y,z),proj(x+w,y,z),proj(x+w,y+d,z),proj(x,y+d,z)],color);}
function svg(body,view='0 0 1000 720'){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"><defs><filter id="soft"><feGaussianBlur stdDeviation="3"/></filter><linearGradient id="window" x2="0" y2="1"><stop stop-color="#c6dcdd"/><stop offset="1" stop-color="#ecf3e7"/></linearGradient></defs><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;}
export function roomBackground(){
 let b='';
 b+=polygon([p(0,0,-.25),p(10,0,-.25),p(10,8,-.25),p(0,8,-.25)],'#b79878');
 b+=polygon([p(10,0,0),p(10,8,0),p(10,8,-.25),p(10,0,-.25)],'#b79371');
 b+=polygon([p(0,8,0),p(10,8,0),p(10,8,-.25),p(0,8,-.25)],'#c6a788');
 b+=plane(0,0,0,10,8,'#e5cfad');
 // Quiet floorboards, not a gameplay grid.
 for(let y=.5;y<8;y+=.5)b+=line(p(0,y,.002),p(10,y,.002),'#ccb38e',.7);
 for(let y=.5;y<8;y+=1)b+=line(p(3.2+(y%2),y-.5,.002),p(3.2+(y%2),y,.002),'#ccb38e',.65);
 b+=polygon([p(0,0,0),p(10,0,0),p(10,0,4.2),p(0,0,4.2)],'#e4e8d6');
 b+=polygon([p(0,0,0),p(0,8,0),p(0,8,4.2),p(0,0,4.2)],'#f2e8d5');
 b+=line(p(0,0,.16),p(10,0,.16),'#c5cbb4',7)+line(p(0,0,.16),p(0,8,.16),'#ded1b9',7);
 b+=line(p(0,0,4.2),p(10,0,4.2),'#f4f4e6',9)+line(p(0,0,4.2),p(0,8,4.2),'#fff7e9',9);
 // A proper vertical window on the left wall.
 b+=polygon([p(.025,1.25,1.65),p(.025,4.35,1.65),p(.025,4.35,3.75),p(.025,1.25,3.75)],'#b79b79');
 b+=polygon([p(.045,1.4,1.82),p(.045,4.2,1.82),p(.045,4.2,3.58),p(.045,1.4,3.58)],'url(#window)');
 for(const y of [1.4,2.8,4.2])b+=line(p(.07,y,1.82),p(.07,y,3.58),'#f9f2e0',6);
 b+=line(p(.07,1.4,2.7),p(.07,4.2,2.7),'#f9f2e0',6);
 b+=box(-.02,1.12,1.61,.37,3.36,.13,'#f2e4ce');
 b+=polygon([p(.085,1.1,3.76),p(.085,1.65,3.76),p(.085,1.55,1.88),p(.085,1.05,1.8)],'#e2bba4');
 b+=polygon([p(.085,3.87,3.76),p(.085,4.47,3.76),p(.085,4.52,1.8),p(.085,4,1.88)],'#e2bba4');
 // Window light falls across the floor.
 b+=polygon([p(.3,1.6,.006),p(.3,3.9,.006),p(4.5,5.3,.006),p(4.5,3,.006)],'#fff5d13d','none');
 // A framed print and a small clock on the other wall.
 b+=polygon([p(4.75,.025,2.4),p(6.1,.025,2.4),p(6.1,.025,3.48),p(4.75,.025,3.48)],'#bc9b76');
 b+=polygon([p(4.88,.045,2.52),p(5.97,.045,2.52),p(5.97,.045,3.35),p(4.88,.045,3.35)],'#f5eddc');
 const print=p(5.4,.07,2.83);b+=ellipse(print[0],print[1],12,18,'#bdccad');b+=path(`M${print[0]-9},${print[1]+18}q14-20 20-34`,'none','#8c9a7b',2);
 const c=p(2.15,.08,3.2);b+=ellipse(c[0],c[1],21,22,'#f6ead1');b+=path(`M${c[0]},${c[1]-12}v13l8 5`,'none','#9b8568',2.2);
 return svg(b);
}
export function rugArt(){
 let b=plane(2.3,4.5,.015,3.5,2.9,'#c4ccaf');
 b+=polygon([p(2.5,4.7,.025),p(5.6,4.7,.025),p(5.6,7.2,.025),p(2.5,7.2,.025)],'#dce1c8','#eff0de',3);
 for(let x=2.4;x<5.8;x+=.2){b+=line(p(x,4.5,.015),p(x,4.33,.015),'#b3bca0',2);b+=line(p(x,7.4,.015),p(x,7.56,.015),'#b3bca0',2);}
 return svg(b);
}
export function deskBase(){
 let b='';
 for(const [x,y] of [[1.24,1.53],[5.1,1.53],[1.24,3.17],[5.1,3.17]]) b+=box(x,y,.03,.2,.2,1.48,'#bfa17e');
 b+=box(1.1,1.4,1.42,4.3,2.15,.2,'#d9b68a');
 b+=line(p(1.33,1.85,1.625),p(4.9,1.85,1.625),'#c2a075',.8);
 b+=box(3.35,2.82,.9,1.6,.5,.55,'#d8b389');
 b+=line(p(3.5,3.33,1.13),p(4.76,3.33,1.13),'#ab8964',1);
 b+=line(p(3.98,3.35,1.19),p(4.27,3.35,1.19),'#f1dfc0',4);
 return svg(b);
}
export function drawerBase(){
 let b=box(1.43,3.54,.82,1.85,1.19,.16,'#c9aa85');
 b+=plane(1.5,3.6,1.08,1.7,1.05,'#edddc2');
 b+=box(1.43,3.54,.97,.075,1.19,.2,'#dabb96');
 b+=box(3.21,3.54,.97,.075,1.19,.2,'#dabb96');
 return svg(b);
}
export function drawerFront(){let b=box(1.43,4.66,.82,1.85,.1,.35,'#d7b68f');b+=line(p(2.05,4.77,1.0),p(2.64,4.77,1.0),'#f1dfc0',4);return svg(b);}
export function shelfBack(){
 let b=box(6.73,.52,0,2.75,.12,3.48,'#d4b592');
 for(const x of [6.73,9.35])b+=box(x,.54,0,.13,1.32,3.54,'#bba181');
 b+=box(6.73,.54,3.46,2.75,1.32,.13,'#dec4a0');
 return svg(b);
}
export function shelfBoard(id){const z=id==='shelf-high'?2.4:1;return svg(box(6.73,.54,z-.12,2.75,1.32,.12,'#d9bd96'));}
export function shelfFront(){return svg(box(9.35,1.7,0,.13,.13,3.54,'#bfa17e')+box(6.73,1.7,0,.13,.13,3.54,'#ceb18c'));}
export function boxBase(){
 let b=box(7,4.55,0,2.45,1.9,.48,'#d4b284');
 b+=plane(7.05,4.6,.48,2.35,1.8,'#bba07c');
 b+=polygon([p(7,4.55,.5),p(9.45,4.55,.5),p(9.45,4.08,.12),p(7,4.08,.12)],'#ddbf92');
 b+=polygon([p(7,4.55,.5),p(7,6.45,.5),p(6.55,6.45,.14),p(6.55,4.55,.14)],'#e2c59b');
 return svg(b);
}
export function boxFront(){let b=box(7,6.42,0,2.45,.06,.48,'#d8b78a');const c=p(8.15,6.49,.22);b+=`<text x="${c[0]}" y="${c[1]}" fill="#99764e" font-size="13" font-family="Georgia" transform="rotate(27 ${c[0]} ${c[1]})">little things ♡</text>`;return svg(b);}
export function stool(){let b='';for(const [x,y]of [[.78,4.85],[1.75,4.85],[.78,5.65],[1.75,5.65]])b+=box(x,y,0,.13,.13,.68,'#ad9172');b+=box(.65,4.72,.65,1.25,1.12,.14,'#bfa27e');b+=box(.7,4.77,.79,1.15,1.02,.12,'#e1bba4');return svg(b);}
export function lamp(){
 const c=p(1.6,1.95,1.73),top=p(1.6,1.95,2.85);
 let b=ellipse(c[0],c[1],20,7,'#bca88b');b+=line(c,top,'#ad987e',5);
 b+=path(`M${top[0]-20},${top[1]-15}L${top[0]-31},${top[1]+18}Q${top[0]},${top[1]+33} ${top[0]+31},${top[1]+18}L${top[0]+20},${top[1]-15}Z`,'#f5e1b5');
 b+=ellipse(top[0],top[1]-15,20,5,'#fff0cf');b+=line([top[0]+24,top[1]+16],[top[0]+24,top[1]+38],'#bba989',1);return svg(b);
}
export function plantDecor(){
 const c=p(.7,6.9,0); let b=path(`M${c[0]-16},${c[1]-24}l5 27q11 7 22 0l5-27Z`,'#d2ad90');b+=ellipse(c[0],c[1]-24,16,6,'#c49c7c');
 for(const [dx,dy,r]of [[-17,-58,15],[15,-74,16],[-2,-92,14],[20,-43,12]]){b+=path(`M${c[0]},${c[1]-22}Q${c[0]+dx},${c[1]+dy+12} ${c[0]+dx},${c[1]+dy}`,'none','#849578',2.5);b+=ellipse(c[0]+dx,c[1]+dy,r,r*.6,'#a5b98c');}return svg(b);
}
export function objectAsset(it,orientation=0){
 const {w,d}=size(it,orientation);const proj=local;
 let b=''; const color=it.color;
 if(it.kind==='cloth'){
 b+=box(0,0,0,w,d,it.h,color,proj);b+=line(proj(.06,d*.4,it.h+.01),proj(w-.06,d*.4,it.h+.01),shade(color,-22),1);b+=line(proj(w*.85,.04,it.h+.01),proj(w*.85,d-.04,it.h+.01),'#f5eadc',3);
 }else if(it.kind==='books'){
 for(let j=0;j<3;j++)b+=box(j*.035,j*.03,j*.15,w-j*.07,d-j*.05,.14,[color,'#deb79b','#b6c2c6'][j],proj);
 }else if(it.kind==='bookend'){
 b+=box(0,0,0,w,d,.1,color,proj);b+=box(w-.12,0,.1,.12,d,it.h-.1,color,proj);
 }else if(it.kind==='frame'){
 b+=box(.08,.08,0,w-.16,d-.08,.13,color,proj);const a=proj(0,d,.05),c=proj(w,d,.05),e=proj(w,d,it.h),f=proj(0,d,it.h);b+=polygon([a,c,e,f],color);b+=polygon([proj(.08,d+.01,.13),proj(w-.08,d+.01,.13),proj(w-.08,d+.01,it.h-.08),proj(.08,d+.01,it.h-.08)],'#e9e4c9');const q=proj(w*.5,d+.02,it.h*.5);b+=ellipse(q[0],q[1],9,7,'#b58e6a');b+=path(`M${q[0]-7},${q[1]-4}l1-8 7 5 6-5 1 9`,'#b58e6a');
 }else if(it.kind==='vase'||it.kind==='flowers'){
 const c=proj(w/2,d/2,0),top=c[1]-it.h*48*(it.kind==='flowers'?.5:1);
 b+=path(`M${c[0]-9},${top}q-4 13-8 23l4 ${c[1]-top-24}q13 10 26 0l4 -${c[1]-top-24}q-4-10-8-23Z`,it.kind==='flowers'?'#ddd2b1':color);b+=ellipse(c[0],top,9,4,'#f3ecd9');
 if(it.kind==='flowers')for(const [dx,dy]of [[-13,-30],[11,-37],[0,-47]]){b+=line([c[0],top+3],[c[0]+dx,top+dy],'#889a71',2);for(let j=0;j<5;j++)b+=ellipse(c[0]+dx+Math.cos(j*1.256)*6,top+dy+Math.sin(j*1.256)*6,5,5,color);b+=ellipse(c[0]+dx,top+dy,3,3,'#efd39a');}
 }else if(it.kind==='watering'){
 b+=box(.15,.1,0,w*.58,d*.8,it.h*.65,color,proj);const c=proj(w*.5,d*.5,it.h*.7);b+=path(`M${c[0]-12},${c[1]}q-8-29 16-28q16 1 13 20`,'none',shade(color,-25),4);const n=proj(.15,d*.55,it.h*.3);b+=path(`M${n[0]},${n[1]}l-29-21-6 4 28 28Z`,color);
 }else if(it.kind==='light'){
 const c=proj(w/2,d/2,0);b+=ellipse(c[0],c[1],17,7,color);b+=line(c,[c[0],c[1]-32],shade(color,-28),4);b+=path(`M${c[0]-10},${c[1]-48}l-12 24q22 12 44 0l-12-24Z`,color);b+=ellipse(c[0],c[1]-48,10,4,'#fff2ce');
 }else if(it.kind==='bag'){
 b+=box(0,0,0,w,d,it.h*.72,color,proj);const c=proj(w*.5,d*.5,it.h*.72);b+=path(`M${c[0]-12},${c[1]}q-5-28 11-28q17 0 15 24`,'none',shade(color,-30),3);const q=proj(w*.5,d,it.h*.4);b+=path(`M${q[0]-7},${q[1]-6}l15 7v15l-15-7Z`,'#f8edce');
 }else if(it.kind==='book'){
 b+=box(0,0,0,w,d,it.h,'#f1e4c9',proj);b+=box(-.018,-.018,it.h-.045,w+.035,d+.035,.06,color,proj);
 b+=line(proj(.08,.06,it.h+.02),proj(.08,d-.05,it.h+.02),'#788b65',2);
 b+=polygon([proj(w*.31,d*.3,it.h+.03),proj(w*.72,d*.3,it.h+.03),proj(w*.72,d*.63,it.h+.03),proj(w*.31,d*.63,it.h+.03)],'#e9edd6','#839774',.9);
 const c=proj(w*.51,d*.46,it.h+.04);b+=path(`M${c[0]-3},${c[1]+3}q5-10 9-9`,'none','#7b926c',1.5);
 b+=polygon([proj(w*.7,.01,it.h+.05),proj(w*.86,.01,it.h+.05),proj(w*.86,.36,it.h+.05),proj(w*.78,.28,it.h+.05),proj(w*.7,.36,it.h+.05)],'#e8a989');
 }else if(it.kind==='letter'){
 b+=box(0,0,0,w,d,.035,color,proj);const z=.045;b+=line(proj(0,0,z),proj(w*.5,d*.58,z),'#b69c7b',1)+line(proj(w,0,z),proj(w*.5,d*.58,z),'#b69c7b',1)+line(proj(0,d,z),proj(w*.38,d*.4,z),'#b69c7b',1)+line(proj(w,d,z),proj(w*.64,d*.4,z),'#b69c7b',1);
 const c=proj(w*.5,d*.57,.055);b+=path(`M${c[0]},${c[1]+3}c-13-7-6-13 0-7 6-6 13 0 0 7Z`,'#d59d86','#ad7e69',.8);
 }else if(it.kind==='tin'){
 b+=box(0,0,0,w,d,it.h,color,proj);b+=box(-.02,-.02,it.h,w+.04,d+.04,.06,shade(color,8),proj);
 const c=proj(w*.5,d*.5,it.h+.07);b+=path(`M${c[0]},${c[1]+6}c-21-12-10-21 0-11 10-10 21-1 0 11Z`,'#f3efd9','#7d9697',1);
 b+=line(proj(.06,d,it.h*.3),proj(w-.06,d,it.h*.3),'#7e9b9f',1);
 }else if(it.kind==='camera'){
 b+=box(0,0,0,w,d,it.h,color,proj);b+=box(.16,.1,it.h,.37,.29,.12,'#f1deba',proj);
 const isBack=orientation>=2;const face=orientation%2===0?'front':'side';const c=proj(face==='front'?w*.48:w,face==='front'?d:d*.48,it.h*.47);
 b+=ellipse(c[0],c[1],15,16,'#e8e7d5');b+=ellipse(c[0]+2,c[1]+1,11,12,'#667d75');b+=ellipse(c[0]+2,c[1]+1,6,7,'#8eaaa0');
 b+=path(`M${c[0]-3},${c[1]-6}q5-4 8 1`,'none','#dce7db',2);
 const flash=proj(.14,d,it.h*.8);b+=path(`M${flash[0]-5},${flash[1]-3}l10 5v5l-10-5Z`,'#f6e8bd',ink,.8);
 if(isBack)b+=line(proj(.08,.1,it.h+.14),proj(w-.08,.1,it.h+.14),'#a28d79',2);
 }else if(it.kind==='mug'){
 const c=proj(w/2,d/2,0),rx=w*31,ry=d*16,top=c[1]-it.h*48;
 const handleSide=orientation%2?-1:1;
 b+=ellipse(c[0]+handleSide*(rx+4),top+14,9,12,'none');
 b+=path(`M${c[0]-rx},${top}v${it.h*48-5}q${rx} 12 ${rx*2} 0v-${it.h*48-5}Z`,color);
 b+=ellipse(c[0],top,rx,ry,'#fff2d5');b+=ellipse(c[0],top,rx-4,ry-3,'#b99b73');
 b+=path(`M${c[0]-6},${top-8}q-5-6 0-12`,'none','#c7b9a188',1.2);
 }else if(it.kind==='plant'){
 const c=proj(w/2,d/2,0),rx=14,top=c[1]-21;
 b+=path(`M${c[0]-rx},${top}l4 20q10 7 20 0l4-20Z`,'#d5a58b');b+=ellipse(c[0],top,rx,6,'#bb8f75');
 b+=path(`M${c[0]},${top-2}q-3-18 2-31`,'none','#749068',2);
 for(const [dx,dy,flip]of [[-9,-12,0],[9,-24,1],[-5,-35,0]]){b+=path(`M${c[0]},${top+dy+6}q${dx*2} -16 ${dx*1.6} -19q${flip?-17:17} 0 ${-dx*1.6} 19Z`,color,'#738b64',1);}
 }
 const minX=-d*43-18,minY=-it.h*48-28,maxX=w*43+22,maxY=(w+d)*22+14;
 return {svg:svg(b,`${minX} ${minY} ${maxX-minX} ${maxY-minY}`),width:maxX-minX,height:maxY-minY,offsetX:minX,offsetY:minY};
}
