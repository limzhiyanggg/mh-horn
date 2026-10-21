chrome.storage.session.get(["soundFile"], function (data) {
  const src = data.soundFile || "assets/horn.ogg";
  const audio = new Audio(chrome.runtime.getURL(src));

  audio.addEventListener("ended", function () {
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });

  audio.addEventListener("error", function () {
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });

  audio.play().catch(function () {
    chrome.runtime.sendMessage({ type: "AUDIO_DONE" });
  });
});
