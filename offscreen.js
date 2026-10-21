const isPuzzle = new URLSearchParams(location.search).has("puzzle");
const src = isPuzzle ? "assets/king-reward.mp3" : "assets/horn.ogg";
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
