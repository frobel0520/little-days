# 小日子收納 · Little Days

Playmint 的瀏覽器收納遊戲原型。首頁「午後的房間」使用 PixiJS 8.21.0、固定等角投影與原創 SVG 插畫，包含三個貓咪故事關卡，使用 2.5D 房間、家具高度、遮擋與自由拖放。美術與互動方向見[參考基準](docs/reference-baseline.md)。

## 遊玩

三關可自由切換，分別有 7／8／8 件自然尺寸小物：

| 關卡 | 空間與委託 | 貓咪與線索 |
| --- | --- | --- |
| 箱子裡的新室友 | 搬家房間，替七件小物找家 | 奶油隨整理進度探頭、出箱，舊照片指向花店 |
| 花店的窗邊 | 重新開門的花店，整理備品並留下舊毛巾 | 芝麻與奶油一起出現，合照連到書店 |
| 書架後的一雙眼睛 | 書店閱讀角，安排書與軟墊 | 墨墨由躲藏到靠近，舊相冊留下下一次合照的約定 |

小物可以放到不同高度的家具表面。沒有方格、倒數、指定答案或填滿要求；可自由移動、轉向，也容許重疊。拿出全部小物後，由玩家按「今天收好了」收尾，之後仍可繼續整理。貓咪露面、姿態與收尾故事不要求精準擺位，也不需要等待動畫完成。選取物品可讀取小故事；「貓咪筆記」記錄已認識的三隻貓。

直接拖放，或選擇小物後點家具按鈕／場景表面。選取依照插畫的不透明像素，邊緣有少量容錯；同一重疊位置再次點選可輪流換選，拖動優先拿起已選小物。選取後有淡色輪廓顯示，遮住的物品也可從清單選取並拖出。空白處點選或「取消」可解除選取。R 轉向；選好物品並聚焦畫布後，方向鍵微調、Shift 加速。Escape 取消選取，空白處拖動畫面；右下角可縮放。支持撤銷、重整與可選音效。各關位置、完成紀錄與貓咪筆記分別保存在瀏覽器 localStorage；原有單房間位置會帶入第一關。

舊版五個抽屜場景保留在 `drawer.html`，使用獨立進度。

## 本機預覽

```sh
npm run dev
```

開啟 http://127.0.0.1:4317 。Node.js 22+；已保留本機渲染模組，可直接預覽。更新依賴時：

```sh
npm ci
npm run vendor
npm test
```

## 結構

- `site/levels.js`：三關物品、委託、故事與貓咪露面進度。
- `site/cat-behavior.js`：打招呼、擺放回應與可保存的小習慣。
- `site/chapter-art.js`：各關場景色彩、裝飾與貓咪姿態插畫。
- `site/room-model.js`：連續座標、等角投影反算、表面高度、邊緣容錯與寬鬆完成條件。
- `site/room-art.js`：原創房間、家具分層與四方向小物 SVG。
- `site/room.js`：PixiJS 渲染、表面內排序、前景遮擋、拖放、縮放、音效與本機進度。
- `site/room.css`：桌機與手機介面。
- `site/vendor/`：PixiJS 靜態模組及 MIT 授權；`npm run vendor` 可重建。

公開試玩：https://playmint-little-days.pages.dev/ 。部署至 Cloudflare Pages 的 `playmint-little-days` 專案，只上傳 `site/`；執行 `npm run deploy` 更新。進度保存在各裝置、各網址的瀏覽器中，本機存檔不會自動同步至公開版。

`site/` 可部署至靜態主機。字體由 Google Fonts 提供，離線時回退系統字體。本版是三關敘事試玩，花店使用包花桌、窗邊長凳與低花架；書店使用矮閱讀桌、閱讀長凳與高書架，三關的表面位置、尺寸與高度各自獨立。舊存檔在家具改位後會輕輕收回可放置範圍。可輕點貓咪或按側邊按鈕打招呼；放好毛巾、毯子、坐墊與故事物品會帶出不同回應，小習慣記在筆記中，不影響通關。貓咪使用躲藏、探頭、坐下、休息與眨眼姿態，有簡單呼吸及位置過渡，尚未包含自由尋路、物品堆疊高度或完整素材庫。`?playtest=1` 使用獨立測試存檔，不讀取玩家的進度。

## 進度與追蹤

開發狀態與下一步見 [progress.md](progress.md)。Harbor 以 `little-days` 獨立納管公開網址；追蹤公開 GitHub repository `frobel0520/little-days` 的 `main` 與根目錄 `progress.md`；遊戲屬於 Playmint 系列。

與 Tensift 相同，`functions/_middleware.js` 由 Harbor 產生，提供維護模式與公告；讀取失敗時放行，逾時 800 ms。`/api/health` 不受維護攔截。尚未設定 `HARBOR_PREVIEW_SECRET`，管理者預覽連結暫不可用。更新 middleware 請在 Harbor 執行 `npm run build:middleware -- --slug=little-days --base-url=https://harbor-1wk.pages.dev --health-path=/api/health` 再複製產物。
