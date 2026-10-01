# 小日子收納 · 開發進度

更新：2026-10-01（Asia/Taipei）

狀態：三關敘事試玩已公開；本輪先告一段落，後續聚焦遊戲本體，手機／桌機封裝延後。

公開試玩：https://playmint-little-days.pages.dev/
Cloudflare Pages：`playmint-little-days`，production branch：`main`。

## 已完成

- [x] PixiJS 偽 3D 等角房間、無方格自由收納、各物品自然尺寸與旋轉。
- [x] 改善選取：透明像素穿透、邊緣容錯、重疊輪流選取、清單取回物品。
- [x] 寬鬆通關：小物離開箱子即可手動收尾，容許重疊與自由改擺。
- [x] 三關貓咪故事：搬家房間／奶油、花店／芝麻、書店／墨墨。
- [x] 花店與書店使用獨立家具尺寸、表面高度與佈局。
- [x] 貓咪打招呼、眨眼、呼吸與位置過渡；毛巾／毯子／坐墊引出回應。
- [x] 貓咪筆記保存認識紀錄與可選小習慣，不增加通關條件。
- [x] 各關位置與完成狀態存在 localStorage；測試存檔與玩家進度隔離。
- [x] 20 項測試通過，完成三關本機互動試玩。
- [x] 部署 Cloudflare Pages，公開版載入與相機收納操作驗證通過。

- [x] 比照 Tensift：公開 GitHub repository、Harbor 納管與 Playmint 產品關係。
- [x] 加入 Harbor 產生的維護 middleware 及 `/api/health` 健康檢查。

## 下一步

- [ ] 收集三關試玩回饋，確認操作、節奏、故事與放鬆感。
- [ ] 依回饋細修美術與貓咪反應，補足音效和場景生活感。
- [ ] 確定下一輪關卡內容與物品互動範圍。

## 延後評估

PWA、手機／桌機封裝、雲端存檔、自由尋路、真正堆疊高度與完整素材庫，待核心玩法確定後再排期。目前各網址與各裝置存檔不互通。

## Harbor

已以獨立專案 `little-days` 納管，群組「遊戲」、生命週期「開發中」，登錄公開網址供排程探測。根目錄 `progress.md` 已更新並建立本機 Git 紀錄；已比照 Tensift 推送至公開 GitHub repository `frobel0520/little-days` 的 `main`。Harbor 以 repository 同步 commit／Issues／progress，2026-10-01 13:33（台北）首次文件同步成功，來源為 `progress.md`、3 項待辦；GitHub 同步成功，網站狀態正常。與 Playmint 的關係為同一產品系列；Playmint 入口目前尚未加入此遊戲卡片。
