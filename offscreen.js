const audio = new Audio(chrome.runtime.getURL("assets/horn.ogg"));

audio.addEventListener("ended", function () {
  chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
});

audio.addEventListener("error", function () {
  chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
});

audio.play().catch(function () {
  chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
});
