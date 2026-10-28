# Harbor 部署接入

新版與執行器／提案 workflow 已更新至 main，自動申請已實際執行；**Harbor 回 403 INTAKE_NOT_ALLOWED，尚未正式發布**。不能把程式推送或本機 Worker 編譯成功當成部署成功。

## 已實作

- `harbor-release.yml` 只從可信 main 執行，固定 pages／production，接收 Harbor 凍結的完整 source SHA。Build job 沒有部署 secrets 或 OIDC；Godot 4.6.3 與模板下載均核對固定 SHA-512。
- Build 匯出 `game-build/`、編譯 Pages Functions 至 `_worker.js/`，保留既有 Harbor 維護模式及健康端點。產物包含 `/version.json`；本專案外層 middleware 只豁免版本讀回，原 Harbor 產生檔完整保留於 `integrations/harbor-middleware.js`，更新時將新產物放在該處，不編輯產生碼。
- Deploy job 驗證 artifact digest，只部署產物；回報腳本從可信 workflow SHA 取得，平台憑證只出現在 deploy step。所有 action 固定完整 SHA。
- `Harbor propose` 會在 main 的功能推送後自動執行，也可從 main 手動觸發；純文件更新不觸發。以 GitHub OIDC 提交目前 commit 的申請，**不能核准**。Harbor／Owner 核准後才派送 release executor。

## 正式啟用尚缺

1. 新版已透過非強制 fast-forward 更新至 main。仍需核對 main 保護與 GitHub environment `production`（限 main）；目前沒有讀取管理設定的權限，不假設已完成。
2. 核對 Harbor GitHub App 有此 repo 的 Actions 權限，並將該 App 的公開 actor login 設為 repository variable `HARBOR_RELEASE_ACTOR`。執行器只接受這個 actor；未設定時不執行 build／deploy，不能用一般手動 dispatch 略過 Harbor。於 little-days 的 production environment 安全設定 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`；值不放進對話或檔案。本 session 沒有讀取或搬運其他專案的 secret。
3. 在 Harbor 以 Owner 登入，透過 `POST /api/v1/projects/little-days/release-profiles` 建立 `harbor-profile.example.json` 的設定。`repoId: 0` 是刻意無效的佔位，須在設定介面換成 GitHub 讀回的 repo 穩定識別，不提交識別值。若已有設定，先讀現有 revision，以 expectedRevision 更新，不能覆蓋他人設定。requiredChecks 在確認實際 CI 名稱後設定；目前空清單不代表已有 preflight CI。執行器本身會先跑測試，失敗不發布。
4. 確認以上接線後才啟用 profile。main 功能推送會提出申請，也可從 GitHub Actions 手動執行 Harbor propose；在 Harbor 審閱並核准固定版本；核對 queued → deploying → verifying → succeeded。`/version.json` 必須讀回核准的完整 SHA，並確認 `/api/health` 與實際遊戲能開啟。

## 本次外部阻擋

此雲端的 GitHub API 查詢回 Forbidden；Harbor 域名不在執行中的白名單，沒有 Owner session。已保存環境草稿，新增 `api.github.com` 與 `harbor-1wk.pages.dev`，需要於環境設定儲存並發布才會套用。開放連線也不等於已具備 Actions／Owner 授權，須依實際回應確認。保留 Git push 既有授權，不提取其憑證。

## 自動申請實跑結果

- main 已含遊戲版本 `65dc104`、自動 main 提案觸發 `2eef8ae` 與錯誤代碼回報 `6a5b948`；沒有強制推送。
- [第一次執行](https://github.com/frobel0520/little-days/actions/runs/40684917864) 回退出碼 22。加入不含憑證的錯誤代碼後，[第二次執行](https://github.com/frobel0520/little-days/actions/runs/40685666808) 明確回 **HTTP 403 (INTAKE_NOT_ALLOWED)**。
- 申請已經由 GitHub Actions OIDC 送到 Harbor；依 intake 契約，此碼代表目標 profile 不存在、未啟用或 repo 對應不符，不能只憑此碼判定是哪一項。沒有成功建立可核准的申請，也沒有 release executor 發布結果。
- 目前缺少 Harbor Owner 管理登入，無法讀取或修改正式 profile；GitHub environment secrets／actor variable 的狀態亦未能讀取。不能用提案用 OIDC 冒充 Owner 或搬用其他專案的秘密。
- 不在接入條件未變時反覆重試。管理端依下方接手文件完成後，再由 main 手動執行 Harbor propose。

已完成 main 更新與實際 proposal workflow 執行；未修改正式 profile、建立供應商 secret 或上傳 Cloudflare。接手內容見 [harbor-activation-handoff.md](harbor-activation-handoff.md)。
