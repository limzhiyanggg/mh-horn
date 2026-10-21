// Inject injector.js into MAIN world
const script = document.createElement("script");
script.src = chrome.runtime.getURL("injector.js");
script.onload = function () { script.remove(); };
(document.head || document.documentElement).appendChild(script);

// Relay MH_TIMER messages from MAIN world to background
window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "MH_TIMER") return;
  chrome.runtime.sendMessage({
    type: "MH_TIMER",
    readyAt: event.data.readyAt,
    hasPuzzle: event.data.hasPuzzle,
  });
});
