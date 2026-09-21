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
  AI assistance: code drafted with Claude (Anthropic); [add what you changed or
  wrote yourself]. References: MDN docs for HTMLMediaElement, Pointer Events,
  CSS filter() and conic-gradient(). Icons: Icons8. Fonts: Google Fonts
  (Unbounded, VT323).
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
const sliders = document.querySelectorAll("[data-prop]");
const presetBtns = document.querySelectorAll("[data-preset]");
const shuffleBtn = document.getElementById("shuffle-btn");

const PLAY_ICON = "https://img.icons8.com/ios-glyphs/30/play--v1.png";
const PAUSE_ICON = "https://img.icons8.com/ios-glyphs/30/pause--v1.png";

function say(message) {
  statusEl.textContent = message;
}

/* ---------- Play / pause ---------- */

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
  document.body.classList.toggle("is-playing", playing); // CSS spins the CD
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
video.addEventListener("error", () =>
  say("The video could not be loaded. Check your connection and reload.")
);
video.addEventListener("click", togglePlayPause);

/* ---------- Progress and seeking ---------- */

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
    video.webkitEnterFullscreen(); // iPhone Safari only fullscreens the video itself
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

/* ---------- Extra feature: the Lens ---------- */

const LOOKS = {
  original: { hue: 0, saturate: 100, contrast: 100, blur: 0, invert: 0 },
  negative: { hue: 0, saturate: 110, contrast: 110, blur: 0, invert: 100 },
  heat: { hue: 320, saturate: 260, contrast: 130, blur: 0, invert: 0 },
  dream: { hue: 30, saturate: 170, contrast: 90, blur: 3, invert: 0 },
  noir: { hue: 0, saturate: 0, contrast: 170, blur: 0, invert: 0 },
};

const FORMAT = {
  hue: (v) => `${v}°`,
  saturate: (v) => `${v}%`,
  contrast: (v) => `${v}%`,
  blur: (v) => `${v}px`,
  invert: (v) => `${v}%`,
};

let look = { ...LOOKS.original };

function renderLook() {
  video.style.filter =
    `hue-rotate(${look.hue}deg) saturate(${look.saturate}%) ` +
    `contrast(${look.contrast}%) blur(${look.blur}px) invert(${look.invert}%)`;
  // The whole desktop theme follows the hue the viewer chose.
  document.documentElement.style.setProperty("--shift", look.hue);
  sliders.forEach((slider) => {
    const prop = slider.dataset.prop;
    slider.value = look[prop];
    document.getElementById(`out-${prop}`).textContent = FORMAT[prop](look[prop]);
  });
}

function markPreset(active) {
  presetBtns.forEach((btn) =>
    btn.setAttribute("aria-pressed", String(btn.dataset.preset === active))
  );
}

function choosePreset(name) {
  look = { ...LOOKS[name] };
  renderLook();
  markPreset(name);
  say(`Look: ${name.charAt(0).toUpperCase()}${name.slice(1)}`);
}

presetBtns.forEach((btn) =>
  btn.addEventListener("click", () => choosePreset(btn.dataset.preset))
);

sliders.forEach((slider) => {
  slider.addEventListener("input", () => {
    look[slider.dataset.prop] = Number(slider.value);
    renderLook();
    markPreset(null);
  });
  slider.addEventListener("change", () => say("Look: custom"));
});

const rand = (min, max) => Math.round(min + Math.random() * (max - min));

function shuffleLook() {
  look = {
    hue: rand(0, 360),
    saturate: rand(80, 260),
    contrast: rand(80, 160),
    blur: rand(0, 3),
    invert: Math.random() < 0.2 ? 100 : 0,
  };
  renderLook();
  markPreset(null);
  say("Look: shuffled. Press Shuffle for another.");
}
shuffleBtn.addEventListener("click", shuffleLook);

/* ---------- Keyboard shortcuts ---------- */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target;
  const key = e.key.toLowerCase();
  // Let buttons and sliders keep their own native keys.
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

renderLook();
updateProgress();
syncVolumeUI();
