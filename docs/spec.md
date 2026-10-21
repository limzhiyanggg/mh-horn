# MH Horn Plugin — Spec

## Problem Statement

ZY plays MouseHunt (mousehuntgame.com) and must manually sound the hunter's horn once every 15 minutes to progress in the game. Missing the window wastes turns. The game provides no native browser notification. The only community-built notify-only Chrome extension (MelvinCZJ's Horn Alert) does not respond when clicked and is effectively non-functional. ZY needs a reliable, lightweight alert that pulls focus when the horn is ready so they can sound it without watching the tab.

---

## Solution

A Chrome Manifest V3 extension (plain JavaScript, no build step) that:

1. Reads the horn countdown from the MouseHunt page on load
2. Schedules an exact alarm for the moment the horn becomes ready
3. Fires a desktop notification with a horn sound when the alarm triggers
4. Focuses the MouseHunt tab when the notification is clicked
5. Re-schedules automatically after each horn sound, without requiring a page reload

The extension never sounds the horn or interacts with gameplay. It is a passive observer and notifier only.

---

## User Stories

1. As a MouseHunt player, I want the extension to detect the horn timer when I open the MouseHunt tab, so that it can schedule an alert without me doing anything manually.
2. As a player, I want the extension to read the authoritative server timestamp (not a relative countdown), so that the alarm does not drift or arrive late due to browser tab throttling.
3. As a player, I want a desktop notification to appear when the horn is ready, so that I know to go sound it even when I'm in another app.
4. As a player, I want a horn sound to play when the notification fires, so that I'm alerted even if I'm not looking at my screen.
5. As a player, I want the sound to play even if the MouseHunt tab is closed at alarm time, so that I don't miss alerts because I closed the tab.
6. As a player, I want clicking the notification to focus the MouseHunt tab and window, so that I can sound the horn with one click instead of hunting for the tab.
7. As a player, I want the extension to re-detect the new countdown immediately after I sound the horn, so that the next alarm is scheduled automatically without a page reload.
8. As a player, I want to receive the notification even if Chrome was minimized or my computer woke from sleep after the alarm fired, so that late alerts are delivered rather than silently dropped.
9. As a player, I want the notification message to indicate how long ago the horn became ready (if stale), so that I know whether the window is still useful.
10. As a player, I want the extension to show a countdown badge on its icon (e.g. "14m"), so that I can glance at the browser toolbar to see how long until the horn is ready without switching tabs.
11. As a player, I want the badge to update every minute, so that it stays accurate throughout the countdown.
12. As a player, I want only one notification to fire even if I have two MouseHunt tabs open at the same time, so that I don't get duplicate alerts.
13. As a player, I want the notification to fire with a modified message ("Solve King's Reward first") when the King's Reward puzzle is blocking the horn, so that I'm reminded to solve it rather than confused about why the horn isn't firing.
14. As a player, I want the extension to work without any configuration or setup, so that installing it is all I need to do.
15. As a player, I want the extension to pick up the timer correctly after a page reload, so that manually refreshing the MouseHunt tab doesn't break the alarm cycle.

---

## Implementation Decisions

### Timer source
The game embeds a `user` JavaScript object in the page's inline script on every load. The authoritative fields are:

- `user.last_active_turn_timestamp` — Unix timestamp (seconds) of the last horn sound
- `user.activeturn_wait_seconds` — cooldown duration (always 900)

The ready time is computed as: `readyAt = (last_active_turn_timestamp + activeturn_wait_seconds) * 1000` (milliseconds, for use with `chrome.alarms`).

`next_activeturn_seconds` (a relative countdown) is explicitly not used — it drifts in throttled background tabs.

### Page context access
Content scripts run in an isolated world and cannot read `window.user` directly. A small injector script is inserted into the page's MAIN world (via a `<script>` tag injected by the content script, or `chrome.scripting.executeScript` with `world: "MAIN"`). It reads the timer fields and postMessages them to the content script.

### XHR intercept for re-scheduling
After the player sounds the horn, the game makes an XHR/fetch call to its backend. The response contains an updated `user` object (confirmed from live network inspection). The MAIN world injector also wraps `XMLHttpRequest.prototype.open` and `window.fetch` to intercept any response from `mousehuntgame.com`. If the response body contains `user.last_active_turn_timestamp`, the new value is postMessaged to the content script, which relays it to the background service worker to reschedule the alarm. No page reload required.

### Alarm scheduling
The background service worker calls `chrome.alarms.create("horn", { when: readyAtMs })`. The named alarm `"horn"` is always replaced, never duplicated — if two tabs both report a timestamp, the last write wins. Both tabs read the same server value, so this is safe.

### Sound playback
MV3 service workers cannot play audio. Sound is played from a `chrome.offscreen` document (`chrome.offscreen.createDocument`) which loads `horn.ogg` and plays it via the Web Audio API or an `<audio>` element. The offscreen document is created on demand when the alarm fires and destroyed after playback. This ensures sound plays regardless of whether the MouseHunt tab is open.

Audio file: `horn.ogg` — "Classic fanfare lick" by fvcalderan, CC0, sourced from OpenGameArt.

### Notification and tab focus
`chrome.notifications.create` fires a desktop notification. `chrome.notifications.onClicked` finds the MouseHunt tab by matching `url: "*://www.mousehuntgame.com/*"`, calls `chrome.tabs.update({ active: true })` and `chrome.windows.update({ focused: true })`.

### Stale alert message
When the alarm fires, the service worker computes `staleSecs = Date.now()/1000 - readyAt/1000`. If `staleSecs > 60`, the notification body includes "Ready since X minutes ago."

### King's Reward
`user.has_puzzle: true` means the King's Reward CAPTCHA is blocking the horn. The alarm still fires on schedule. The notification body changes to: "Horn ready — solve the King's Reward first."

### Badge countdown
A second periodic alarm (`chrome.alarms.create("badge", { periodInMinutes: 1 })`) fires every minute. The handler reads the stored `readyAt` timestamp from `chrome.storage.local`, computes remaining minutes, and calls `chrome.action.setBadgeText`. Badge is cleared ("") once the horn is ready.

### Storage
`chrome.storage.local` holds:
- `readyAt` — the scheduled ready timestamp in ms
- `hasPuzzle` — boolean, updated on each XHR intercept

---

## Testing Decisions

Good tests cover external behavior, not implementation internals. Since there is no existing codebase, the primary testing seam is the pure timer logic.

**Unit tests (no browser required):**
- `computeReadyAt(user)` — given a `user` object with `last_active_turn_timestamp` and `activeturn_wait_seconds`, returns the correct epoch ms value
- `extractUserFromResponse(responseText)` — given a raw XHR response string, returns the parsed `user` object or `null` if not present
- `buildNotificationMessage(readyAt, hasPuzzle)` — given a timestamp and puzzle state, returns the correct notification title/body string

**Manual integration test:**
1. Load the unpacked extension in Brave/Chrome
2. Open MouseHunt and sound the horn
3. Verify the badge shows a countdown
4. Wait ~15 minutes — verify the notification fires with the fanfare sound
5. Click the notification — verify the MouseHunt tab comes to focus
6. Verify the badge resets and a new countdown begins

---

## Out of Scope

- Auto-sounding the horn on the player's behalf
- King's Reward detection, solving, or bypass
- Any interaction with gameplay beyond reading the timer
- Multi-account support
- Firefox or other non-Chromium browsers
- A settings popup or options page
- Notification history or logging
- Any UI beyond the badge counter and desktop notification

---

## Further Notes

- **Audio file:** `horn.ogg` from https://opengameart.org/content/classic-fanfare-lick — CC0, no attribution required, ~50KB
- **XHR response structure confirmed** via live DevTools inspection: the horn POST returns a top-level `user` object with the same fields as the page-load inline script, plus `success` and `active_turn` fields
- **MelvinCZJ's Horn Alert** (Chrome Web Store, 2015) was tried and is non-functional — does not respond to clicks. Building from scratch is the right call.
- **HitGrab's rules on automation:** not verified at time of writing. This extension is notify-only and makes no requests to the game server. It reads data the browser has already received. Low risk, but ZY should verify before publishing publicly.
