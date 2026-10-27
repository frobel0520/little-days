// The second afternoon follows the empty album page in chapter three.
const item = (id, name, kind, w, d, h, color, story, extra = {}) => ({id, name, kind, w, d, h, color, story, ...extra});
const shortNames = {'teapot':'慢泡茶壺','guest-cup':'朋友的杯子','cookies':'午後餅乾','radio':'老收音機','menu':'舊菜單本','invitation':'手寫邀請卡','cafe-mat':'杯墊布','bread-basket':'麵包籃','watering':'澆水壺','seedling':'小樹苗','windchime':'風鈴','laundry-basket':'收衣籃','sun-mat':'向陽軟墊','pegs':'木夾小盒','weather-book':'風向手帳','banner':'街角布旗','camera':'小相機','album':'街角相冊','today-photo':'留白相框','sharing-cup':'朋友的杯子','picnic-mat':'街坊毯子','street-flowers':'花店小花','round-cookies':'下午茶餅乾','old-radio':'老收音機'};
const packed = list => list.map((it, i) => ({...it, shortName:shortNames[it.id]||it.name, initial: {surface:'box', x:Math.min(7.12+(i%3)*.72,9.4-it.w), y:Math.min(4.68+Math.floor(i/3)*.55,6.4-it.d)}}));

export const secondAct = [
 {
  id:'cafe', number:'04', title:'雨停以前的窗邊', place:'轉角咖啡店',
  subtitle:'雨還沒停，先替晚到的人留一個座位。', author:'咖啡店主的便條',
  letter:'書店說想替街坊拍一張新合照。先幫我把下午茶的小物收好吧，雨停了再一起出門。',
  cat:'sesame', restItem:'cafe-mat', catStart:{x:1.2,y:5.8,z:.02},
  visitors:[{id:'cream',pose:'sit',x:8.7,y:7.1,z:.02,appearAt:3}],
  catProgress:{peekAt:0,sitAt:0,hidden:'窗簾後傳來輕輕的呼吸聲。',peek:'芝麻正看著窗上的雨點。',sit:'芝麻坐在窗邊，等熟悉的收音機響起。',rest:'芝麻在杯墊旁瞇起眼睛，今天可以慢慢來。',sleep:'雨停了，芝麻卻還捨不得離開這個暖暖的位置。'},
  layout:{desk:{x:1.2,y:2.6,w:4.5,d:1.9,z:1.5},drawer:{x:.45,y:4.7,w:1.45,d:1.7,z:.65},'shelf-low':{x:6.65,y:.7,w:2.5,d:1.3,z:.95},'shelf-high':{x:6.65,y:.7,w:2.5,d:1.3,z:2.05},floor:{x:2.6,y:5.1,w:3.5,d:2.2,z:.035}},
  surfaceNames:{desk:'咖啡長桌',drawer:'窗邊座椅','shelf-low':'備品櫃','shelf-high':'杯盤架',floor:'窗前地墊',box:'下午茶箱'},
  items:packed([
   item('teapot','慢慢泡的茶壺','teapot',.95,.7,.75,'#c4d1ba','壺嘴有一道淡淡的茶色。店主說，多等一會兒，味道才會剛剛好。'),
   item('guest-cup','留給朋友的杯子','mug',.55,.55,.64,'#efd9b0','新房間裡多留的那只杯子，今天終於等到一起喝茶的人。'),
   item('cookies','剛烤好的餅乾','cookie',.92,.68,.22,'#d7b780','店主多烤了一小盤。「拍合照之前，大家先吃點東西。」'),
   item('radio','有沙沙聲的收音機','radio',1.0,.55,.65,'#b8a68c','雨聲裡混著老歌。芝麻年輕時，也常在這段旋律旁睡著。'),
   item('menu','翻舊的菜單本','book',.74,.95,.14,'#a3b49a','最後一頁寫著街坊的口味，沒有價錢。花店少糖，書店要熱一點。'),
   item('invitation','一張手寫邀請卡','letter',.92,.54,.045,'#eddfc4','「雨停後，到小庭院拍照。」背面有人補了一句：屋頂的布旗還沒收。'),
   item('cafe-mat','曬過太陽的杯墊布','cloth',1.02,.8,.15,'#c8b6a0','原本墊在茶盤下。芝麻認定，這個大小也很適合自己。'),
   item('bread-basket','空了一半的麵包籃','basket',1.0,.76,.53,'#c6a477','籃底壓著兩枚木夾子。店主託你帶到屋頂，順便把布旗收下來。')
  ]),
  reactions:{'radio':{memory:'radio',text:'老歌響起時，芝麻的耳朵轉了一下。這首歌，牠好像一直記得。'},'cafe-mat':{memory:'cafe',text:'杯墊布放好了。芝麻踩了兩下，把雨天也踩得柔軟了一點。'}},
  ending:'最後一滴雨從窗沿落下。芝麻伸了個懶腰，奶油已經在門口等你。',
  clue:'店主把木夾子放進空籃子：「先去屋頂吧，布旗還帶著太陽的味道。」', next:'去屋頂收布旗'
 },
 {
  id:'rooftop', number:'05', title:'風把午後吹乾了', place:'公寓屋頂',
  subtitle:'替晾乾的小物找個家，讓風慢慢經過。', author:'屋頂住戶的委託',
  letter:'布旗乾了，請幫忙收好，晚點帶到庭院。墨墨若跟上來，留一塊軟墊就好，不用催牠靠近。',
  cat:'ink', restItem:'sun-mat', catStart:{x:7.0,y:2.1,z:.02},
  visitors:[{id:'cream',pose:'sleep',x:1.3,y:6.8,z:.02,appearAt:4}],
  catProgress:{peekAt:0,sitAt:3,hidden:'花盆後，藏著一小截黑色尾巴。',peek:'墨墨跟上屋頂了。牠先在花盆旁聽聽風聲。',sit:'墨墨走出陰影，第一次在你面前望向遠處。',rest:'墨墨聞過軟墊，把前腳留在了陽光裡。',sleep:'墨墨在風聲裡睡著了。這次，牠沒有躲回去。'},
  layout:{desk:{x:1.4,y:3.0,w:3.9,d:1.8,z:1.1},drawer:{x:.6,y:1.0,w:1.4,d:2.25,z:.68},'shelf-low':{x:6.5,y:.75,w:2.7,d:1.35,z:.8},'shelf-high':{x:6.5,y:.75,w:2.7,d:1.35,z:1.65},floor:{x:2.1,y:5.0,w:3.7,d:2.25,z:.035}},
  surfaceNames:{desk:'收衣工作台',drawer:'低木凳','shelf-low':'育苗層架','shelf-high':'曬物架',floor:'向陽軟墊區',box:'曬乾的小物'},
  items:packed([
   item('watering','裝了半壺水的澆水壺','watering',.95,.68,.7,'#a8b99b','花店送來的壺。壺底用鉛筆寫著：等土乾了，再慢慢澆。'),
   item('seedling','準備送人的小苗','plant',.68,.68,1.04,'#96ae82','種子來自芝麻看守的花店。等葉子再長大一點，就搬去書店窗邊。'),
   item('windchime','聲音很輕的風鈴','windchime',.56,.56,1.02,'#b8c9c5','風大的時候反而不太響。只有你停下來，才聽得見那一聲。'),
   item('laundry-basket','收衣服的小籃子','basket',1.0,.76,.53,'#cbb28e','咖啡店的籃子剛好裝得下布旗。奶油已經先試坐過了。'),
   item('sun-mat','留在陽光裡的軟墊','cloth',1.04,.82,.18,'#b9c8c0','不是為了讓墨墨出來才放的。只是覺得，這裡很適合休息。'),
   item('pegs','兩枚木夾子的小盒','tin',.74,.58,.28,'#d4c09a','一枚夾住旗子，一枚夾住被風吹翻的日記。少一枚，也總有人願意借。'),
   item('weather-book','記風向的手帳','book',.76,.96,.14,'#afbfca','今天那一格畫了三隻貓，旁邊只寫了：雨後，適合拍照。'),
   item('banner','曬乾的街角布旗','cloth',1.04,.74,.12,'#d2b4a7','布旗上的每一塊顏色都來自不同住戶。縫線有點歪，掛起來卻很好看。')
  ]),
  reactions:{'windchime':{memory:'wind',text:'風鈴輕輕響了一聲。墨墨沒有退後，反而把耳朵轉向你。'},'sun-mat':{memory:'sun',text:'軟墊放好了。墨墨把一隻前腳放進陽光，再慢慢放進另一隻。'}},
  ending:'布旗收好了，手帳也沒有再被風吹翻。你走向樓梯時，墨墨隔了一小段距離跟上來。',
  clue:'庭院裡已經傳來擺杯子的聲音。這次合照，也許不會少任何一個住戶。', next:'到庭院拍合照'
 },
 {
  id:'courtyard', number:'06', title:'相冊裡的今天', place:'街角小庭院',
  subtitle:'把大家帶來的小物放好，也替今天留一個位置。', author:'街坊一起留下的便條',
  letter:'桌子不用排得一樣，杯子也不用成套。等你整理好了，我們就拍照；拍完還可以繼續坐一會兒。',
  cat:'cream', restItem:'picnic-mat', catStart:{x:4.9,y:6.6,z:.02},
  visitors:[{id:'sesame',pose:'sit',x:2.3,y:6.7,z:.02,appearAt:0},{id:'ink',pose:'peek',x:7.0,y:3.0,z:.02,appearAt:0,settleAt:4,settledPose:'sit'}],
  catProgress:{peekAt:0,sitAt:0,hidden:'空箱子裡，傳來熟悉的窸窣聲。',peek:'奶油先到了，正在替大家巡視位置。',sit:'奶油在桌邊等著，芝麻與墨墨也都來了。',rest:'奶油踩上毯子。這次，身邊不只是一個空箱子。',sleep:'快門聲過後，奶油放心睡了。今天的照片裡，三隻貓都在。'},
  layout:{desk:{x:1.1,y:2.6,w:5.1,d:2.1,z:1.2},drawer:{x:.45,y:.9,w:1.4,d:2.2,z:.65},'shelf-low':{x:6.8,y:.65,w:2.5,d:1.3,z:.85},'shelf-high':{x:6.8,y:.65,w:2.5,d:1.3,z:1.8},floor:{x:2.0,y:5.2,w:4.1,d:2.3,z:.035}},
  surfaceNames:{desk:'街坊長桌',drawer:'樹蔭長凳','shelf-low':'花盆矮架','shelf-high':'紀念展示架',floor:'合照前的小毯子',box:'大家帶來的小物'},
  items:packed([
   item('camera','第一天帶來的小相機','camera',.95,.64,.7,'#efbca5','搬來那天，它裝著一張舊合照。今天，鏡頭終於轉向了現在。'),
   item('album','留著最後一頁的相冊','book',.85,1.0,.2,'#cda795','書店店主把它帶來了。最後一頁的角落，已經寫好今天的日期。'),
   item('today-photo','等一張照片的小相框','frame',.92,.38,.83,'#ceb08e','先替空相框找個位置。等你按下「今天收好了」，這裡就會多一張新的合照。',{motif:'blank',reveal_on_complete:'cats',completedName:'今天的合照',completedStory:'奶油打了呵欠，芝麻瞇著眼，墨墨的一隻耳朵朝向鏡頭。沒有人要求重拍。這就是大家一起度過的今天。'}),
   item('sharing-cup','留給晚到朋友的杯子','mug',.55,.55,.64,'#f7e4b6','那只一直多留著的杯子，現在不用再猜會是誰來用了。'),
   item('picnic-mat','大家都能坐的毯子','cloth',1.04,.82,.18,'#c6bbaa','新房間裡那條有太陽味道的毯子，今天攤到了街坊之間。'),
   item('street-flowers','花店帶來的小花','flowers',.68,.68,1.1,'#dda8a5','不用太華麗。和街角的每一天一樣，看見就會想笑一下。'),
   item('round-cookies','留到最後的餅乾','cookie',.94,.7,.22,'#d9b97e','咖啡店主說，碎掉的也很好吃。拍照時，不用每個人都站得整齊。'),
   item('old-radio','唱著老歌的收音機','radio',1.0,.55,.65,'#baa78d','那首歌從咖啡店跟到了庭院。芝麻聽見前奏，就知道可以安心待著。')
  ]),
  reactions:{'camera':{memory:'together',text:'相機放好了。奶油看了看鏡頭，又看了看身邊的兩位鄰居。'},'picnic-mat':{memory:'picnic',text:'毯子放好了。奶油先踩了一角，也替別人留下了一角。'}},
  ending:'快門響起時，奶油剛好打了個呵欠，芝麻瞇著眼，墨墨只有一隻耳朵朝向鏡頭。沒有人要求重拍。',
  clue:'相冊的最後一頁，終於有了今天的合照。旁邊還留著一點空白，給下一個平凡的日子。', next:null
 }
];
