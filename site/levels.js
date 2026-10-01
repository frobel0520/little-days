const homeItems = [
  { id: 'camera', name: '小相機', kind: 'camera', w: .95, d: .64, h: .7, color: '#efbca5', initial: { surface: 'box', x: 7.23, y: 4.78 } },
  { id: 'book', name: '草綠手帳', kind: 'book', w: .72, d: .95, h: .13, color: '#a9bd91', initial: { surface: 'box', x: 8.24, y: 5.0 } },
  { id: 'mug', name: '奶油馬克杯', kind: 'mug', w: .55, d: .55, h: .64, color: '#f7e4b6', initial: { surface: 'box', x: 7.35, y: 5.61 } },
  { id: 'plant', name: '小盆栽', kind: 'plant', w: .64, d: .64, h: 1.04, color: '#93ad82', initial: { surface: 'box', x: 8.1, y: 5.69 } },
  { id: 'tin', name: '小寶物盒', kind: 'tin', w: .84, d: .61, h: .35, color: '#aac9d0', initial: { surface: 'box', x: 8.47, y: 4.63 } },
  { id: 'letter', name: '一封來信', kind: 'letter', w: .92, d: .54, h: .045, color: '#f4dfc0', initial: { surface: 'box', x: 8.38, y: 5.7 } }
];const make=(id,name,kind,w,d,h,color,story)=>({id,name,kind,w,d,h,color,story});
function packed(list){return list.map((it,i)=>({...it,initial:it.initial||{surface:'box',x:Math.min(7.12+(i%3)*.72,9.4-it.w),y:Math.min(4.68+Math.floor(i/3)*.55,6.4-it.d)}}));}
const homeStories={camera:'相機的背帶裡夾著一張合照。照片中的橘白貓，坐在街角花店門口。',book:'第一頁只寫了「搬來的第一天」。後面的日子，還空著。',mug:'房東多留了一只杯子：「以後有朋友來，就用得上。」',plant:'窗邊的新住戶。葉子還帶著花店貼上的小標籤。',tin:'裝著鑰匙、鈕扣，還有一個不知道配哪扇門的鑰匙圈。',letter:'「奶油如果在箱子裡，先讓牠睡。東西晚一點整理也沒關係。」'};
export const cats={
 cream:{name:'奶油',color:'#dfa469',accent:'#fff0d8',detail:'橘白貓 · 紙箱巡查員',habit:'空箱要留一個。牠喜歡陪人拆箱，再把箱子變成床。'},
 sesame:{name:'芝麻',color:'#f0ddc5',accent:'#bd865f',detail:'三花貓 · 花店的老住戶',habit:'喜歡舊毛巾與午後陽光。街坊年輕時的照片裡，也找得到牠。'},
 ink:{name:'墨墨',color:'#555b59',accent:'#858d83',detail:'黑貓 · 安靜的觀察員',habit:'先躲起來看看。願意在你面前坐下，就是牠打招呼的方式。'}
};
export const levels=[
 {id:'home',number:'01',title:'箱子裡的新室友',place:'午後的房間',subtitle:'搬來的第一天，先替小物找個家。',author:'房東的便條',letter:'東西慢慢放就好。奶油如果在箱子裡，先讓牠睡。',cat:'cream',surfaceNames:{},
  items:packed([...homeItems.map(it=>({...it,story:homeStories[it.id]})),make('blanket','折好的毯子','cloth',1.05,.8,.15,'#c7baaa','洗過的毯子有太陽的味道。放在哪裡，都可以是休息的地方。')]),
  ending:'奶油繞了一圈，又回到空箱裡。這間新房間，已經有另一個住戶了。',clue:'相機裡的舊合照，指向街角那間花店。',next:'去花店幫忙'},
 {id:'flowers',number:'02',title:'花店的窗邊',place:'街角花店',subtitle:'替重新開門的小店，留一個曬太陽的位置。',author:'花店老闆的委託',letter:'明天要重新開門了。那條舊毛巾請留著，芝麻用了好多年。',cat:'sesame',layout:{desk:{x:1.6,y:3,w:3.8,d:1.65,z:1.45},drawer:{x:.4,y:1.4,w:1.3,d:2.1,z:1.1},'shelf-low':{x:6.6,y:.65,w:2.55,d:1.2,z:.9},'shelf-high':{x:6.6,y:.65,w:2.55,d:1.2,z:1.95},floor:{x:2.2,y:5.3,w:3.4,d:2.1,z:.035}},surfaceNames:{desk:'工作桌','shelf-low':'矮層架','shelf-high':'花架',drawer:'窗邊長凳',floor:'窗邊地墊',box:'備品箱'},
  items:packed([
   make('flowers','一束小花','flowers',.68,.68,1.1,'#dfa29f','芝麻小時候會追緞帶，現在只負責看大家包花。'),
   make('vase','玻璃花瓶','vase',.6,.6,.86,'#b9d3ca','瓶底還貼著開店那年留下的標籤。'),
   make('watering','澆水壺','watering',.95,.68,.7,'#a7b7a1','握把磨得光滑。每天澆花的人，已經用了好多年。'),
   make('seeds','種子罐','tin',.6,.56,.46,'#d9c28b','「等秋天到了，再種一盆給隔壁書店。」'),
   make('ribbon','緞帶盒','tin',.86,.66,.3,'#dbb1a6','有些緞帶剪得特別短，是以前陪芝麻玩的那幾條。'),
   make('orders','訂單簿','book',.72,.92,.13,'#acb7a3','最新一筆訂單來自舊書店：一束不用太華麗的小花。'),
   make('photo','街坊合照','frame',.92,.38,.83,'#ceb08e','年輕的芝麻坐在前排。照片後方，是街角的舊書店。'),
   make('towel','芝麻的舊毛巾','cloth',1.05,.82,.15,'#cbbba1','邊角有一點磨損。芝麻認得這個味道，放在哪裡牠都會找到。')]),
  ending:'芝麻在舊毛巾上趴下。門口的奶油也安靜了，花店明天又要開門了。',clue:'相框裡的芝麻，比現在年輕很多。牠一直陪著這條街。',next:'去舊書店看看'},
 {id:'books',number:'03',title:'書架後的一雙眼睛',place:'巷口舊書店',subtitle:'慢慢整理，給怕生的小住戶一點時間。',author:'書店店主的委託',letter:'書可以照你喜歡的方式放。若聽到架子後有聲音，輕一點就好。',cat:'ink',layout:{desk:{x:3.1,y:4,w:3.15,d:1.6,z:1.2},drawer:{x:.7,y:2,w:1.4,d:2.35,z:.72},'shelf-low':{x:6.45,y:.65,w:2.85,d:1.3,z:.95},'shelf-high':{x:6.45,y:.65,w:2.85,d:1.3,z:2.25},floor:{x:1.35,y:5.15,w:3.45,d:2.2,z:.035}},surfaceNames:{desk:'閱讀桌','shelf-low':'低書架','shelf-high':'上層書架',drawer:'閱讀長凳',floor:'閱讀角',box:'舊書箱'},
  items:packed([
   make('stack','待整理的書','books',.88,.8,.45,'#a8b39c','書角有小小的壓痕。有人常在這疊書旁邊午睡。'),
   make('bookend','木頭書擋','bookend',.55,.65,.67,'#c6a988','店主自己磨的木頭書擋，摸起來沒有尖角。'),
   make('light','閱讀燈','light',.62,.62,1,'#e3c898','晚上打烊前，店主總會多留一盞燈。'),
   make('tea','店主的茶杯','mug',.55,.55,.64,'#cbd5bf','茶杯旁邊以前有一只小碟子，現在留給了墨墨。'),
   make('marks','書籤盒','tin',.76,.55,.28,'#b8becd','書籤上的小花，是花店老闆畫的。'),
   make('cushion','柔軟的坐墊','cloth',1.06,.85,.23,'#b8c5bf','不用放得特別整齊。找一個你覺得舒服的位置就好。'),
   make('album','街角舊相冊','book',.85,1,.2,'#cda795','同一條街、不同年份的貓。最後一頁留白，等著新的合照。'),
   make('returns','待歸還的書袋','bag',.82,.68,.8,'#dfcfac','袋子上寫著花店的名字。原來大家的生活一直連在一起。')]),
  ending:'墨墨終於走出書架，在坐墊旁休息。奶油趴在門口，誰都沒有催牠。',clue:'「下次把現在的牠們也拍進去吧。」店主把相冊的最後一頁留給你。',next:null}
];
export function placedCount(level,state){return level.items.filter(it=>state[it.id]&&state[it.id].surface!=='box').length;}
export function catMoment(level,state,completed=false){
 const count=placedCount(level,state),out=id=>state[id]&&state[id].surface!=='box';
 if(level.id==='home')return count<2?{pose:'hidden',text:'箱子裡偶爾傳來窸窣聲。'}:count<4?{pose:'peek',text:'奶油探出頭了。原來箱子裡還有一位新室友。'}:completed?{pose:'sleep',text:'奶油把空箱子當成了自己的床。'}:{pose:'sit',text:out('blanket')?'奶油找到毯子，踩了踩，正在旁邊陪你整理。':'奶油爬出箱子，正在巡視你的新房間。'};
 if(level.id==='flowers')return {pose:completed?'sleep':'sit',text:completed?'芝麻找到了舊毛巾，安安穩穩地趴下了。':out('towel')?'芝麻認得那條毛巾，正在旁邊陪你整理。':count>=3?'奶油也來了，芝麻只是輕輕甩了一下尾巴。':'芝麻坐在矮櫃旁，慢慢看著你整理。'};
 return count<4?{pose:'hidden',text:'書架後面，露出一小截黑色尾巴。'}:count<7?{pose:'peek',text:'墨墨探出耳朵，還在觀察你。'}:{pose:completed?'sleep':'sit',text:completed?'墨墨願意留在你面前休息了。':out('cushion')?'墨墨聞了聞坐墊，安靜地留在閱讀角。':'墨墨走出書架，聞了聞閱讀角的新味道。'};
}
