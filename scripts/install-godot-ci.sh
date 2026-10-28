#!/usr/bin/env bash
set -euo pipefail
# Official 4.6.3 artifacts; SHA-512 values checked against upstream SHA512-SUMS.txt.
task_root="${RUNNER_TEMP:-/tmp}/little-days-godot-ci"
mkdir -p "$task_root" "$task_root/data/godot/export_templates/4.6.3.stable"
cd "$task_root"
base=https://github.com/godotengine/godot-builds/releases/download/4.6.3-stable
curl --fail --location --retry 3 "$base/Godot_v4.6.3-stable_linux.x86_64.zip" -o engine.zip
curl --fail --location --retry 3 "$base/Godot_v4.6.3-stable_export_templates.tpz" -o templates.tpz
printf '%s  engine.zip\n%s  templates.tpz\n' \
 a035258da32b77f966a5376f9fa29c30a6adde826a85ba918e1605bd1fc9823eba7d85f1dd5e748956bd2ba72827c0025ffa11bb82aec91128c407a2e723c99c \
 da606b61c10157844f8300172df374472665f95015495cb1a7cd132c40ede404faa96cc1016a4b9662db9909ddea69632c4948b2cd11163438dad4808881fb68 | sha512sum --check
unzip -q -o engine.zip
unzip -q -o -j templates.tpz templates/web_nothreads_release.zip templates/web_nothreads_debug.zip templates/version.txt -d "$task_root/data/godot/export_templates/4.6.3.stable"
chmod +x Godot_v4.6.3-stable_linux.x86_64
printf 'GODOT_BIN=%s/Godot_v4.6.3-stable_linux.x86_64\nXDG_DATA_HOME=%s/data\n' "$task_root" "$task_root" >> "$GITHUB_ENV"
