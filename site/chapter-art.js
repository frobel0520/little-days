import {project,surfaces} from './room-model.js';
import * as base from './room-art.js';
const wrap=b=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720"><g stroke="#766554" stroke-width="1.4" stroke-linejoin="round">${b}</g></svg>`;
const pt=(x,y,z=0)=>{const p=project(x,y,z);return `${p.x},${p.y}`;};
const poly=(points,color)=>`<polygon points="${points.join(' ')}" fill="${color}"/>`;
function decor(level){
 let b='';
 if(level.id==='flowers'){
  b+=poly([pt(7.3,.02,3.1),pt(9.15,.02,3.1),pt(9.15,.02,4),pt(7.3,.02,4)],'#e6d4bc');const c=project(8.2,.03,3.55);b+=`<text x="${c.x}" y="${c.y}" transform="rotate(27 ${c.x} ${c.y})" text-anchor="middle" fill="#899273" stroke="none" font-family="Georgia" font-size="18">fleur · 花</text>`;
  for(let i=0;i<5;i++){const p=project(1+i*.63,.08,3.95);b+=`<path d="M${p.x},${p.y}q-16 14-7 34" fill="none" stroke="#9da984" stroke-width="3"/><ellipse cx="${p.x-9}" cy="${p.y+23}" rx="8" ry="4" fill="#b6c4a0"/>`;}
 }else if(level.id==='books'){
  b+=poly([pt(3.2,.02,3.2),pt(5.1,.02,3.2),pt(5.1,.02,4),pt(3.2,.02,4)],'#d6c5a9');const p=project(4.1,.03,3.6);b+=`<text x="${p.x}" y="${p.y}" transform="rotate(27 ${p.x} ${p.y})" text-anchor="middle" fill="#7d715f" stroke="none" font-family="Georgia" font-size="16">books &amp; cats</text>`;
  for(let i=0;i<8;i++){const x=1.2+i*.36;b+=poly([pt(x,.08,.3),pt(x+.3,.08,.3),pt(x+.3,.08,1.1+i%3*.18),pt(x,.08,1.1+i%3*.18)],['#b7b99d','#d0ab94','#b0bfc1'][i%3]);}
 }
 return wrap(b);
}
function shade(hex,n){return '#'+hex.slice(1).match(/../g).map(c=>Math.max(0,Math.min(255,parseInt(c,16)+n)).toString(16).padStart(2,'0')).join('');}
function cuboid(x,y,z,w,d,h,color){return poly([pt(x,y+d,z+h),pt(x+w,y+d,z+h),pt(x+w,y+d,z),pt(x,y+d,z)],shade(color,-22))+poly([pt(x+w,y,z+h),pt(x+w,y+d,z+h),pt(x+w,y+d,z),pt(x+w,y,z)],shade(color,-35))+poly([pt(x,y,z+h),pt(x+w,y,z+h),pt(x+w,y+d,z+h),pt(x,y+d,z+h)],shade(color,10));}
const surface=id=>surfaces.find(s=>s.id===id);
function table(s,color,bench=false){let b='';for(const [x,y]of [[s.x+.08,s.y+.08],[s.x+s.w-.22,s.y+.08],[s.x+.08,s.y+s.d-.22],[s.x+s.w-.22,s.y+s.d-.22]])b+=cuboid(x,y,0,.15,.15,s.z-.12,shade(color,-15));b+=cuboid(s.x,s.y,s.z-.12,s.w,s.d,.12,color);if(bench)b+=cuboid(s.x-.08,s.y,s.z,.08,s.d,.36,color);return wrap(b);}
function rug(s,color){let b=poly([pt(s.x-.1,s.y-.1,.015),pt(s.x+s.w+.1,s.y-.1,.015),pt(s.x+s.w+.1,s.y+s.d+.1,.015),pt(s.x-.1,s.y+s.d+.1,.015)],shade(color,-15));b+=poly([pt(s.x,s.y,.02),pt(s.x+s.w,s.y,.02),pt(s.x+s.w,s.y+s.d,.02),pt(s.x,s.y+s.d,.02)],color);return wrap(b);}
function readingLamp(s){const c=project(s.x+.35,s.y+.4,s.z),t=project(s.x+.35,s.y+.4,s.z+.85);return wrap(`<ellipse cx="${c.x}" cy="${c.y}" rx="14" ry="5" fill="#c4b795"/><path d="M${c.x},${c.y}L${t.x},${t.y}" stroke-width="4"/><path d="M${t.x-13},${t.y-10}l-8 21q21 9 42 0l-8-21Z" fill="#eedfba"/>`);}
export function roomJobs(level){
 let background=base.roomBackground(),jobs={background,rug:base.rugArt(),desk:base.deskBase(),decor:decor(level),drawer:base.drawerBase(),drawerFront:base.drawerFront(),shelf:base.shelfBack(),'shelf-low':base.shelfBoard('shelf-low'),'shelf-high':base.shelfBoard('shelf-high'),shelfFront:base.shelfFront(),box:base.boxBase(),boxFront:base.boxFront(),stool:base.stool(),lamp:base.lamp(),plantDecor:base.plantDecor()};
 if(level.id==='home')return jobs;
 const flower=level.id==='flowers',desk=surface('desk'),bench=surface('drawer'),low=surface('shelf-low'),high=surface('shelf-high'),top=flower?3:3.7,wood=flower?'#bcc2a5':'#bca488';
 jobs.background=background.replaceAll('#e4e8d6',flower?'#e9ded0':'#dadfe0').replaceAll('#f2e8d5',flower?'#e7edde':'#eee2cb').replaceAll('#e2bba4',flower?'#c1c9ae':'#b5bfbe');
 jobs.desk=table(desk,wood);jobs.drawer=table(bench,flower?'#d4c3a5':'#b9c4b9',true);jobs.drawerFront=wrap('');jobs.rug=rug(surface('floor'),flower?'#e5d6be':'#ccd6d3');jobs.stool=wrap('');jobs.lamp=flower?wrap(''):readingLamp(bench);
 let back=cuboid(low.x-.12,low.y-.1,0,low.w+.24,.12,top,'#d2b99b')+cuboid(low.x-.12,low.y-.1,top,low.w+.24,low.d+.22,.12,wood);
 for(const x of [low.x-.12,low.x+low.w])back+=cuboid(x,low.y-.1,0,.12,low.d+.22,top,wood);
 jobs.shelf=wrap(back);jobs.shelfFront=wrap(cuboid(low.x-.12,low.y+low.d,0,.12,.12,top,wood)+cuboid(low.x+low.w,low.y+low.d,0,.12,.12,top,wood));
 for(const s of [low,high])jobs[s.id]=wrap(cuboid(s.x-.12,s.y-.1,s.z-.12,s.w+.24,s.d+.22,.12,'#d6bea1'));
 return jobs;
}
export function catAsset(cat,pose){
 const ink=cat.color==='#555b59'?'#454b47':'#826c56',fill=cat.color;
 let b=`<ellipse cx="80" cy="123" rx="43" ry="10" fill="#716451" opacity=".12" stroke="none"/>`;
 if(pose==='hidden')b+=`<path d="M70 124q-25-30-7-43q22-15 20 5q-2 12-12 9" fill="none" stroke="${fill}" stroke-width="10"/>`;
 else {
  b+=`<path d="M109 119q40-20 20-48q-10-11-14 1" fill="none" stroke="${fill}" stroke-width="11"/>`;
  b+=`<ellipse cx="83" cy="${pose==='sleep'?112:101}" rx="${pose==='sleep'?43:30}" ry="${pose==='sleep'?20:31}" fill="${fill}"/>`;
  const y=pose.startsWith('peek')?95:pose==='sleep'?103:63;
  b+=`<path d="M49 ${y+10}L48 ${y-28}L69 ${y-14}Q83 ${y-20} 97 ${y-14}L115 ${y-29}L118 ${y+10}Q119 ${y+32} 83 ${y+34}Q49 ${y+32} 49 ${y+10}Z" fill="${fill}" stroke="${ink}"/>`;
  b+=`<path d="M53 ${y-18}l2 18 11-10M111 ${y-18}l-2 18-11-10" fill="#d6a69c" stroke="none"/>`;
  if(cat.name==='奶油')b+=`<path d="M71 ${y+8}q12-10 23 0l5 18q-17 13-33 0Z" fill="${cat.accent}" stroke="none"/><path d="M76 ${y-16}l3 10m8-11v9m9-6-3 6" stroke="#b37d4d" stroke-width="3"/>`;
  if(cat.name==='芝麻')b+=`<path d="M51 ${y-5}q15-19 26-5l-4 20-18 2Z" fill="#b88764" stroke="none"/><path d="M94 ${y-13}q17 0 19 22l-14 3Z" fill="#60645b" stroke="none"/>`;
  b+=(pose==='sleep'||pose.endsWith('blink'))?`<path d="M62 ${y+11}q5-5 10 0m22 0q5-5 10 0" fill="none" stroke="${ink}" stroke-width="2"/>`:`<ellipse cx="68" cy="${y+8}" rx="2.5" ry="3.5" fill="${cat.name==='墨墨'?'#cfcb8c':ink}" stroke="none"/><ellipse cx="100" cy="${y+8}" rx="2.5" ry="3.5" fill="${cat.name==='墨墨'?'#cfcb8c':ink}" stroke="none"/>`;
  b+=`<path d="M80 ${y+18}l5 0-2 3Z" fill="#c9958c" stroke="none"/><path d="M83 ${y+21}q-4 5-7 2m7-2q4 5 7 2M60 ${y+18}l-17-3m17 9-17 2m63-8 17-3m-17 9 17 2" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  if(pose==='sit'||pose==='blink')b+=`<path d="M70 98l-2 24q7 5 13 0m10-24 4 24q-7 5-13 0" fill="${cat.accent}" stroke="${ink}"/>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140"><g stroke-linecap="round" stroke-linejoin="round">${b}</g></svg>`;
}
