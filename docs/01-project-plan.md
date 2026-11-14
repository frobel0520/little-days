# 小日子收納（Little Days 3D）專案計畫

| 文件項目 | 內容 |
|---|---|
| 文件版本 | 1.0 |
| 文件日期 | 2026-11-14 |
| 狀態 | 依現況盤點補齊（已上線公開級 3D 瀏覽器收納遊戲） |
| 產品類型 | 治癒系 3D 等角收納網頁遊戲 |
| 專案級別 | 公開級 |
| 每月預算上限 | NT$0（零月費硬性規則） |
| 版控／部署 | GitHub `frobel0520/little-days`／Cloudflare Pages（`playmint-little-days`） |
| SDLC | Planning → SA → SD／ADR → Task DAG → 開發測試 → CI／Release Gate |

## 1. 摘要

《小日子收納 · Little Days 3D》是使用 Godot 4.6.3 打造的 3D 等角收納遊戲，包含 6 個主線關卡與 5 個抽屜小品（共 11 個場景、85 件小物）。遊戲強調無格線、無倒數、無唯一解的自由擺放體驗，玩家可在瀏覽器內免安裝直接遊玩，並透過程序合成音效與貓咪互動營造放鬆氛圍。

## 2. 目標玩家

- 喜愛貓咪、治癒系與慢節奏整理玩法的桌面與行動裝置玩家。
- 想在瀏覽器免安裝即開即玩的輕度休閒玩家。

## 3. 目標與成功標準

| 目標 | 成功標準 |
|---|---|
| 完整 3D 收納體驗 | 11 個場景、85 件小物皆具備 3D 幾何與多高度支撐表面，支援拖放、旋轉、撤銷與手動收尾 |
| 零後端、可備份進度 | 本機進度存於 `localStorage`，支援 JSON 備份匯出、驗證預覽與覆蓋前自動還原機制 |
| 零月費突破單檔限制 | 透過 gzip 分片壓縮引擎 WASM，於 Cloudflare Pages 免費方案（單檔 `< 25 MiB`）穩定運行 |
| 效能與多層驗證 | 通過 Node 單元測試、Godot Headless 幾何驗證、Playwright 煙霧測試與正式站回歸檢查 |

## 4. 範圍與既有規劃文件

專案的詳細功能交付現況、後續優先事項與故事線設計已維護於既有文件，本計畫僅作索引而不重複抄寫：

- **開發待辦與優先順序**：見 [`roadmap.md`](roadmap.md)（含主線 6 關 + 5 抽屜小品、後續真機驗證與美術音效打磨方向）。
- **交付現況紀錄**：見 [`current-delivery.md`](current-delivery.md)（Harbor 發布整合、gzip 分片載入、畫質與省電設定、合成音效、進度備份）。
- **敘事主線與基準**：見 [`story-arc.md`](story-arc.md) 與 [`reference-baseline.md`](reference-baseline.md)。
- **明確排除**：帳號系統、自動跨裝置雲端同步、App Store／Google Play 原生上架與付費伺服器託管（列為 [`roadmap.md`](roadmap.md) 後續再評估項目）。
