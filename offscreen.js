chrome.storage.local.get(["hasPuzzle"], function (data) {
  const src = data.hasPuzzle ? "assets/king-reward.mp3" : "assets/horn.ogg";
  const audio = new Audio(chrome.runtime.getURL(src));

  audio.addEventListener("ended", function () {
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });

  audio.addEventListener("error", function (e) {
    console.error("MH Horn: audio error", e);
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });

  audio.play().catch(function (e) {
    console.error("MH Horn: play() rejected", e);
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });
});
