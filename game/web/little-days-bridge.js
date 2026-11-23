// Little Days 網頁版與 Godot 之間的固定 JS 介面。
// GDScript 以 JavaScriptBridge.get_interface("littleDays") 取得本物件、以 create_callback 傳入回呼，
// 不再使用 JavaScriptBridge.eval，因此遊戲頁 CSP 不需要 'unsafe-eval'。
// 所有方法都自行攔截例外：瀏覽器停用儲存或額度用完時回傳錯誤名稱，不會讓例外穿過 WASM 讓引擎中止。
(() => {
  'use strict';
  const MAX_IMPORT_BYTES = 1048576;
  let removeVisibility = () => {};

  window.littleDays = Object.freeze({
    /** 目前網址是否為自動測試模式（?playtest=1）。 */
    isPlaytest() {
      return new URLSearchParams(window.location.search).get('playtest') === '1';
    },

    /** 讀取 localStorage；沒有資料或瀏覽器不允許時回傳 null。 */
    read(key) {
      try {
        return window.localStorage.getItem(String(key));
      } catch (_) {
        return null;
      }
    },

    /** 寫入 localStorage；成功回傳 'saved'，失敗回傳錯誤名稱（例如 QuotaExceededError）。 */
    write(key, value) {
      try {
        window.localStorage.setItem(String(key), String(value));
        return 'saved';
      } catch (error) {
        return error && error.name ? String(error.name) : 'failed';
      }
    },

    /** 開啟檔案選擇器；選好後把文字（或超過 1 MiB 時的 'invalid'）交給 callback。 */
    pickBackup(callback) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        let text = 'invalid';
        if (file.size <= MAX_IMPORT_BYTES) {
          try {
            text = await file.text();
          } catch (_) {
            text = 'invalid';
          }
        }
        callback(text);
      };
      input.click();
    },

    /** 分頁隱藏、視窗失焦時以 true 呼叫 callback，恢復時以 document.hidden 呼叫。 */
    bindVisibility(callback) {
      removeVisibility();
      const hidden = () => callback(document.hidden);
      const blur = () => callback(true);
      const focus = () => callback(document.hidden);
      document.addEventListener('visibilitychange', hidden);
      window.addEventListener('blur', blur);
      window.addEventListener('focus', focus);
      removeVisibility = () => {
        document.removeEventListener('visibilitychange', hidden);
        window.removeEventListener('blur', blur);
        window.removeEventListener('focus', focus);
        removeVisibility = () => {};
      };
    },

    removeVisibility() {
      removeVisibility();
    },
  });
})();
