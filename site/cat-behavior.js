export const memories={
 cream:{hello:'蹲下輕聲叫牠，奶油會慢慢眨眼。',blanket:'喜歡剛放好的毯子，但空紙箱永遠有吸引力。',camera:'對相機很好奇，差一點用鼻尖碰到鏡頭。'},
 sesame:{hello:'聽見招呼時，芝麻會瞇起眼睛，繼續享受午後。',towel:'舊毛巾放在哪裡，牠都認得那個熟悉的味道。',photo:'相框裡那隻年輕的三花，就是陪街坊很久的芝麻。'},
 ink:{hello:'不伸手催牠，只輕聲打招呼，墨墨也會回你一個眨眼。',cushion:'聞過新坐墊後，願意留下來休息。',light:'閱讀燈亮著的角落，讓牠慢慢安心。'}
};
const out=(state,id)=>state[id]&&state[id].surface!=='box';
export function reactionFor(level,state,itemId){
 if(!out(state,itemId))return null;
 const events={home:{blanket:['blanket','毯子放好了。奶油探出頭看了一眼，這裡也可以是午睡的地方。'],camera:['camera','奶油好奇地看著相機。照片裡的花店，牠好像很熟悉。']},flowers:{towel:['towel','芝麻認出了舊毛巾的味道，慢慢往這邊靠近。'],photo:['photo','相框安置好了。照片裡年輕的芝麻，和現在一樣喜歡曬太陽。']},books:{cushion:['cushion','墨墨看了看新坐墊。留一點距離，牠會自己過來。'],light:['light','閱讀角有了暖暖的燈。書架後的小尾巴，輕輕動了一下。']}};
 const event=events[level.id]?.[itemId];return event?{memory:event[0],text:event[1]}:null;
}
export function greetingFor(catId,pose){
 if(pose==='hidden')return null;
 return {cream:'奶油慢慢眨了眨眼。牠好像在說：這裡挺好的。',sesame:'芝麻瞇起眼睛，尾巴輕輕繞在身邊。',ink:pose==='peek'?'墨墨在架子後眨了一下眼，沒有再往後躲。':'墨墨安靜地回了一個眨眼。你們又熟悉了一點。'}[catId];
}
