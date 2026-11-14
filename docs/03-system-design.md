# 小日子收納（Little Days 3D）系統設計（精簡版）

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊 |
| 專案級別 | 公開級 |
| 依據 | Harbor `standards/DevelopmentStandards.md`、`standards/DeploymentHandbook.md` |

## 1. 設計限制

- **零月費與 Cloudflare Pages 25 MiB 單檔限制**：Godot 4.6.3 匯出的原始 `index.wasm` 約 37.7 MB，超過 Cloudflare Pages 免費方案單檔 25 MiB 上限。建置腳本將其切分為多個 12 MiB 區塊並預先 gzip 壓縮（約 9.5 MB，全部小於 10 MB），於瀏覽器端透過 `DecompressionStream` 串流還原。
- **單執行緒相容渲染**：採用 Godot `gl_compatibility`（WebGL 2）單執行緒輸出，無需 COOP/COEP 跨來源隔離標頭。
- **單一內容來源**：關卡敘事與物品定義維護於 `site/`，建置時匯出為 `game/data/content.json` 供 Godot 讀取。

## 2. 架構總覽

```text
site/（關卡與故事單一來源）
  └─ scripts/export-game-content.mjs → game/data/content.json
       └─ Godot 4.6.3（game/）→ scripts/build-game.mjs（WASM 分片 + gzip）→ game-build/
            ├─ Cloudflare Pages Static Assets（playmint-little-days.pages.dev）
            ├─ Cloudflare Pages Functions（functions/api/health.js、_middleware.js）
            └─ 瀏覽器端 localStorage（little-days-godot-v1）與 JSON 備份匯出入
```

## 3. 目錄與核心模組

```text
game/
  scripts/              art.gd（程序化 3D 幾何與材質合併）、game.gd、interface.gd、rules.gd、storage.gd
  data/content.json     由 site/ 匯出的 11 場景與 85 件小物資料
  tests/                verify.gd（Headless 幾何與存檔驗證）、browser_smoke.py、features_smoke.py
functions/              Cloudflare Pages Functions（健康檢查與維護模式中間件）
scripts/                build-game.mjs、check-build.mjs、install-godot-ci.sh、test-game.mjs
tests/                  Node 單元測試（關卡資料、碰撞盒與端點測試）
```

## 4. 部署與驗證流程

- **CI（`.github/workflows/ci.yml`）**：Node 24.19.0 執行 `npm ci`、`npm audit --audit-level=high`、`npm test`。
- **Harbor 受控發布（`harbor-propose.yml` / `harbor-release.yml`）**：
  - `install-godot-ci.sh` 以固定 SHA-512 安裝 Godot 4.6.3 與 Web templates。
  - 執行 `npm test`、`npm run build`、`npm run test:godot`、`node scripts/check-build.mjs`（檢查單檔 `< 25 MiB` 與分片一致性）。
  - 產出 `version.json`（含完整 40 碼 SHA）並透過 `wrangler pages deploy` 部署至 `playmint-little-days`。
- **線上回歸（`production-browser-smoke.yml`）**：針對正式站執行 Playwright 端對端煙霧測試。

## 5. 零月費與效能邊界

| 項目 | 現況與邊界 |
|---|---|
| 託管與資料庫 | Cloudflare Pages 免費方案靜態託管 + 輕量 Pages Functions；無外部資料庫或 KV 寫入成本 |
| 傳輸與渲染優化 | WASM gzip 分片降至 9.5 MB（減少 74.9% 下載量）；靜態 3D 幾何依材質合併以降低 draw calls |
| 省電與降頻 | 支援自動／省電（30 FPS、關陰影）／細緻（60 FPS）；視窗失焦自動降頻至 10 FPS 並暫停環境音 |
| 已知限制與真機待驗 | 下載壓縮不等於解壓後 WASM/WebGL 記憶體減少；詳細基準與真機缺口見 [`device-validation.md`](device-validation.md) 與 [`performance-local-2026-10-28.json`](performance-local-2026-10-28.json) |
