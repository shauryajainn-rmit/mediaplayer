/*
  BEHAVIOUR NOTES
  The partial code only had a play button, so I completed the player: the icon
  and the spinning CD follow the video's real play/pause/ended events, so
  clicking the picture, pressing Space or clicking the button never disagree.
  I added a draggable, keyboard-accessible seek bar, a time read-out, volume
  and mute, and fullscreen (the window's maximise button). The Lens applies CSS
  filters to the <video>, which works with cross-origin files where a canvas
  would not. Shortcuts follow common video-player habits.

  SOURCES AND AI DISCLOSURE
   References: MDN docs for HTMLMediaElement, Pointer Events, p5.js, 
   Icons: Icons8. Fonts: Google Fonts
  Claude AI was partially used to fix code errors with suggestions.
*/

const player = document.querySelector(".player-window");
const video = document.getElementById("custom-video-player");
const playBtn = document.getElementById("play-pause-btn");
const playImg = document.getElementById("play-pause-img");
const progress = document.querySelector(".progress-bar");
const fill = document.getElementById("progress-bar-fill");
const timeText = document.getElementById("time-display");
const muteBtn = document.getElementById("mute-btn");
const volume = document.getElementById("volume");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const statusEl = document.getElementById("status");

const PLAY_ICON = "https://img.icons8.com/ios-glyphs/30/play--v1.png";
const PAUSE_ICON = "https://img.icons8.com/ios-glyphs/30/pause--v1.png";





function say(message) {
  statusEl.textContent = message;
}
const mouseCd = document.getElementById("mouse-cd");

document.addEventListener("pointermove", (event) => {
  mouseCd.style.left = `${event.clientX}px`;
  mouseCd.style.top = `${event.clientY}px`;
});

document.addEventListener("pointerdown", () => {
  document.body.classList.add("is-clicking");
});

document.addEventListener("pointerup", () => {
  document.body.classList.remove("is-clicking");
});

/* play and pause buttons */

function togglePlayPause() {
  if (video.paused || video.ended) {
    video.play().catch(() => say("Playback was blocked. Press play again."));
  } else {
    video.pause();
  }
}

function setPlayIcon(playing) {
  playImg.src = playing ? PAUSE_ICON : PLAY_ICON;
  playImg.alt = playing ? "Pause" : "Play";
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  document.body.classList.toggle("is-playing", playing);
}

video.addEventListener("play", () => {
  setPlayIcon(true);
  say("Playing");
});
video.addEventListener("pause", () => {
  setPlayIcon(false);
  say("Paused");
});
video.addEventListener("ended", () => {
  setPlayIcon(false);
  say("Finished. Press play to watch again.");
});
video.addEventListener("click", togglePlayPause);

/* video player*/

function fmt(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateProgress() {
  const dur = video.duration;
  const ratio = Number.isFinite(dur) && dur > 0 ? video.currentTime / dur : 0;
  fill.style.width = `${ratio * 100}%`;
  timeText.textContent = `${fmt(video.currentTime)} / ${fmt(dur)}`;
  progress.setAttribute("aria-valuenow", Math.round(ratio * 100));
  progress.setAttribute(
    "aria-valuetext",
    `${fmt(video.currentTime)} of ${fmt(dur)}`
  );
}

["timeupdate", "loadedmetadata", "durationchange"].forEach((type) =>
  video.addEventListener(type, updateProgress)
);

function seekTo(seconds) {
  if (!Number.isFinite(video.duration)) return;
  video.currentTime = Math.min(Math.max(seconds, 0), video.duration);
  updateProgress();
}

function skipBy(seconds) {
  if (!Number.isFinite(video.duration)) return;

  const nextTime = Math.min(
    Math.max(video.currentTime + seconds, 0),
    video.duration
  );

  video.currentTime = nextTime;
  updateProgress();
  say(`Skipped ${Math.abs(seconds)} seconds ${seconds > 0 ? "ahead" : "back"}.`);
}

function seekFromPointer(e) {
  const rect = progress.getBoundingClientRect();
  const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  seekTo(ratio * video.duration);
}

let scrubbing = false;
progress.addEventListener("pointerdown", (e) => {
  scrubbing = true;
  progress.setPointerCapture(e.pointerId);
  seekFromPointer(e);
});
progress.addEventListener("pointermove", (e) => {
  if (scrubbing) seekFromPointer(e);
});
["pointerup", "pointercancel"].forEach((type) =>
  progress.addEventListener(type, () => (scrubbing = false))
);

progress.addEventListener("keydown", (e) => {
  const step = { ArrowLeft: -5, ArrowRight: 5 }[e.key];
  if (step) {
    e.preventDefault();
    seekTo(video.currentTime + step);
  } else if (e.key === "Home") {
    e.preventDefault();
    seekTo(0);
  } else if (e.key === "End") {
    e.preventDefault();
    seekTo(video.duration);
  }
});

document.getElementById("rewind-btn").addEventListener("click", () => skipBy(-10));
document.getElementById("forward-btn").addEventListener("click", () => skipBy(10));

/* ---------- Volume and fullscreen ---------- */

function syncVolumeUI() {
  const muted = video.muted || video.volume === 0;
  muteBtn.classList.toggle("is-muted", muted);
  muteBtn.setAttribute("aria-pressed", String(muted));
  volume.value = video.muted ? 0 : video.volume;
}

function toggleMute() {
  if (video.muted || video.volume === 0) {
    video.muted = false;
    if (video.volume === 0) video.volume = 0.5;
    say("Sound on");
  } else {
    video.muted = true;
    say("Muted");
  }
}

volume.addEventListener("input", () => {
  video.volume = Number(volume.value);
  video.muted = video.volume === 0;
});
video.addEventListener("volumechange", syncVolumeUI);
muteBtn.addEventListener("click", toggleMute);

function toggleFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }
  const request = player.requestFullscreen || player.webkitRequestFullscreen;
  if (request) {
    request.call(player);
  } else if (video.webkitEnterFullscreen) {
    video.webkitEnterFullscreen();
  }
}

function onFullscreenChange() {
  const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  player.classList.toggle("is-fullscreen", active);
  fullscreenBtn.setAttribute("aria-pressed", String(active));
  say(active ? "Fullscreen. Press Esc or F to exit." : "Windowed");
}

fullscreenBtn.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", onFullscreenChange);
document.addEventListener("webkitfullscreenchange", onFullscreenChange);

/* ---------- Dragging the player window ---------- */

const dragHandle = document.querySelector(".titlebar");
let dragState = null;

function startDrag(event) {
  if (event.target.closest("button, input, select, textarea, svg, a")) return;

  dragState = {
    offsetX: event.clientX - player.offsetLeft,
    offsetY: event.clientY - player.offsetTop,
  };

  player.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!dragState) return;

  const parent = player.parentElement;
  const maxX = Math.max(0, parent.clientWidth - player.offsetWidth);
  const maxY = Math.max(0, parent.clientHeight - player.offsetHeight);

  const nextX = Math.min(Math.max(event.clientX - dragState.offsetX, 0), maxX);
  const nextY = Math.min(Math.max(event.clientY - dragState.offsetY, 0), maxY);

  player.style.position = "absolute";
  player.style.left = `${nextX}px`;
  player.style.top = `${nextY}px`;
  player.style.zIndex = "10";
}

function stopDrag() {
  dragState = null;
}

dragHandle.addEventListener("pointerdown", startDrag);
document.addEventListener("pointermove", moveDrag);
document.addEventListener("pointerup", stopDrag);

dragHandle.addEventListener("pointerleave", stopDrag);

/* I decided to implement keyboard shortcuts for the video player, making the website more user friendly */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target;
  const key = e.key.toLowerCase();
  if (target.matches("select, textarea")) return;
  if ((key === " " || key === "enter") && target.matches("button, a")) return;
  if (
    (key === "arrowleft" || key === "arrowright") &&
    target.matches("input[type='range'], [role='slider']")
  ) {
    return;
  }

  switch (key) {
    case " ":
    case "k":
      e.preventDefault();
      togglePlayPause();
      break;
    case "arrowleft":
      seekTo(video.currentTime - 5);
      break;
    case "arrowright":
      seekTo(video.currentTime + 5);
      break;
    case "j":
      skipBy(-10);
      break;
    case "l":
      skipBy(10);
      break;
    case "m":
      toggleMute();
      break;
    case "f":
      toggleFullscreen();
      break;
    case "r":
      choosePreset("original");
      break;
  }
});

updateProgress();
syncVolumeUI();
