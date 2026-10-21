// Pure helpers — testable with Node

function computeReadyAt(user) {
  return (user.last_active_turn_timestamp + user.activeturn_wait_seconds) * 1000;
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

function buildNotificationMessage(readyAt, hasPuzzle) {
  if (hasPuzzle) {
    return {
      title: "Horn Ready",
      body: "Horn ready — solve the King's Reward first.",
    };
  }
  const staleSecs = (Date.now() - readyAt) / 1000;
  if (staleSecs > 60) {
    const mins = Math.round(staleSecs / 60);
    return {
      title: "Horn Ready",
      body: `Ready since ${mins} minute${mins !== 1 ? "s" : ""} ago.`,
    };
  }
  return {
    title: "Horn Ready",
    body: "Time to sound the hunter's horn!",
  };
}

// --- Message handler ---

chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.type === "MH_TIMER") {
    const { readyAt, hasPuzzle } = msg;
    chrome.storage.local.set({ readyAt, hasPuzzle });
    chrome.alarms.create("horn", { when: readyAt });
    // Only create badge alarm if not already running
    chrome.alarms.get("badge", function (existing) {
      if (!existing) {
        chrome.alarms.create("badge", { periodInMinutes: 1 });
      }
    });
    updateBadge(readyAt);
  }

  if (msg.type === "AUDIO_DONE") {
    chrome.offscreen.closeDocument().catch(() => {});
  }
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "horn") {
    handleHornAlarm();
  }
  if (alarm.name === "badge") {
    chrome.storage.local.get(["readyAt"], function (data) {
      updateBadge(data.readyAt);
    });
  }
});

async function handleHornAlarm() {
  const data = await chrome.storage.local.get(["readyAt", "hasPuzzle"]);
  const { readyAt, hasPuzzle } = data;
  const { title, body } = buildNotificationMessage(readyAt, hasPuzzle);

  chrome.notifications.create("horn_ready", {
    type: "basic",
    // iconUrl omitted — add icons/icon48.png to use a custom icon
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAATklEQVRoge3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABHgqGGQAAAABJRU5ErkJggg==",
    title,
    message: body,
    requireInteraction: true,
  });

  await playHornSound();
}

async function playHornSound() {
  try {
    // Close any existing offscreen document first
    await chrome.offscreen.closeDocument().catch(() => {});
  } catch (_) {}

  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play horn alert sound when countdown reaches zero.",
    });
  } catch (e) {
    console.error("MH Horn: failed to create offscreen document", e);
  }
}

// --- Notification click ---

chrome.notifications.onClicked.addListener(function (notifId) {
  chrome.notifications.clear(notifId);
  chrome.tabs.query({ url: "*://www.mousehuntgame.com/*" }, function (tabs) {
    if (!tabs || tabs.length === 0) return;
    const tab = tabs[0];
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
});

// --- Badge ---

function updateBadge(readyAt) {
  if (!readyAt) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  const remaining = Math.ceil((readyAt - Date.now()) / 60000);
  if (remaining <= 0) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: remaining + "m" });
    chrome.action.setBadgeBackgroundColor({ color: "#4a90d9" });
  }
}
