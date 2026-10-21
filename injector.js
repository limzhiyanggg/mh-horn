// Runs in MAIN world — can read window.user

(function () {
  function readAndPost() {
    const u = window.user;
    if (!u || !u.last_active_turn_timestamp || !u.activeturn_wait_seconds) return;
    const readyAt = (u.last_active_turn_timestamp + u.activeturn_wait_seconds) * 1000;
    const hasPuzzle = !!u.has_puzzle;
    window.postMessage({ type: "MH_TIMER", readyAt, hasPuzzle }, "*");
  }

  readAndPost();

  // --- XHR intercept ---
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._mhUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      if (!this._mhUrl || !this._mhUrl.includes("mousehuntgame.com")) return;
      tryExtractAndPost(this.responseText);
    });
    return origSend.apply(this, args);
  };

  // --- fetch intercept ---
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
    return origFetch.apply(this, args).then(function (response) {
      if (!url.includes("mousehuntgame.com")) return response;
      const clone = response.clone();
      clone.text().then(tryExtractAndPost);
      return response;
    });
  };

  function tryExtractAndPost(text) {
    const user = extractUserFromResponse(text);
    if (!user) return;
    const readyAt = (user.last_active_turn_timestamp + user.activeturn_wait_seconds) * 1000;
    const hasPuzzle = !!user.has_puzzle;
    window.postMessage({ type: "MH_TIMER", readyAt, hasPuzzle }, "*");
  }

  function extractUserFromResponse(text) {
    if (!text || !text.includes("last_active_turn_timestamp")) return null;
    try {
      const data = JSON.parse(text);
      const u = data.user || data;
      if (u.last_active_turn_timestamp && u.activeturn_wait_seconds) return u;
    } catch (_) {}
    return null;
  }
})();
