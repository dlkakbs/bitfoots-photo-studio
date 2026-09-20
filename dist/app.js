const canvas = document.querySelector("#artboard");
const ctx = canvas.getContext("2d", { alpha: false });
const stage = document.querySelector("#stage");
const headGrid = document.querySelector("#headGrid");
const statusEl = document.querySelector("#status");
const resolutionEl = document.querySelector("#resolution");
const emptyEl = document.querySelector("#stageEmpty");
const hintEl = document.querySelector("#stageHint");
const sizeSlider = document.querySelector("#sizeSlider");
const sizeOutput = document.querySelector("#sizeOutput");
const rotationSlider = document.querySelector("#rotationSlider");
const rotationOutput = document.querySelector("#rotationOutput");
const grayscaleToggle = document.querySelector("#grayscaleToggle");
const flipToggle = document.querySelector("#flipToggle");
const photoInput = document.querySelector("#photoInput");

// Opaque-pixel bounds for the original PNGs. Cropping only transparent margins
// makes the same size setting visually consistent without changing head pixels.
const HEAD_BOUNDS = [
  [100, 175, 450, 600], [100, 175, 450, 600], [75, 0, 450, 875],
  [75, 275, 475, 600], [75, 250, 550, 625], [75, 225, 550, 650],
  [0, 150, 600, 725], [75, 275, 475, 600], [75, 225, 450, 650],
  [75, 250, 450, 625], [75, 225, 550, 650], [75, 225, 450, 650],
  [50, 225, 500, 650], [75, 275, 450, 600], [75, 275, 450, 600],
  [75, 275, 450, 600], [0, 0, 750, 800], [75, 250, 550, 625]
];
const HEAD_OPTICAL_SCALE = [
  1, 1, 1.12, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1.27, 1
];

const heads = Array.from({ length: 18 }, (_, index) => {
  const image = new Image();
  image.src = `./assets/heads/bitfoot-head-${String(index + 1).padStart(2, "0")}.png`;
  return image;
});

const state = {
  photo: null,
  photoName: "sample",
  isSample: true,
  head: 0,
  x: .48,
  y: .36,
  size: 35,
  rotation: 0,
  grayscale: true,
  flip: false
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function say(message) { statusEl.textContent = message; }

function setImageSize(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const ratio = Math.min(1, 3600 / Math.max(width, height), Math.sqrt(12000000 / (width * height)));
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  resolutionEl.textContent = `${canvas.width} × ${canvas.height}${state.isSample ? " · SAMPLE" : ""}`;
}

function drawPhoto() {
  ctx.save();
  ctx.filter = state.grayscale ? "grayscale(1) contrast(1.04)" : "none";
  ctx.drawImage(state.photo, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawHead() {
  const image = heads[state.head];
  if (!image.complete || !image.naturalWidth) return;
  const [sx, sy, sw, sh] = HEAD_BOUNDS[state.head];
  // Width is measured from visible pixels, not from the PNG's transparent box.
  const desiredWidth = canvas.width * state.size / 100 * HEAD_OPTICAL_SCALE[state.head];
  const maxHeight = canvas.height * (state.head === 2 ? 1 : .85);
  const width = Math.min(desiredWidth, maxHeight * sw / sh);
  const height = width * sh / sw;

  ctx.save();
  ctx.translate(state.x * canvas.width, state.y * canvas.height);
  ctx.rotate(state.rotation * Math.PI / 180);
  if (state.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
  ctx.restore();
}

let renderQueued = false;
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function render() {
  if (!state.photo) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPhoto();
  drawHead();
}

function syncHeadSelection() {
  [...headGrid.children].forEach((button, index) => button.setAttribute("aria-checked", String(index === state.head)));
}

function createHeadButtons() {
  heads.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "head-button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `Bitfoot ${String(index + 1).padStart(2, "0")}`);
    const thumb = document.createElement("canvas");
    thumb.width = 80;
    thumb.height = 80;
    thumb.setAttribute("aria-hidden", "true");
    button.append(thumb);
    const paintThumb = () => {
      const thumbCtx = thumb.getContext("2d");
      const [sx, sy, sw, sh] = HEAD_BOUNDS[index];
      const ratio = Math.min(70 / sw, 70 / sh);
      const dw = sw * ratio;
      const dh = sh * ratio;
      thumbCtx.clearRect(0, 0, 80, 80);
      thumbCtx.imageSmoothingEnabled = false;
      thumbCtx.drawImage(image, sx, sy, sw, sh, (80 - dw) / 2, (80 - dh) / 2, dw, dh);
    };
    if (image.complete && image.naturalWidth) paintThumb();
    else image.addEventListener("load", () => { paintThumb(); queueRender(); }, { once: true });
    button.addEventListener("click", () => {
      state.head = index;
      syncHeadSelection();
      queueRender();
      say(`Bitfoot ${String(index + 1).padStart(2, "0")} selected. Drag it over your face.`);
    });
    headGrid.append(button);
  });
  syncHeadSelection();
}

function resetHead() {
  state.x = state.isSample ? .48 : .5;
  state.y = state.isSample ? .36 : .35;
  state.size = 35;
  state.rotation = 0;
  state.flip = false;
  sizeSlider.value = String(state.size);
  sizeOutput.value = `${state.size}%`;
  rotationSlider.value = "0";
  rotationOutput.value = "0°";
  flipToggle.checked = false;
  hintEl.classList.remove("hidden");
  queueRender();
  say("Head position and size reset.");
}

function usePhoto(image, name, isSample) {
  state.photo = image;
  state.photoName = name;
  state.isSample = isSample;
  setImageSize(image);
  emptyEl.hidden = true;
  resetHead();
  say(isSample ? "Try this sample, or use your own photo." : "Photo ready. Drag the Bitfoot over your face, then download.");
}

async function loadUserPhoto(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    say("Please choose a PNG, JPG or WebP photo.");
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    usePhoto(image, file.name, false);
  } catch {
    say("This image could not be opened. Try another PNG, JPG or WebP photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, -.15, 1.15),
    y: clamp((event.clientY - rect.top) / rect.height, -.15, 1.15)
  };
}

let dragging = false;
canvas.addEventListener("pointerdown", event => {
  if (!state.photo) return;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("dragging");
  hintEl.classList.add("hidden");
  const point = pointerPoint(event);
  state.x = point.x;
  state.y = point.y;
  queueRender();
});
canvas.addEventListener("pointermove", event => {
  if (!dragging) return;
  const point = pointerPoint(event);
  state.x = point.x;
  state.y = point.y;
  queueRender();
});
function endDrag(event) {
  dragging = false;
  canvas.classList.remove("dragging");
  if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

canvas.addEventListener("keydown", event => {
  const step = event.shiftKey ? .02 : .005;
  if (event.key === "ArrowLeft") state.x -= step;
  else if (event.key === "ArrowRight") state.x += step;
  else if (event.key === "ArrowUp") state.y -= step;
  else if (event.key === "ArrowDown") state.y += step;
  else return;
  event.preventDefault();
  queueRender();
});

sizeSlider.addEventListener("input", () => {
  state.size = Number(sizeSlider.value);
  sizeOutput.value = `${state.size}%`;
  queueRender();
});
rotationSlider.addEventListener("input", () => {
  state.rotation = Number(rotationSlider.value);
  rotationOutput.value = `${state.rotation}°`;
  queueRender();
});
grayscaleToggle.addEventListener("change", () => { state.grayscale = grayscaleToggle.checked; queueRender(); });
flipToggle.addEventListener("change", () => { state.flip = flipToggle.checked; queueRender(); });
photoInput.addEventListener("change", event => loadUserPhoto(event.target.files?.[0]));
document.querySelector("#resetBtn").addEventListener("click", resetHead);

stage.addEventListener("dragover", event => { event.preventDefault(); stage.classList.add("drag-over"); });
stage.addEventListener("dragleave", () => stage.classList.remove("drag-over"));
stage.addEventListener("drop", event => {
  event.preventDefault();
  stage.classList.remove("drag-over");
  loadUserPhoto(event.dataTransfer?.files?.[0]);
});

document.querySelector("#downloadBtn").addEventListener("click", async () => {
  if (!state.photo) return;
  render();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) { say("Export failed. Please try again."); return; }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bitfoot-photo-${String(state.head + 1).padStart(2, "0")}.png`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  say("PNG downloaded at photo resolution.");
});

document.querySelector("#copyBtn").addEventListener("click", async () => {
  if (!state.photo) return;
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    say("Image copied to clipboard.");
  } catch {
    say("Clipboard access was blocked. Use Download PNG instead.");
  }
});

async function init() {
  createHeadButtons();
  const requestedHead = Number(new URLSearchParams(location.search).get("head"));
  if (Number.isInteger(requestedHead) && requestedHead >= 1 && requestedHead <= heads.length) {
    state.head = requestedHead - 1;
    syncHeadSelection();
  }
  const sample = new Image();
  try {
    sample.src = "./assets/sample-desk-photo.png";
    await sample.decode();
    usePhoto(sample, "sample", true);
  } catch {
    emptyEl.hidden = false;
    say("Add a photo to begin.");
  }
}

init();
