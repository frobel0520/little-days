# 日光下的一張桌

主線已擴成完整的 [Godot 遊戲](../../game/project.godot)，請以根目錄 README 的啟動方式為準。此目錄保留最初的一桌三物研究，供比較手感。

獨立的 **Godot 4.6.3 真 3D 手感原型**，保留現有 PixiJS 三關。以一張桌、陶杯、書、盆栽比較體積、拿取與放置回饋；不是完整遊戲或 Unity 專案。

## 執行

用 Godot 4.6.3 開啟本目錄的 `project.godot`，按 F6／F5 執行。所有模型、光照與互動由 `tabletop.gd` 建立，不需要 Blender、付費資產或外部服務。

瀏覽器版需要相同版本的官方 Web export templates：

```sh
# 在 repository 根目錄
npm run prototype:build
npm run dev
```

開啟伺服器上的 `/tabletop-3d/index.html`。匯出使用 Compatibility renderer、單執行緒 WebAssembly，無須跨來源隔離標頭。WebGL 2 是必要條件。匯出檔放在已忽略的 `prototype-build/tabletop-3d/`，不將引擎二進位或匯出快取提交至 Git。原型產物獨立於正式部署的 `site/`，由開發伺服器掛載至試玩路徑；本次沒有部署。

雲端環境的 templates 保存在 `/workspace/godot-data` 下，建置腳本會自動偵測。也可明確指定位置：

```sh
XDG_DATA_HOME=/workspace/godot-data XDG_CONFIG_HOME=/workspace/godot-config XDG_CACHE_HOME=/workspace/godot-cache npm run prototype:build
```

## 操作與範圍

- 滑鼠／單指拖曳小物，拿起時抬高、隨移動輕微傾斜；放手回到桌面並有短促落桌回饋。
- 選取後按 R 或「轉向」連續轉 90 度；Esc 或拖到「取消拿取」按鈕放手，回到拿起前的位置。
- 「換個角度」從另一側看模型；滾輪縮放。「重新擺好」重設三件物品。
- 音效預設關閉，可手動開啟；合成短音是回饋佔位，非正式材質音效。
- 物品受桌緣限制，擁擠時退回原位。本版不處理物品堆疊、剛體翻倒、存檔或過關。
- `?playtest=1` 額外提供唯讀的 `window.tabletopState` JSON，供瀏覽器驗證實際輸入後的位置與高度；一般模式不輸出此狀態。

目前美術是程序生成的簡單幾何，目的是比較操作方向；正式品質仍需模型、美術、動畫、音效與真機調整。瀏覽器觸控模擬不能取代 Android／iOS 實機測試。

字體為 Noto Sans CJK TC 的子集，依 SIL Open Font License 使用；見 `assets/FONT-LICENSE.txt`。所有場景幾何均為本專案生成。

## 驗證

原有遊戲測試仍使用 `npm test`。3D 原型匯出並啟動伺服器後，可用 Python Playwright 執行真實瀏覽器輸入測試：

```sh
python prototypes/tabletop-3d/tests/browser_smoke.py
```

預設使用系統 Chromium，可透過 `CHROMIUM_PATH` 覆寫。測試涵蓋拿起高度、拖放、連續轉向、取消還原、擁擠退回、桌緣限制、切換鏡頭、重設，以及手機直向的觸控拖放與按鈕。此測試使用軟體 WebGL，等待場景狀態完成，不以固定秒數判定動畫完成。
