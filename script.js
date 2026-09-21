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
   References: MDN docs for HTMLMediaElement, Pointer Events, p5.js, playhtml.fun(for inspiration), 
   w3schools, codepen.io
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

/* volume functionality */

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

/* keyboard shortcuts were added for the video player, making the website more user friendly */

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

/* for a more interactive and fun experience, I added a drag and drop feature
 to the video player as if it was a real window on a windows xp desktop, sticking to
 the theme.
 https://www.w3schools.com/jsreF/event_ondrag.asp */

function dragElement(handle, target) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  var moved = false;

  handle.addEventListener("mousedown", dragMouseDown);
  handle.addEventListener("touchstart", dragTouchStart);

  function dragMouseDown(e) {
    if (e.target.closest("button")) return; // leave the fullscreen button alone
    if (target.classList.contains("is-fullscreen")) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    moved = false;
    target.classList.add("is-dragging");
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function dragTouchStart(e) {
    if (e.target.closest("button")) return;
    if (target.classList.contains("is-fullscreen")) return;
    var touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    moved = false;
    target.classList.add("is-dragging");
    document.ontouchend = closeDragElement;
    document.ontouchmove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    moved = true;
    if (e.type === "mousemove") {
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
    } else if (e.type === "touchmove") {
      var touch = e.touches[0];
      pos1 = pos3 - touch.clientX;
      pos2 = pos4 - touch.clientY;
      pos3 = touch.clientX;
      pos4 = touch.clientY;
    }
    target.style.top = ((parseInt(target.style.top) || 0) - pos2) + "px";
    target.style.left = ((parseInt(target.style.left) || 0) - pos1) + "px";
  }

  function closeDragElement() {
    target.classList.remove("is-dragging");
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
    if (moved) say("Window moved.");
  }
}

dragElement(document.querySelector(".titlebar"), player);

updateProgress();
syncVolumeUI();
