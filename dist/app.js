(() => {
  "use strict";

  const GOLD = "#eaba49";
  const HEADING = "#ffddcc";
  const TEXT = "#aab6c9";
  const INK = "#101419";

  const scenes = [
    { id: "forest", name: "Shielded Forest", short: "Hidden in plain sight", plate: "forest" },
    { id: "lantern", name: "Lantern Sweep", short: "Caught by a narrow beam", plate: "forest" },
    { id: "trail", name: "Vanishing Trail", short: "Footprints fade behind you", plate: "forest" },
    { id: "shield", name: "Inside the Shield", short: "Encrypted beyond the ledger", plate: "shield" },
    { id: "eyes", name: "Watcher Eyes", short: "The forest looks back", plate: "forest" },
    { id: "vouch", name: "The Vouch Trail", short: "Trust passed through the woods", plate: "forest" },
    { id: "ordinal", name: "Lost Ordinal", short: "Recovered after 2.5 years", plate: "archive" },
    { id: "sighting", name: "303 Sighting", short: "An official field record", plate: "forest" }
  ];

  const formats = {
    square: { width: 1800, height: 1800, label: "SQUARE" },
    portrait: { width: 1350, height: 1800, label: "PORTRAIT" },
    wide: { width: 1920, height: 1080, label: "WIDE" }
  };

  const state = {
    scene: "forest",
    head: 0,
    partner: 1,
    note: "THE FOREST REMEMBERS QUIET FEET",
    sighting: 87,
    visibility: 88,
    fog: 42,
    light: 56,
    format: "square",
    seed: 19087
  };

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#artboard");
  const ctx = canvas.getContext("2d", { alpha: false });
  const sceneList = $("#sceneList");
  const headGrid = $("#headGrid");
  const partnerSelect = $("#partnerSelect");
  const assets = { heads: [], plates: {} };
  let renderFrame = 0;

  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

  const headPath = (index) => `./assets/heads/bitfoot-head-${String(index + 1).padStart(2, "0")}.png`;

  function createSceneControls() {
    const template = $("#sceneTemplate");
    scenes.forEach((scene, index) => {
      const fragment = template.content.cloneNode(true);
      const button = fragment.querySelector("button");
      button.dataset.scene = scene.id;
      button.querySelector(".scene-index").textContent = String(index + 1).padStart(2, "0");
      button.querySelector("b").textContent = scene.name;
      button.querySelector("small").textContent = scene.short;
      button.setAttribute("aria-checked", String(scene.id === state.scene));
      button.addEventListener("click", () => selectScene(scene.id));
      sceneList.appendChild(fragment);
    });
  }

  function createHeadControls() {
    for (let index = 0; index < 18; index += 1) {
      const button = document.createElement("button");
      button.className = "head-option";
      button.type = "button";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", `Bitfoot head ${index + 1}`);
      button.setAttribute("aria-checked", String(index === state.head));
      button.innerHTML = `<img src="${headPath(index)}" alt="" draggable="false">`;
      button.addEventListener("click", () => selectHead(index));
      headGrid.appendChild(button);

      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Bitfoot ${String(index + 1).padStart(2, "0")}`;
      partnerSelect.appendChild(option);
    }
    partnerSelect.value = String(state.partner);
  }

  function selectScene(id) {
    state.scene = id;
    sceneList.querySelectorAll(".scene-card").forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.scene === id));
    });
    const active = scenes.find((scene) => scene.id === id);
    $("#activeSceneName").textContent = active.name;
    $("#partnerControl").hidden = id !== "vouch";
    $("#lightControl").hidden = id !== "lantern";
    scheduleRender();
  }

  function selectHead(index) {
    state.head = index;
    headGrid.querySelectorAll(".head-option").forEach((button, at) => {
      button.setAttribute("aria-checked", String(at === index));
    });
    $("#headLabel").textContent = `${String(index + 1).padStart(2, "0")} / 18`;
    scheduleRender();
  }

  function bindControls() {
    const bindings = [
      ["#fieldNote", "input", (event) => { state.note = event.target.value.toUpperCase(); }],
      ["#sightingNumber", "input", (event) => { state.sighting = clamp(Number(event.target.value) || 1, 1, 303); }],
      ["#visibility", "input", (event) => { state.visibility = Number(event.target.value); $("#visibilityValue").textContent = `${state.visibility}%`; }],
      ["#fog", "input", (event) => { state.fog = Number(event.target.value); $("#fogValue").textContent = `${state.fog}%`; }],
      ["#lightPosition", "input", (event) => { state.light = Number(event.target.value); $("#lightValue").textContent = `${state.light}%`; }],
      ["#formatSelect", "change", (event) => { state.format = event.target.value; setCanvasFormat(); }],
      ["#partnerSelect", "change", (event) => { state.partner = Number(event.target.value); $("#partnerLabel").textContent = `${String(state.partner + 1).padStart(2, "0")} / 18`; }]
    ];
    bindings.forEach(([selector, event, update]) => {
      $(selector).addEventListener(event, (inputEvent) => { update(inputEvent); scheduleRender(); });
    });
    $("#randomizeBtn").addEventListener("click", randomize);
    $("#randomizeTop").addEventListener("click", randomize);
    $("#downloadBtn").addEventListener("click", downloadImage);
    $("#copyBtn").addEventListener("click", copyImage);
  }

  function setCanvasFormat() {
    const format = formats[state.format];
    canvas.width = format.width;
    canvas.height = format.height;
    $("#canvasFrame").style.aspectRatio = `${format.width} / ${format.height}`;
    $("#formatReadout").textContent = `${format.label} · ${format.width} × ${format.height}`;
    scheduleRender();
  }

  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function pad(value, size = 3) { return String(value).padStart(size, "0"); }
  function mulberry32(seed) {
    return () => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function drawCover(image, x = 0, y = 0, width = canvas.width, height = canvas.height, zoom = 1) {
    const scale = Math.max(width / image.width, height / image.height) * zoom;
    const sw = width / scale;
    const sh = height / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawAvatar(image, centerX, baseY, maxWidth, maxHeight, alpha = 1, glow = 0) {
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = Math.round(image.width * ratio);
    const height = Math.round(image.height * ratio);
    const x = Math.round(centerX - width / 2);
    const y = Math.round(baseY - height);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    if (glow > 0) {
      ctx.shadowColor = `rgba(234, 186, 73, ${glow})`;
      ctx.shadowBlur = Math.round(canvas.width * 0.025);
    }
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return { x, y, width, height };
  }

  function drawBasePlate(name, zoom = 1) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCover(assets.plates[name], 0, 0, canvas.width, canvas.height, zoom);
  }

  function drawFog(amount, seedOffset = 0) {
    if (amount <= 0) return;
    const random = mulberry32(state.seed + seedOffset);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 9; i += 1) {
      const x = random() * canvas.width;
      const y = canvas.height * (0.15 + random() * 0.75);
      const radius = canvas.width * (0.12 + random() * 0.32);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(150, 174, 198, ${0.018 + amount * 0.00055})`);
      gradient.addColorStop(0.58, `rgba(112, 140, 165, ${0.01 + amount * 0.00026})`);
      gradient.addColorStop(1, "rgba(70, 92, 116, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  function drawVignette(strength = 0.72) {
    const radius = Math.max(canvas.width, canvas.height) * 0.72;
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.48, radius * 0.12, canvas.width / 2, canvas.height * 0.52, radius);
    gradient.addColorStop(0, "rgba(4, 7, 10, 0)");
    gradient.addColorStop(0.64, `rgba(4, 7, 10, ${strength * 0.22})`);
    gradient.addColorStop(1, `rgba(3, 5, 8, ${strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrain(opacity = 0.08) {
    const random = mulberry32(state.seed + 9001);
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let index = 0; index < 650; index += 1) {
      const value = 125 + Math.floor(random() * 90);
      ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
      const size = random() > 0.88 ? 2 : 1;
      ctx.fillRect(Math.floor(random() * canvas.width), Math.floor(random() * canvas.height), size, size);
    }
    ctx.restore();
  }

  function drawFoot(x, y, size, rotation, alpha, color = GOLD) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.13, size * 0.17, size * 0.34, -0.16, 0, Math.PI * 2);
    ctx.fill();
    const toes = [-0.16, -0.055, 0.055, 0.16];
    toes.forEach((offset, index) => {
      ctx.beginPath();
      ctx.arc(offset * size, -size * (0.23 + Math.abs(index - 1.5) * 0.015), size * (0.047 + (index === 1 || index === 2 ? 0.013 : 0)), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawForestScene() {
    drawBasePlate("forest", 1.06);
    const wash = ctx.createLinearGradient(0, 0, 0, canvas.height);
    wash.addColorStop(0, "rgba(6, 10, 16, 0.08)");
    wash.addColorStop(1, "rgba(4, 7, 10, 0.44)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFog(state.fog, 11);
    const w = canvas.width;
    const h = canvas.height;
    drawAvatar(assets.heads[state.head], w * 0.5, h * 0.82, w * 0.38, h * 0.58, state.visibility / 100, 0.16);
    drawVignette(0.66);
  }

  function drawLanternScene() {
    drawBasePlate("forest", 1.1);
    drawFog(state.fog * 0.75, 21);
    const w = canvas.width;
    const h = canvas.height;
    const avatar = drawAvatar(assets.heads[state.head], w * 0.5, h * 0.82, w * 0.39, h * 0.58, state.visibility / 100, 0.18);
    const cx = w * (state.light / 100);
    const cy = avatar.y + avatar.height * 0.46;
    const radius = Math.max(w, h) * 0.32;
    const dark = ctx.createRadialGradient(cx, cy, radius * 0.06, cx, cy, radius);
    dark.addColorStop(0, "rgba(3, 6, 9, 0)");
    dark.addColorStop(0.32, "rgba(3, 6, 9, 0.08)");
    dark.addColorStop(0.62, "rgba(3, 6, 9, 0.78)");
    dark.addColorStop(1, "rgba(1, 3, 5, 0.96)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);
    const beam = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.7);
    beam.addColorStop(0, "rgba(255, 211, 123, 0.18)");
    beam.addColorStop(0.5, "rgba(234, 186, 73, 0.07)");
    beam.addColorStop(1, "rgba(234, 186, 73, 0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    drawVignette(0.54);
  }

  function drawTrailScene() {
    drawBasePlate("forest", 1.08);
    const w = canvas.width;
    const h = canvas.height;
    drawFog(state.fog, 31);
    for (let index = 0; index < 11; index += 1) {
      const t = index / 10;
      const x = w * (0.08 + t * 0.57 + Math.sin(t * 8) * 0.025);
      const y = h * (0.86 - t * 0.29);
      drawFoot(x, y, w * 0.032, -0.22 + Math.sin(t * 5) * 0.22, 0.05 + t * 0.78, GOLD);
    }
    drawAvatar(assets.heads[state.head], w * 0.68, h * 0.79, w * 0.34, h * 0.54, state.visibility / 100, 0.12);
    drawVignette(0.68);
  }

  function drawShieldScene() {
    drawBasePlate("shield", 1.03);
    const w = canvas.width;
    const h = canvas.height;
    const min = Math.min(w, h);
    const cx = w * 0.5;
    const cy = h * 0.52;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, min * 0.34, 0, Math.PI * 2);
    ctx.clip();
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, min * 0.36);
    glow.addColorStop(0, "rgba(234, 186, 73, 0.11)");
    glow.addColorStop(0.7, "rgba(26, 40, 56, 0.04)");
    glow.addColorStop(1, "rgba(10, 14, 18, 0.42)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    drawAvatar(assets.heads[state.head], cx, h * 0.82, w * 0.36, h * 0.58, state.visibility / 100, 0.24);
    ctx.restore();

    const random = mulberry32(state.seed + 41);
    for (let index = 0; index < 54; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = min * (0.29 + random() * 0.23);
      const size = min * (0.006 + random() * 0.017);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.fillStyle = random() > 0.72 ? "rgba(234, 186, 73, 0.58)" : "rgba(126, 151, 180, 0.35)";
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(size), Math.round(size));
    }
    drawFog(state.fog * 0.34, 42);
    drawVignette(0.55);
  }

  function drawEyesScene() {
    drawBasePlate("forest", 1.13);
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "rgba(2, 4, 7, 0.52)";
    ctx.fillRect(0, 0, w, h);
    drawFog(state.fog * 0.58, 51);
    drawAvatar(assets.heads[state.head], w * 0.52, h * 0.81, w * 0.37, h * 0.57, (state.visibility / 100) * 0.64, 0.04);
    const random = mulberry32(state.seed + 52);
    for (let index = 0; index < 14; index += 1) {
      const x = w * (0.07 + random() * 0.86);
      const y = h * (0.16 + random() * 0.58);
      const size = Math.max(4, Math.round(w * (0.003 + random() * 0.004)));
      const alpha = 0.16 + random() * 0.52;
      ctx.fillStyle = `rgba(234, 186, 73, ${alpha})`;
      ctx.fillRect(Math.round(x - size * 1.8), Math.round(y), size, size);
      ctx.fillRect(Math.round(x + size * 0.8), Math.round(y), size, size);
    }
    drawVignette(0.82);
  }

  function drawVouchScene() {
    drawBasePlate("forest", 1.04);
    const w = canvas.width;
    const h = canvas.height;
    drawFog(state.fog * 0.8, 61);
    const leftX = w * (state.format === "portrait" ? 0.36 : 0.34);
    const rightX = w * (state.format === "portrait" ? 0.66 : 0.68);
    const maxW = w * (state.format === "portrait" ? 0.35 : 0.31);
    drawAvatar(assets.heads[state.head], leftX, h * 0.79, maxW, h * 0.5, state.visibility / 100, 0.12);
    drawAvatar(assets.heads[state.partner], rightX, h * 0.79, maxW, h * 0.5, Math.max(0.54, state.visibility / 110), 0.12);
    ctx.save();
    ctx.strokeStyle = "rgba(234, 186, 73, 0.34)";
    ctx.lineWidth = Math.max(2, w * 0.0015);
    ctx.setLineDash([w * 0.008, w * 0.012]);
    ctx.beginPath();
    ctx.moveTo(leftX, h * 0.76);
    ctx.quadraticCurveTo(w * 0.5, h * 0.67, rightX, h * 0.76);
    ctx.stroke();
    ctx.restore();
    for (let index = 0; index < 6; index += 1) {
      const t = index / 5;
      drawFoot(leftX + (rightX - leftX) * t, h * (0.755 - Math.sin(t * Math.PI) * 0.085), w * 0.022, t % 2 ? 0.22 : -0.22, 0.34 + t * 0.08);
    }
    drawVignette(0.62);
  }

  function drawOrdinalScene() {
    drawBasePlate("archive", 1.02);
    const w = canvas.width;
    const h = canvas.height;
    const portrait = state.format === "portrait";
    const avatarX = portrait ? w * 0.5 : w * 0.39;
    const baseY = portrait ? h * 0.65 : h * 0.77;
    const avatar = drawAvatar(assets.heads[state.head], avatarX, baseY, portrait ? w * 0.5 : w * 0.34, portrait ? h * 0.44 : h * 0.56, state.visibility / 100, 0.08);
    ctx.save();
    ctx.strokeStyle = "rgba(234, 186, 73, 0.5)";
    ctx.lineWidth = Math.max(2, w * 0.0013);
    ctx.strokeRect(avatar.x - w * 0.025, avatar.y - h * 0.025, avatar.width + w * 0.05, avatar.height + h * 0.05);
    ctx.restore();

    const lineY = (Date.now() / 26) % h;
    const scanner = ctx.createLinearGradient(0, lineY - h * 0.035, 0, lineY + h * 0.035);
    scanner.addColorStop(0, "rgba(244, 183, 40, 0)");
    scanner.addColorStop(0.5, "rgba(244, 183, 40, 0.12)");
    scanner.addColorStop(1, "rgba(244, 183, 40, 0)");
    ctx.fillStyle = scanner;
    ctx.fillRect(0, lineY - h * 0.035, w, h * 0.07);
    drawGrain(0.13);
  }

  function drawSightingScene() {
    drawBasePlate("forest", 1.12);
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "rgba(3, 6, 9, 0.35)";
    ctx.fillRect(0, 0, w, h);
    drawFog(state.fog * 0.65, 71);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.font = `700 ${Math.round(Math.min(w * 0.5, h * 0.45))}px ${getComputedStyle(document.documentElement).getPropertyValue("--mono")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("303", w * 0.5, h * 0.48);
    ctx.restore();
    drawAvatar(assets.heads[state.head], w * 0.5, h * 0.8, w * 0.34, h * 0.55, state.visibility / 100, 0.18);
    drawVignette(0.58);
  }

  function drawRecordFrame(scene) {
    const w = canvas.width;
    const h = canvas.height;
    const margin = Math.max(34, Math.round(Math.min(w, h) * 0.035));
    const small = Math.max(19, Math.round(Math.min(w, h) * 0.015));
    const medium = Math.max(28, Math.round(Math.min(w, h) * 0.024));
    const mono = "SFMono-Regular, Consolas, Liberation Mono, monospace";
    ctx.save();
    ctx.strokeStyle = "rgba(234, 186, 73, 0.52)";
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.00125));
    const corner = Math.round(Math.min(w, h) * 0.04);
    const left = margin;
    const top = margin;
    const right = w - margin;
    const bottom = h - margin;
    [[left, top, 1, 1], [right, top, -1, 1], [right, bottom, -1, -1], [left, bottom, 1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * corner);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * corner, y);
      ctx.stroke();
    });

    ctx.fillStyle = GOLD;
    ctx.font = `600 ${small}px ${mono}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`BITFOOTS / ${scene.name.toUpperCase()}`, margin + corner + small, margin - small * 0.35);
    ctx.textAlign = "right";
    ctx.fillText(`SIGHTING ${pad(state.sighting)} / 303`, w - margin - corner - small, margin - small * 0.35);

    const footerY = h - margin - medium * 1.55;
    ctx.fillStyle = "rgba(10, 14, 18, 0.68)";
    ctx.fillRect(margin, footerY - medium * 0.44, w - margin * 2, medium * 2.6);
    ctx.textAlign = "left";
    ctx.fillStyle = HEADING;
    ctx.font = `500 ${medium}px Georgia, Times New Roman, serif`;
    const note = state.note.trim() || "NO TRACE REMAINS";
    ctx.fillText(note.slice(0, 48), margin + small, footerY);
    ctx.fillStyle = TEXT;
    ctx.font = `500 ${small}px ${mono}`;
    ctx.fillText(`VISIBILITY ${pad(state.visibility, 2)}%   ·   TRACE ${state.visibility < 50 ? "LOST" : "PARTIAL"}   ·   HEAD ${pad(state.head + 1, 2)}`, margin + small, footerY + medium * 1.25);
    ctx.restore();
  }

  function render() {
    renderFrame = 0;
    if (!assets.heads.length || !assets.plates.forest) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scene = scenes.find((item) => item.id === state.scene);
    const renderScene = {
      forest: drawForestScene,
      lantern: drawLanternScene,
      trail: drawTrailScene,
      shield: drawShieldScene,
      eyes: drawEyesScene,
      vouch: drawVouchScene,
      ordinal: drawOrdinalScene,
      sighting: drawSightingScene
    }[state.scene];
    renderScene();
    drawRecordFrame(scene);
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(render);
  }

  function randomize() {
    const scene = scenes[Math.floor(Math.random() * scenes.length)];
    selectScene(scene.id);
    selectHead(Math.floor(Math.random() * 18));
    state.partner = (state.head + 1 + Math.floor(Math.random() * 16)) % 18;
    partnerSelect.value = String(state.partner);
    $("#partnerLabel").textContent = `${pad(state.partner + 1, 2)} / 18`;
    state.sighting = 1 + Math.floor(Math.random() * 303);
    $("#sightingNumber").value = String(state.sighting);
    state.visibility = 44 + Math.floor(Math.random() * 57);
    $("#visibility").value = String(state.visibility);
    $("#visibilityValue").textContent = `${state.visibility}%`;
    state.fog = 18 + Math.floor(Math.random() * 70);
    $("#fog").value = String(state.fog);
    $("#fogValue").textContent = `${state.fog}%`;
    state.light = 20 + Math.floor(Math.random() * 60);
    $("#lightPosition").value = String(state.light);
    $("#lightValue").textContent = `${state.light}%`;
    state.seed = Date.now() & 0xffffffff;
    scheduleRender();
  }

  function canvasBlob() {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async function downloadImage() {
    const blob = await canvasBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bitfoots-${state.scene}-sighting-${pad(state.sighting)}.png`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice(`High-resolution ${formats[state.format].width} × ${formats[state.format].height} PNG downloaded.`);
  }

  async function copyImage() {
    if (!navigator.clipboard || !window.ClipboardItem) {
      showNotice("Image copy is unavailable here. Use Download instead.");
      return;
    }
    try {
      const blob = await canvasBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showNotice("Sighting copied to your clipboard.");
    } catch {
      showNotice("This browser blocked image copy. Use Download instead.");
    }
  }

  function showNotice(message) {
    const notice = $("#notice");
    notice.textContent = message;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => { notice.textContent = "Original avatar pixels are preserved in every export."; }, 3800);
  }

  async function preloadAssets() {
    const headPromises = Array.from({ length: 18 }, (_, index) => loadImage(headPath(index)));
    const [heads, forest, shield, archive] = await Promise.all([
      Promise.all(headPromises),
      loadImage("./assets/backgrounds/forest.png"),
      loadImage("./assets/backgrounds/shield.png"),
      loadImage("./assets/backgrounds/archive.png")
    ]);
    assets.heads = heads;
    assets.plates = { forest, shield, archive };
  }

  async function start() {
    applyQueryConfig();
    createSceneControls();
    createHeadControls();
    selectScene(state.scene);
    selectHead(state.head);
    $("#formatSelect").value = state.format;
    bindControls();
    setCanvasFormat();
    try {
      await preloadAssets();
      render();
      $("#loadingVeil").classList.add("ready");
      registerWebMcp();
      if (state.scene === "ordinal" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setInterval(scheduleRender, 120);
      }
    } catch (error) {
      $("#loadingVeil").innerHTML = `<b>ASSET LOAD FAILED</b><small>${error.message}</small>`;
    }
  }

  function applyQueryConfig() {
    const query = new URLSearchParams(location.search);
    const scene = query.get("scene");
    const head = Number(query.get("head"));
    const format = query.get("format");
    if (scenes.some((item) => item.id === scene)) state.scene = scene;
    if (Number.isInteger(head) && head >= 1 && head <= 18) state.head = head - 1;
    if (formats[format]) state.format = format;
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const sceneIds = scenes.map((scene) => scene.id);
    try {
      void Promise.resolve(context.registerTool({
        name: "configure_bitfoot_sighting",
        title: "Configure Bitfoot sighting",
        description: "Configure the visible Bitfoots field record using an original head, one of the eight scenes, a sighting number, format, and optional field note.",
        inputSchema: {
          type: "object",
          properties: {
            scene: { type: "string", enum: sceneIds },
            head: { type: "integer", minimum: 1, maximum: 18 },
            sighting: { type: "integer", minimum: 1, maximum: 303 },
            format: { type: "string", enum: Object.keys(formats) },
            fieldNote: { type: "string", maxLength: 48 }
          },
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Input must be an object.");
          if (input.scene !== undefined) {
            if (!sceneIds.includes(input.scene)) throw new RangeError("Unknown scene.");
            selectScene(input.scene);
          }
          if (input.head !== undefined) {
            if (!Number.isInteger(input.head) || input.head < 1 || input.head > 18) throw new RangeError("Head must be an integer from 1 to 18.");
            selectHead(input.head - 1);
          }
          if (input.sighting !== undefined) {
            if (!Number.isInteger(input.sighting) || input.sighting < 1 || input.sighting > 303) throw new RangeError("Sighting must be an integer from 1 to 303.");
            state.sighting = input.sighting;
            $("#sightingNumber").value = String(input.sighting);
          }
          if (input.format !== undefined) {
            if (!formats[input.format]) throw new RangeError("Unknown format.");
            state.format = input.format;
            $("#formatSelect").value = input.format;
            setCanvasFormat();
          }
          if (input.fieldNote !== undefined) {
            if (typeof input.fieldNote !== "string" || input.fieldNote.length > 48) throw new RangeError("Field note must be at most 48 characters.");
            state.note = input.fieldNote.toUpperCase();
            $("#fieldNote").value = state.note;
          }
          scheduleRender();
          return {
            scene: state.scene,
            head: state.head + 1,
            sighting: state.sighting,
            format: state.format,
            fieldNote: state.note
          };
        }
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch {}
  }

  start();
})();
