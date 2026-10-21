# MH Horn Alert

Notifies you when your MouseHunt horn is ready.

## Features

- Desktop notification when the horn is ready
- Different sound for King's Reward puzzles blocking the horn
- Clicking the notification focuses the MouseHunt tab
- Badge on the extension icon shows minutes remaining
- Works across tab switches and throttled background tabs

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

Reload the extension card after any file change.

## How It Works

The extension reads your horn timer directly from the game page and schedules a background alarm. When the alarm fires, it shows a desktop notification and plays a sound. If a King's Reward puzzle is blocking the horn, it plays a different alert so you know to solve the puzzle first.
