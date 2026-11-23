import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { contentSecurityPolicy } from './scripts/security-headers.mjs';
const siteRoot = resolve(import.meta.dirname, 'site');
const gameRoot = resolve(import.meta.dirname, 'game-build');
const prototypeRoot = resolve(import.meta.dirname, 'prototype-build/tabletop-3d');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const prototype = pathname.startsWith('/tabletop-3d/');
    const archive = pathname.startsWith('/archive/');
    const root = prototype ? prototypeRoot : archive ? siteRoot : gameRoot;
    const localPath = prototype ? pathname.slice('/tabletop-3d'.length) : archive ? pathname.slice('/archive'.length) : pathname;
    const file = resolve(root, `.${localPath === '/' ? '/index.html' : localPath}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const content = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    // 與正式站 _headers 相同：遊戲首頁套用 CSP，本機測試才能發現違規。
    if (root === gameRoot && file === resolve(gameRoot, 'index.html')) headers['Content-Security-Policy'] = contentSecurityPolicy(content.toString('utf8'));
    res.writeHead(200, headers);
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4317, '127.0.0.1', () => console.log('Little Days: http://127.0.0.1:4317'));
