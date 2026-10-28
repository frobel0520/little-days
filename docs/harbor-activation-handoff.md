# little-days 正式啟用接手

新版與 workflows 已在 `frobel0520/little-days` 的 main；遊戲功能及瀏覽器測試已通過。自動提案實際到達 Harbor，但 [run 40685666808](https://github.com/frobel0520/little-days/actions/runs/40685666808) 回 `HTTP 403 (INTAKE_NOT_ALLOWED)`，尚未發布。需要已登入 Harbor／GitHub 管理介面的執行環境接手，不需要再改遊戲或重新收集憑證值。

1. 讀取 `GET /api/v1/projects/little-days/release-profiles`，核對 `pages`／`production`。依 `harbor-profile.example.json` 修正 repo 對應與設定；`repoId: 0` 只是無效佔位，必須由授權的 GitHub metadata 讀取正確值，僅存 Harbor，勿提交識別值。已有 profile 時保留其他設定並帶 expectedRevision 更新，確認後啟用。
2. 核對 Harbor App 對此 repo 的 Actions 權限、repository variable `HARBOR_RELEASE_ACTOR`，及 production environment 的 `CLOUDFLARE_API_TOKEN`／`CLOUDFLARE_ACCOUNT_ID`。先查是否已有設定，不重複建立或搬用 Harbor／其他專案的 secret；值只在供應商介面處理，不貼對話、repo 或 log。
3. 從 main 執行 `Harbor propose`，或從 Harbor 建立固定版本申請；確認本次來源完整 SHA 與所核准版本一致。依平台 Owner／委派權限核准，不能把機器提案 OIDC 當核准權限。
4. 等 release executor 建置、測試、部署與 OIDC 回報。檢查 Harbor 平台讀回 succeeded，正式 `/version.json` 的 commit 必須等於核准的 source SHA；另驗 `/api/health`、引擎分片載入、遊戲啟動與手機操作。
5. 若回報結果 unknown，先讀回平台結果，不自動重派；失敗時記錄步驟與非機密錯誤代碼。不得將 GitHub workflow 被接收或 artifact 編譯成功當成正式發布完成。

這個雲端 session 已取得使用者委派，但沒有 Harbor Owner 登入或供應商管理憑證；它不能代填不可讀取的設定，也不能偽造核准。執行中的 API／Harbor 白名單仍未套用；已保存的環境草稿可由管理端儲存並發布，但網路開通本身不會建立登入權限。
