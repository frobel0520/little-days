#!/usr/bin/env bash
# 以 GitHub Actions OIDC（audience harbor-release）向 Harbor 回報階段；不使用任何長期 token。
# 用法：report.sh <phase> [artifact_digest] [platform_version]
set -euo pipefail
phase="$1"; digest="${2:-}"; version="${3:-}"
[[ "$RELEASE_ID" =~ ^[0-9a-f-]{36}$ && "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "invalid inputs" >&2; exit 1; }
token="$(curl -fsS -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
  "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=harbor-release" | jq -r .value)"
body="$(jq -n --arg r "$RELEASE_ID" --arg p "$phase" --arg s "$SOURCE_SHA" --arg d "$digest" --arg v "$version" \
  '{releaseId:$r, phase:$p, sourceSha:$s} + (if $d == "" then {} else {artifactDigest:$d} end) + (if $v == "" then {} else {platformVersion:$v} end)')"
# 回報失敗不讓部署 job 失敗：Harbor 會停在 unknown，由 Owner 依實際平台狀態處理。
curl -sS --max-time 15 -X POST "${HARBOR_URL}/api/v1/release-report" -H "authorization: Bearer ${token}" \
  -H 'content-type: application/json' --data "$body" -o /dev/null -w "harbor report ${phase}: %{http_code}\n" || true
