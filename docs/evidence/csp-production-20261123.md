# CSP 正式部署後驗證

日期：2026-11-23（Asia/Taipei）。網址：https://playmint-little-days.pages.dev/ 。正式版本端點讀回 `c606ffa6a981fedd3a6ca84abdcb60e63544f0d2`；Owner 核准部署 run `45105267045` 成功。

## 環境與方法

macOS Apple Silicon，Playwright 隔離 context。Chromium 153.0.8010.12 使用 393×844 行動模式；WebKit 27.2 使用 390×844 行動模式，均啟用觸控，deviceScaleFactor=2。互動透過實際 touchscreen tap 與瀏覽器檔案選擇器／下載事件；只從遊戲既有 littleDaysState 讀取測試控制座標，未呼叫遊戲寫入函式。頁面載入前監聽 securitypolicyviolation 與 pageerror。

主互動使用正式站 `?playtest=1` 的獨立測試存檔；正常模式遷移測試則在全新 context 放入合成 cats-v1／v2 舊格式資料。沒有存取 Owner 的真實瀏覽器存檔或登入憑證。

## 結果

| 檢查 | Chromium | WebKit |
|---|---|---|
| 遊戲載入／狀態就緒 | 通過 | 通過 |
| 觸控選擇相機並放在桌面 | 通過 | 通過 |
| 重新整理後位置保留 | 通過 | 通過 |
| 設定匯出實際下載 JSON | 通過 | 通過 |
| 清空測試佈置後匯入、預覽並確認，恢復相機 | 通過 | 通過 |
| 離開分頁後返回，遊戲恢復操作 | 通過 | 通過 |
| 正常模式合成舊存檔遷移 | 通過 | 通過 |
| 舊相機位置／方向、貓咪記憶、小品書本方向與原始舊檔保留 | 通過 | 通過 |
| CSP 違規 | 0 | 0 |
| 主互動 pageerror | 0 | 0 |

HTTP 首頁 CSP 已移除 `'unsafe-eval'` 並保留 `'wasm-unsafe-eval'`，HTML 與 runtime 均確認有 little-days-bridge.js。

## 限制

每種引擎只有一輪行動模式互動及一輪舊檔遷移；不宣稱完整六關回歸或效能 Gate 通過。macOS WebKit 不是實體 iPhone Safari，Chromium 行動模式不是 Android Chrome 真機。切分頁僅驗證瀏覽器失焦／恢復，不代表手機作業系統切換 App、背景凍結或回收記憶體。Owner 真實舊存檔、實體裝置、下載分享／檔案 App、音訊、發熱與低階裝置效能仍待驗。
