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
const downloadBtn = document.querySelector("#downloadBtn");
const copyBtn = document.querySelector("#copyBtn");
const resetBtn = document.querySelector("#resetBtn");
const transformFrame = document.querySelector("#transformFrame");
const removeHandle = document.querySelector("#removeHandle");
const rotateHandle = document.querySelector("#rotateHandle");
const scaleHandle = document.querySelector("#scaleHandle");
const sourceMarker = document.querySelector("#sourceMarker");
const brushCursor = document.querySelector("#brushCursor");
const repairToggle = document.querySelector("#repairToggle");
const repairOptions = document.querySelector("#repairOptions");
const sourceButton = document.querySelector("#sourceButton");
const undoButton = document.querySelector("#undoButton");
const brushSlider = document.querySelector("#brushSlider");
const brushOutput = document.querySelector("#brushOutput");

const repairCanvas = document.createElement("canvas");
const repairCtx = repairCanvas.getContext("2d");
const strokeSource = document.createElement("canvas");
const strokeSourceCtx = strokeSource.getContext("2d");

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
  photoReady: false,
  head: 0,
  headVisible: true,
  x: .5,
  y: .35,
  size: 35,
  rotation: 0,
  grayscale: false,
  flip: false,
  repairMode: false,
  pickSource: false,
  sourcePoint: null
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function say(message) { statusEl.textContent = message; }

function setImageSize(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const ratio = Math.min(1, 3600 / Math.max(width, height), Math.sqrt(12000000 / (width * height)));
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  repairCanvas.width = canvas.width;
  repairCanvas.height = canvas.height;
  repairCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
  resolutionEl.textContent = `${canvas.width} × ${canvas.height}`;
}

function drawPhoto() {
  ctx.drawImage(repairCanvas, 0, 0);
}

function headDimensions() {
  const [sx, sy, sw, sh] = HEAD_BOUNDS[state.head];
  const desiredWidth = canvas.width * state.size / 100 * HEAD_OPTICAL_SCALE[state.head];
  const maxHeight = canvas.height * (state.head === 2 ? 1 : .85);
  const width = Math.min(desiredWidth, maxHeight * sw / sh);
  const height = width * sh / sw;
  return { sx, sy, sw, sh, width, height };
}

function drawHead() {
  const image = heads[state.head];
  if (!image.complete || !image.naturalWidth) return;
  const { sx, sy, sw, sh, width, height } = headDimensions();

  ctx.save();
  ctx.translate(state.x * canvas.width, state.y * canvas.height);
  ctx.rotate(state.rotation * Math.PI / 180);
  if (state.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function stagePoint(x, y) {
  const canvasRect = canvas.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  return {
    x: canvasRect.left - stageRect.left + x * canvasRect.width,
    y: canvasRect.top - stageRect.top + y * canvasRect.height
  };
}

function syncOverlays() {
  const image = heads[state.head];
  transformFrame.hidden = !state.photoReady || !state.headVisible || state.repairMode || !image.complete || !image.naturalWidth;
  if (!transformFrame.hidden) {
    const { width, height } = headDimensions();
    const rect = canvas.getBoundingClientRect();
    const center = stagePoint(state.x, state.y);
    transformFrame.style.left = `${center.x}px`;
    transformFrame.style.top = `${center.y}px`;
    transformFrame.style.width = `${width / canvas.width * rect.width}px`;
    transformFrame.style.height = `${height / canvas.height * rect.height}px`;
    transformFrame.style.transform = `translate(-50%, -50%) rotate(${state.rotation}deg)`;
  }
  sourceMarker.hidden = !state.repairMode || !state.sourcePoint || state.pickSource;
  if (!sourceMarker.hidden) {
    const point = stagePoint(state.sourcePoint.x, state.sourcePoint.y);
    sourceMarker.style.left = `${point.x}px`;
    sourceMarker.style.top = `${point.y}px`;
  }
}

let renderQueued = false;
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function render() {
  if (!state.photoReady) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.filter = state.grayscale ? "grayscale(1) contrast(1.04)" : "none";
  drawPhoto();
  if (state.headVisible) drawHead();
  ctx.restore();
  syncOverlays();
}

function syncHeadSelection() {
  [...headGrid.children].forEach((button, index) => button.setAttribute("aria-checked", String(state.headVisible && index === state.head)));
}

function syncAvatarControls() {
  const editable = state.photoReady && state.headVisible && !state.repairMode;
  downloadBtn.disabled = !editable;
  copyBtn.disabled = !editable;
  resetBtn.disabled = !editable;
  sizeSlider.disabled = state.photoReady && !editable;
  rotationSlider.disabled = state.photoReady && !editable;
  flipToggle.disabled = state.photoReady && !editable;
  syncHeadSelection();
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
      state.headVisible = true;
      syncAvatarControls();
      queueRender();
      say(!state.photoReady
        ? `Bitfoot ${String(index + 1).padStart(2, "0")} selected. Choose a photo to begin.`
        : state.repairMode
          ? `Bitfoot ${String(index + 1).padStart(2, "0")} selected. Finish retouching to see it.`
          : `Bitfoot ${String(index + 1).padStart(2, "0")} added. Drag it over your face.`);
    });
    headGrid.append(button);
  });
  syncHeadSelection();
}

function resetHead() {
  state.headVisible = true;
  state.x = .5;
  state.y = .35;
  state.size = 35;
  state.rotation = 0;
  state.flip = false;
  syncTransformControls();
  flipToggle.checked = false;
  hintEl.classList.remove("hidden");
  syncAvatarControls();
  queueRender();
  say("Head position and size reset.");
}

function removeHead() {
  state.headVisible = false;
  hintEl.classList.add("hidden");
  syncAvatarControls();
  queueRender();
  say("Avatar removed. Choose a Bitfoot below to add one again.");
}

function syncTransformControls() {
  sizeSlider.value = String(Math.round(state.size));
  sizeOutput.value = `${Math.round(state.size)}%`;
  rotationSlider.value = String(Math.round(state.rotation));
  rotationOutput.value = `${Math.round(state.rotation)}°`;
}

function usePhoto(image) {
  setImageSize(image);
  state.photoReady = true;
  state.headVisible = true;
  state.grayscale = false;
  grayscaleToggle.checked = false;
  state.repairMode = false;
  state.pickSource = false;
  state.sourcePoint = null;
  repairOptions.hidden = true;
  repairToggle.setAttribute("aria-pressed", "false");
  repairToggle.textContent = "✦ Clean stray hair";
  stage.classList.remove("repairing");
  brushCursor.hidden = true;
  undoButton.disabled = true;
  emptyEl.hidden = true;
  stage.classList.remove("is-empty");
  repairToggle.disabled = false;
  resetHead();
  say("Photo ready. Drag the head, pinch to resize, or twist to rotate.");
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
    usePhoto(image);
  } catch {
    say("This image could not be opened. Try another PNG, JPG or WebP photo.");
  } finally {
    URL.revokeObjectURL(url);
    photoInput.value = "";
  }
}

function pointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, -.15, 1.15),
    y: clamp((event.clientY - rect.top) / rect.height, -.15, 1.15)
  };
}

const activePointers = new Map();
let dragOrigin = null;
let pinchOrigin = null;
let repairStroke = null;

function headHitTest(point) {
  const { width, height } = headDimensions();
  const dx = (point.x - state.x) * canvas.width;
  const dy = (point.y - state.y) * canvas.height;
  const angle = state.rotation * Math.PI / 180;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
  const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const padding = 18 * canvas.width / canvas.getBoundingClientRect().width;
  return Math.abs(localX) <= width / 2 + padding && Math.abs(localY) <= height / 2 + padding;
}

function twoPointerGeometry() {
  const [a, b] = [...activePointers.values()];
  return {
    midX: (a.x + b.x) / 2,
    midY: (a.y + b.y) / 2,
    distance: Math.hypot((b.x - a.x) * canvas.width, (b.y - a.y) * canvas.height),
    angle: Math.atan2((b.y - a.y) * canvas.height, (b.x - a.x) * canvas.width)
  };
}

function beginPinch() {
  const gesture = twoPointerGeometry();
  pinchOrigin = { ...gesture, x: state.x, y: state.y, size: state.size, rotation: state.rotation };
  dragOrigin = null;
}

function normalizeRotation(degrees) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function updatePinch() {
  const gesture = twoPointerGeometry();
  state.x = clamp(pinchOrigin.x + gesture.midX - pinchOrigin.midX, -.15, 1.15);
  state.y = clamp(pinchOrigin.y + gesture.midY - pinchOrigin.midY, -.15, 1.15);
  state.size = clamp(pinchOrigin.size * gesture.distance / Math.max(1, pinchOrigin.distance), 12, 85);
  const turn = Math.atan2(Math.sin(gesture.angle - pinchOrigin.angle), Math.cos(gesture.angle - pinchOrigin.angle));
  state.rotation = normalizeRotation(pinchOrigin.rotation + turn * 180 / Math.PI);
  syncTransformControls();
  queueRender();
}

function brushRadius() {
  return Number(brushSlider.value) * canvas.width / canvas.getBoundingClientRect().width / 2;
}

function updateBrushCursor(event) {
  if (!state.repairMode) return;
  const point = pointerPoint(event);
  const position = stagePoint(point.x, point.y);
  brushCursor.hidden = false;
  brushCursor.style.left = `${position.x}px`;
  brushCursor.style.top = `${position.y}px`;
  brushCursor.style.width = `${brushSlider.value}px`;
  brushCursor.style.height = `${brushSlider.value}px`;
}

function stampAt(x, y) {
  const radius = repairStroke.radius;
  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const right = Math.min(repairCanvas.width, Math.ceil(x + radius));
  const bottom = Math.min(repairCanvas.height, Math.ceil(y + radius));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return;

  const target = repairCtx.getImageData(left, top, width, height);
  const original = strokeSourceCtx.getImageData(left, top, width, height);
  const source = strokeSourceCtx.getImageData(
    Math.round(left + repairStroke.offsetX),
    Math.round(top + repairStroke.offsetY),
    width,
    height
  );
  const innerRadius = radius * .48;
  const featherWidth = Math.max(1, radius - innerRadius);

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const targetX = left + column;
      const targetY = top + row;
      const dx = targetX + .5 - x;
      const dy = targetY + .5 - y;
      const distanceFromCenter = Math.hypot(dx, dy);
      if (distanceFromCenter >= radius) continue;

      const targetIndex = (row * width + column) * 4;
      if (source.data[targetIndex + 3] === 0) continue;
      const redDifference = source.data[targetIndex] - original.data[targetIndex];
      const greenDifference = source.data[targetIndex + 1] - original.data[targetIndex + 1];
      const blueDifference = source.data[targetIndex + 2] - original.data[targetIndex + 2];
      const colorDifference = Math.hypot(redDifference, greenDifference, blueDifference);

      // Preserve pixels that already resemble the sampled background. This keeps
      // the brush from repainting the surrounding wall, sky, or other backdrop.
      const differenceMix = clamp((colorDifference - 24) / 64, 0, 1);
      if (differenceMix <= 0) continue;
      const edgeMix = distanceFromCenter <= innerRadius
        ? 1
        : 1 - (distanceFromCenter - innerRadius) / featherWidth;
      const mix = differenceMix * edgeMix * .94;
      target.data[targetIndex] += (source.data[targetIndex] - target.data[targetIndex]) * mix;
      target.data[targetIndex + 1] += (source.data[targetIndex + 1] - target.data[targetIndex + 1]) * mix;
      target.data[targetIndex + 2] += (source.data[targetIndex + 2] - target.data[targetIndex + 2]) * mix;
    }
  }
  repairCtx.putImageData(target, left, top);
}

function startRepairStroke(point, pointerId) {
  strokeSource.width = repairCanvas.width;
  strokeSource.height = repairCanvas.height;
  strokeSourceCtx.drawImage(repairCanvas, 0, 0);
  const x = point.x * canvas.width;
  const y = point.y * canvas.height;
  repairStroke = {
    pointerId,
    offsetX: state.sourcePoint.x * canvas.width - x,
    offsetY: state.sourcePoint.y * canvas.height - y,
    lastX: x,
    lastY: y,
    radius: brushRadius()
  };
  stampAt(x, y);
  queueRender();
}

function continueRepairStroke(point) {
  const x = point.x * canvas.width;
  const y = point.y * canvas.height;
  const distance = Math.hypot(x - repairStroke.lastX, y - repairStroke.lastY);
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, repairStroke.radius * .42)));
  const fromX = repairStroke.lastX;
  const fromY = repairStroke.lastY;
  for (let step = 1; step <= steps; step++) {
    stampAt(fromX + (x - fromX) * step / steps, fromY + (y - fromY) * step / steps);
  }
  repairStroke.lastX = x;
  repairStroke.lastY = y;
  queueRender();
}

function repairPointerDown(event) {
  if (repairStroke) return;
  const point = pointerPoint(event);
  updateBrushCursor(event);
  if (state.pickSource || !state.sourcePoint) {
    state.sourcePoint = { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) };
    state.pickSource = false;
    syncOverlays();
    say("Clean area selected. Brush over the hair you want to hide.");
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  startRepairStroke(point, event.pointerId);
}

canvas.addEventListener("pointerdown", event => {
  if (!state.photoReady) return;
  event.preventDefault();
  if (state.repairMode) { repairPointerDown(event); return; }
  if (!state.headVisible) return;
  canvas.setPointerCapture(event.pointerId);
  activePointers.set(event.pointerId, pointerPoint(event));
  canvas.classList.add("dragging");
  hintEl.classList.add("hidden");
  if (activePointers.size === 1) {
    dragOrigin = { point: pointerPoint(event), x: state.x, y: state.y, moved: false, suppressTap: false };
  } else if (activePointers.size >= 2) beginPinch();
});

canvas.addEventListener("pointermove", event => {
  if (state.repairMode) {
    updateBrushCursor(event);
    if (repairStroke?.pointerId === event.pointerId) continueRepairStroke(pointerPoint(event));
    return;
  }
  if (!activePointers.has(event.pointerId)) return;
  const point = pointerPoint(event);
  activePointers.set(event.pointerId, point);
  if (activePointers.size >= 2) { updatePinch(); return; }
  if (!dragOrigin) return;
  const rect = canvas.getBoundingClientRect();
  if (Math.hypot((point.x - dragOrigin.point.x) * rect.width, (point.y - dragOrigin.point.y) * rect.height) < 3 && !dragOrigin.moved) return;
  dragOrigin.moved = true;
  state.x = clamp(dragOrigin.x + point.x - dragOrigin.point.x, -.15, 1.15);
  state.y = clamp(dragOrigin.y + point.y - dragOrigin.point.y, -.15, 1.15);
  queueRender();
});

function endPointer(event, cancelled = false) {
  if (state.repairMode) {
    if (repairStroke?.pointerId === event.pointerId) {
      repairStroke = null;
      undoButton.disabled = false;
      say("Edge cleaned. Pick another background area if the texture changes.");
    }
    brushCursor.hidden = true;
  } else if (activePointers.has(event.pointerId)) {
    const wasSingle = activePointers.size === 1;
    const origin = dragOrigin;
    activePointers.delete(event.pointerId);
    if (!cancelled && wasSingle && origin && !origin.moved && !origin.suppressTap && !headHitTest(pointerPoint(event))) {
      const point = pointerPoint(event);
      state.x = point.x;
      state.y = point.y;
      queueRender();
    }
    if (activePointers.size >= 2) beginPinch();
    else if (activePointers.size === 1) {
      dragOrigin = { point: [...activePointers.values()][0], x: state.x, y: state.y, moved: false, suppressTap: true };
      pinchOrigin = null;
    } else {
      dragOrigin = null;
      pinchOrigin = null;
      canvas.classList.remove("dragging");
    }
  }
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener("pointerup", event => endPointer(event));
canvas.addEventListener("pointercancel", event => endPointer(event, true));

function attachTransformHandle(button, type) {
  let start = null;
  button.addEventListener("pointerdown", event => {
    if (!state.photoReady || !state.headVisible || state.repairMode) return;
    event.preventDefault();
    event.stopPropagation();
    button.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + state.x * rect.width;
    const cy = rect.top + state.y * rect.height;
    start = {
      pointerId: event.pointerId,
      cx, cy,
      distance: Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy)),
      angle: Math.atan2(event.clientY - cy, event.clientX - cx),
      value: type === "scale" ? state.size : state.rotation
    };
    hintEl.classList.add("hidden");
  });
  button.addEventListener("pointermove", event => {
    if (start?.pointerId !== event.pointerId) return;
    if (type === "scale") {
      const distance = Math.hypot(event.clientX - start.cx, event.clientY - start.cy);
      state.size = clamp(start.value * distance / start.distance, 12, 85);
    } else {
      const angle = Math.atan2(event.clientY - start.cy, event.clientX - start.cx);
      const turn = Math.atan2(Math.sin(angle - start.angle), Math.cos(angle - start.angle));
      state.rotation = normalizeRotation(start.value + turn * 180 / Math.PI);
    }
    syncTransformControls();
    queueRender();
  });
  const stop = event => {
    if (start?.pointerId !== event.pointerId) return;
    start = null;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
}
attachTransformHandle(scaleHandle, "scale");
attachTransformHandle(rotateHandle, "rotate");
removeHandle.addEventListener("click", removeHead);

canvas.addEventListener("keydown", event => {
  if (!state.photoReady || !state.headVisible || state.repairMode) return;
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
  syncTransformControls();
  queueRender();
});
rotationSlider.addEventListener("input", () => {
  state.rotation = Number(rotationSlider.value);
  syncTransformControls();
  queueRender();
});
grayscaleToggle.addEventListener("change", () => { state.grayscale = grayscaleToggle.checked; queueRender(); });
flipToggle.addEventListener("change", () => { state.flip = flipToggle.checked; queueRender(); });
photoInput.addEventListener("change", event => loadUserPhoto(event.target.files?.[0]));
resetBtn.addEventListener("click", resetHead);

function setRepairMode(enabled) {
  state.repairMode = enabled;
  state.pickSource = enabled && !state.sourcePoint;
  repairOptions.hidden = !enabled;
  repairToggle.setAttribute("aria-pressed", String(enabled));
  repairToggle.textContent = enabled ? "✓ Done retouching" : "✦ Clean stray hair";
  stage.classList.toggle("repairing", enabled);
  syncAvatarControls();
  brushCursor.hidden = true;
  if (enabled) {
    hintEl.classList.add("hidden");
    say(state.pickSource ? "Tap clean background beside the visible hair." : "Use short strokes over hair outside the Bitfoot edge.");
  } else {
    sourceMarker.hidden = true;
    say(state.headVisible
      ? "Retouch saved. Drag, resize, or rotate your Bitfoot, then download."
      : "Retouch saved. Choose a Bitfoot to add one again.");
  }
  queueRender();
}

repairToggle.addEventListener("click", () => {
  if (state.photoReady) setRepairMode(!state.repairMode);
});
sourceButton.addEventListener("click", () => {
  state.pickSource = true;
  syncOverlays();
  say("Tap a clean background area near the hair you want to hide.");
});
undoButton.addEventListener("click", () => {
  if (undoButton.disabled) return;
  repairCtx.clearRect(0, 0, repairCanvas.width, repairCanvas.height);
  repairCtx.drawImage(strokeSource, 0, 0);
  undoButton.disabled = true;
  queueRender();
  say("Last retouch stroke undone.");
});
brushSlider.addEventListener("input", () => {
  brushOutput.value = `${brushSlider.value} px`;
  if (!brushCursor.hidden) {
    brushCursor.style.width = `${brushSlider.value}px`;
    brushCursor.style.height = `${brushSlider.value}px`;
  }
});
new ResizeObserver(syncOverlays).observe(canvas);

stage.addEventListener("dragover", event => { event.preventDefault(); stage.classList.add("drag-over"); });
stage.addEventListener("dragleave", () => stage.classList.remove("drag-over"));
stage.addEventListener("drop", event => {
  event.preventDefault();
  stage.classList.remove("drag-over");
  loadUserPhoto(event.dataTransfer?.files?.[0]);
});

downloadBtn.addEventListener("click", async () => {
  if (!state.photoReady || !state.headVisible || state.repairMode) return;
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

copyBtn.addEventListener("click", async () => {
  if (!state.photoReady || !state.headVisible || state.repairMode) return;
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    say("Image copied to clipboard.");
  } catch {
    say("Clipboard access was blocked. Use Download PNG instead.");
  }
});

function init() {
  createHeadButtons();
  const requestedHead = Number(new URLSearchParams(location.search).get("head"));
  if (Number.isInteger(requestedHead) && requestedHead >= 1 && requestedHead <= heads.length) {
    state.head = requestedHead - 1;
    syncHeadSelection();
  }
}

init();
