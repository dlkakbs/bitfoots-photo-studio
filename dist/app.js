const canvas = document.querySelector("#artboard");
const ctx = canvas.getContext("2d", { alpha: false });

const templates = [
  {
    id: "shield", name: "Shielded Forest", note: "public trail / private ape",
    top: "WHEN THEY ASK FOR YOUR WALLET HISTORY", bottom: "BUT YOU CAME SHIELDED",
    pose: "hands", outfit: "hoodie", x: .67, y: .78, scale: 80
  },
  {
    id: "lantern", name: "Lantern Sweep", note: "caught in the spotlight",
    top: "ME CHECKING THE CHART AT 3AM", bottom: "THE CHART CHECKING ME BACK",
    pose: "pointing", outfit: "auto", x: .43, y: .79, scale: 80
  },
  {
    id: "trail", name: "Vanishing Trail", note: "leave no trace",
    top: "THEY SAID EVERYTHING IS ONCHAIN", bottom: "ME LEAVING ZERO FOOTPRINTS",
    pose: "walking", outfit: "robe", x: .62, y: .81, scale: 77
  },
  {
    id: "inside", name: "Inside the Shield", note: "calm inside / chaos outside",
    top: "THE TIMELINE DURING VOLATILITY", bottom: "ME INSIDE THE SHIELD",
    pose: "drink", outfit: "zcash", x: .5, y: .81, scale: 74
  },
  {
    id: "watcher", name: "Watcher Eyes", note: "privacy paranoia reaction",
    top: "WHEN THE BLOCK EXPLORER", bottom: "STARTS LOOKING BACK",
    pose: "standing", outfit: "suit", x: .5, y: .8, scale: 78
  },
  {
    id: "vouch", name: "The Vouch Trail", note: "two apes / one receipt",
    top: "TRUST ME BRO", bottom: "NO — VOUCH FOR ME ONCHAIN",
    pose: "vouch", outfit: "auto", x: .34, y: .81, scale: 66, partner: true
  },
  {
    id: "ordinal", name: "Lost Ordinal", note: "2.5 years later",
    top: "BOUGHT IT FOR THE ART", bottom: "CHECKED THE FLOOR 2.5 YEARS LATER",
    pose: "pointing", outfit: "sport", x: .69, y: .81, scale: 70
  },
  {
    id: "sighting", name: "303 Sighting", note: "classic mugshot energy",
    top: "RARE BITFOOT SPOTTED", bottom: "LAST SEEN AVOIDING KYC",
    pose: "standing", outfit: "zcash", x: .5, y: .81, scale: 78
  }
];

const headPalettes = [
  ["#672337", "#3b1525", "#f0d6bd", "#ffbd2e"], ["#7e3032", "#431c24", "#efc6a7", "#ffbd2e"],
  ["#172f4e", "#0d1b31", "#f2e7d3", "#ef6a24"], ["#762b31", "#43161d", "#e8bda2", "#f7e5c7"],
  ["#263957", "#101c31", "#cf9f70", "#ff9b25"], ["#7f3335", "#452029", "#f2d7bb", "#f4f0e6"],
  ["#233652", "#111d33", "#d79b63", "#ef6a24"], ["#4f596e", "#25304a", "#c19d76", "#ffbd2e"],
  ["#e95c8b", "#711e51", "#f1c3b3", "#111c36"], ["#45c9e7", "#157da9", "#d4f3f5", "#ffffff"],
  ["#74563e", "#3d2b25", "#cf9f6f", "#f1e5d2"], ["#237566", "#12433d", "#c8aa7e", "#45a78c"],
  ["#463e67", "#221f3d", "#b49a82", "#ffbd2e"], ["#7c252d", "#3d1424", "#ddb098", "#e72e4b"],
  ["#596274", "#28344e", "#cab197", "#e8344e"], ["#545e72", "#24304a", "#c9a68d", "#e9324e"],
  ["#e94d1e", "#9d2714", "#ffad3c", "#ffbd2e"], ["#623d79", "#2d2148", "#d5a7bc", "#ef6a24"]
].map(([shirt, shade, skin, accent]) => ({ shirt, shade, skin, accent }));

const formatSizes = {
  square: [1800, 1800],
  portrait: [1440, 1800],
  wide: [1920, 1080]
};

const state = {
  template: 0,
  head: 0,
  outfit: "hoodie",
  pose: "hands",
  topText: templates[0].top,
  bottomText: templates[0].bottom,
  textStyle: "classic",
  format: "square",
  scale: 80,
  fontSize: 68,
  x: templates[0].x,
  y: templates[0].y,
  flip: false,
  showTag: true,
  customImage: null,
  customName: "Custom template"
};

const els = {
  templateGrid: document.querySelector("#templateGrid"),
  headStrip: document.querySelector("#headStrip"),
  previewTitle: document.querySelector("#previewTitle"),
  resolution: document.querySelector("#resolutionReadout"),
  headCount: document.querySelector("#headCount"),
  outfit: document.querySelector("#outfitSelect"),
  pose: document.querySelector("#poseSelect"),
  topText: document.querySelector("#topText"),
  bottomText: document.querySelector("#bottomText"),
  textStyle: document.querySelector("#textStyle"),
  format: document.querySelector("#formatSelect"),
  scale: document.querySelector("#characterScale"),
  fontSize: document.querySelector("#fontSize"),
  scaleValue: document.querySelector("#scaleValue"),
  fontValue: document.querySelector("#fontValue"),
  flip: document.querySelector("#flipCharacter"),
  showTag: document.querySelector("#showTag"),
  upload: document.querySelector("#backgroundUpload"),
  loading: document.querySelector("#loading"),
  dragHint: document.querySelector("#dragHint"),
  status: document.querySelector("#statusLine")
};

const heads = Array.from({ length: 18 }, (_, i) => {
  const img = new Image();
  img.src = `./assets/heads/bitfoot-head-${String(i + 1).padStart(2, "0")}.png`;
  return img;
});

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const currentTemplate = () => templates[state.template] || null;

function block(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function labelBlock(c, text, x, y, options = {}) {
  const size = options.size || 26;
  c.save();
  c.font = `900 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  c.textBaseline = "middle";
  const width = c.measureText(text).width + size * 1.05;
  block(c, x, y, width, size * 1.65, options.background || "#111318");
  c.fillStyle = options.color || "#ffbd2e";
  c.fillText(text, x + size * .52, y + size * .84);
  c.restore();
}

function drawEye(c, x, y, unit, color = "#ffbd2e") {
  block(c, x, y, unit * 3, unit * 2, "rgba(17,19,24,.72)");
  block(c, x + unit, y + unit * .5, unit, unit, color);
}

function drawFootprint(c, x, y, unit, color, alpha = 1, rotate = 0) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(rotate);
  block(c, -unit * .55, -unit * .65, unit * 1.1, unit * 2.25, color);
  block(c, -unit * 1.05, -unit * 1.45, unit * .58, unit * .72, color);
  block(c, -unit * .3, -unit * 1.72, unit * .58, unit * .72, color);
  block(c, unit * .45, -unit * 1.42, unit * .58, unit * .72, color);
  c.restore();
}

function drawBackdrop(c, w, h) {
  const t = currentTemplate();
  c.imageSmoothingEnabled = false;

  if (!t && state.customImage) {
    const img = state.customImage;
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    c.fillStyle = "#111318";
    c.fillRect(0, 0, w, h);
    c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    c.fillStyle = "rgba(17,19,24,.08)";
    c.fillRect(0, 0, w, h);
    return;
  }

  const id = t?.id || "shield";
  if (id === "shield") {
    block(c, 0, 0, w, h, "#ffbd2e");
    block(c, 0, 0, w * .44, h, "#111318");
    block(c, w * .44, 0, w * .025, h, "#f26c21");
    const u = Math.max(8, w / 130);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) drawEye(c, w * .06 + col * w * .12, h * .22 + row * h * .13, u, row % 2 ? "#f4f0e6" : "#ffbd2e");
    labelBlock(c, "PUBLIC", w * .055, h * .08, { size: w * .026, background: "#f4f0e6", color: "#111318" });
    labelBlock(c, "SHIELDED", w * .51, h * .08, { size: w * .026 });
    block(c, w * .55, h * .22, w * .38, h * .53, "rgba(255,255,255,.2)");
    block(c, w * .57, h * .245, w * .34, h * .48, "rgba(255,255,255,.16)");
  }

  if (id === "lantern") {
    block(c, 0, 0, w, h, "#151821");
    const grid = w / 14;
    c.strokeStyle = "rgba(255,255,255,.08)";
    c.lineWidth = Math.max(2, w / 500);
    for (let x = 0; x < w; x += grid) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += grid) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = "#ffcf55";
    c.beginPath(); c.moveTo(w * .8, 0); c.lineTo(w * .08, h); c.lineTo(w * .77, h); c.closePath(); c.fill();
    block(c, w * .71, 0, w * .18, h * .08, "#f4f0e6");
    block(c, w * .75, h * .08, w * .1, h * .045, "#f26c21");
    labelBlock(c, "CAUGHT IN 4K", w * .06, h * .08, { size: w * .028, background: "#e94a34", color: "#fff" });
  }

  if (id === "trail") {
    block(c, 0, 0, w, h, "#f3eee2");
    block(c, 0, h * .67, w, h * .33, "#d9d1c2");
    c.fillStyle = "#ef6a24";
    c.beginPath(); c.moveTo(w * .1, h); c.lineTo(w * .58, h * .15); c.lineTo(w * .83, h * .15); c.lineTo(w * .63, h); c.closePath(); c.fill();
    c.fillStyle = "#ffbd2e";
    c.beginPath(); c.moveTo(w * .16, h); c.lineTo(w * .61, h * .15); c.lineTo(w * .65, h * .15); c.lineTo(w * .27, h); c.closePath(); c.fill();
    for (let i = 0; i < 5; i++) drawFootprint(c, w * (.2 + i * .085), h * (.78 - i * .12), w * (.025 - i * .002), "#111318", 1 - i * .17, -.28);
    labelBlock(c, "NO TRACE", w * .06, h * .08, { size: w * .03, background: "#111318", color: "#ffbd2e" });
  }

  if (id === "inside") {
    block(c, 0, 0, w, h, "#e94a34");
    const u = w / 34;
    for (let i = 0; i < 13; i++) {
      block(c, (i * 2.9 % 31) * u, ((i * 5.3) % 22 + 3) * u, u * 1.7, u * .65, i % 2 ? "#111318" : "#ffbd2e");
    }
    c.fillStyle = "#55c8e9";
    c.beginPath();
    c.arc(w * .5, h * .53, Math.min(w, h) * .39, Math.PI, 0);
    c.lineTo(w * .84, h * .82); c.quadraticCurveTo(w * .5, h * .97, w * .16, h * .82); c.closePath(); c.fill();
    c.strokeStyle = "#111318"; c.lineWidth = w * .018; c.stroke();
    block(c, w * .21, h * .56, w * .58, h * .25, "rgba(255,255,255,.16)");
    labelBlock(c, "SAFE ZONE", w * .055, h * .07, { size: w * .028 });
  }

  if (id === "watcher") {
    block(c, 0, 0, w, h, "#331d45");
    const unit = Math.max(9, w / 110);
    for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) {
      const x = w * .05 + col * w * .205 + (r % 2) * w * .05;
      const y = h * .12 + r * h * .17;
      drawEye(c, x, y, unit, (r + col) % 3 ? "#ffbd2e" : "#55c8e9");
    }
    block(c, w * .27, h * .15, w * .46, h * .72, "rgba(17,19,24,.68)");
    c.strokeStyle = "#ffbd2e"; c.lineWidth = w * .008; c.strokeRect(w * .29, h * .17, w * .42, h * .68);
    labelBlock(c, "WHO'S WATCHING?", w * .055, h * .06, { size: w * .024, background: "#f4f0e6", color: "#331d45" });
  }

  if (id === "vouch") {
    block(c, 0, 0, w, h, "#ffbd2e");
    block(c, w * .5, 0, w * .5, h, "#55c8e9");
    for (let y = 0; y < h; y += h / 9) block(c, w * .487, y, w * .026, h / 18, "#111318");
    block(c, w * .43, h * .38, w * .14, h * .18, "#f4f0e6");
    c.strokeStyle = "#111318"; c.lineWidth = w * .008; c.strokeRect(w * .43, h * .38, w * .14, h * .18);
    labelBlock(c, "VOUCH RECEIPT", w * .055, h * .07, { size: w * .028 });
  }

  if (id === "ordinal") {
    block(c, 0, 0, w, h, "#f2ecdf");
    block(c, w * .5, 0, w * .5, h, "#6f3d8f");
    block(c, w * .49, 0, w * .02, h, "#111318");
    labelBlock(c, "DAY 1", w * .06, h * .08, { size: w * .028, background: "#111318", color: "#ffbd2e" });
    labelBlock(c, "2.5 YEARS LATER", w * .56, h * .08, { size: w * .021, background: "#ffbd2e", color: "#111318" });
    block(c, w * .075, h * .27, w * .35, h * .5, "#d9d0c2");
    c.fillStyle = "rgba(17,19,24,.15)";
    for (let i = 0; i < 8; i++) block(c, w * (.095 + (i % 2) * .19), h * (.3 + i * .055), w * .13, h * .018, "rgba(17,19,24,.14)");
  }

  if (id === "sighting") {
    block(c, 0, 0, w, h, "#f6f1e6");
    block(c, 0, 0, w, h * .08, "#e8493f");
    block(c, 0, h * .92, w, h * .08, "#111318");
    c.strokeStyle = "#9e9688"; c.lineWidth = Math.max(2, w / 600);
    for (let i = 0; i < 8; i++) {
      const y = h * (.18 + i * .09); c.beginPath(); c.moveTo(w * .12, y); c.lineTo(w * .88, y); c.stroke();
      c.fillStyle = "#777066"; c.font = `800 ${w * .016}px ui-monospace, monospace`; c.fillText(`${4 + i}'`, w * .075, y + w * .006);
    }
    labelBlock(c, "SIGHTING #303", w * .055, h * .02, { size: w * .025, background: "#e8493f", color: "#fff" });
    block(c, w * .73, h * .77, w * .17, h * .09, "#ffbd2e");
    c.save(); c.translate(w * .815, h * .815); c.rotate(-.08); c.fillStyle = "#111318"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `900 ${w * .026}px ui-monospace, monospace`; c.fillText("WANTED", 0, 0); c.restore();
  }
}

function resolvePalette(index, outfit) {
  const base = { ...headPalettes[index] };
  if (outfit === "zcash") return { ...base, shirt: "#f4f1e6", shade: "#d5cfc0", accent: "#ffbd2e" };
  if (outfit === "hoodie") return { ...base, shirt: "#238673", shade: "#124c46", accent: "#48b89a" };
  if (outfit === "suit") return { ...base, shirt: "#152b4c", shade: "#0a182f", accent: "#e33f55" };
  if (outfit === "robe") return { ...base, shirt: "#eee9d7", shade: "#d4cebc", accent: "#a69aa3" };
  if (outfit === "sport") return { ...base, shirt: "#239ee0", shade: "#176fb4", accent: "#e43652" };
  return base;
}

function drawBody(c, palette, outfit, pose) {
  const { shirt, shade, skin, accent } = palette;

  if (outfit === "hoodie") {
    block(c, -142, -460, 284, 295, shade);
    block(c, -119, -440, 238, 260, shirt);
  }

  block(c, -54, -225, 108, 58, skin);
  block(c, -170, -183, 340, 70, shirt);
  block(c, -139, -127, 278, 248, shirt);
  block(c, -139, -127, 48, 248, shade);
  block(c, 91, -127, 48, 248, accent);

  if (outfit === "zcash") {
    block(c, -18, -82, 36, 136, accent);
    block(c, -53, -34, 106, 28, accent);
    block(c, -52, 37, 103, 24, accent);
  }
  if (outfit === "suit") {
    block(c, -15, -112, 30, 218, "#f4f0e6");
    block(c, -11, -105, 22, 190, accent);
    block(c, -88, -127, 73, 72, "#1f3962");
    block(c, 15, -127, 73, 72, "#1f3962");
  }
  if (outfit === "robe") {
    for (let i = 0; i < 6; i++) block(c, -88 + i * 25, -126 + i * 34, 25, 50, accent);
  }
  if (outfit === "sport") {
    block(c, -139, -84, 278, 25, "#f4f0e6");
    block(c, -14, -127, 28, 248, accent);
  }

  if (pose === "standing") {
    block(c, -201, -122, 63, 251, shirt); block(c, 139, -122, 63, 251, shirt);
    block(c, -201, 98, 63, 70, skin); block(c, 139, 98, 63, 70, skin);
  }
  if (pose === "pointing") {
    block(c, -201, -122, 63, 248, shirt); block(c, -201, 96, 63, 66, skin);
    block(c, 139, -116, 154, 62, shirt); block(c, 274, -116, 62, 62, skin);
    block(c, 322, -145, 105, 27, skin); block(c, 394, -171, 31, 53, skin);
  }
  if (pose === "hands") {
    block(c, -202, -117, 65, 176, shirt); block(c, 139, -117, 65, 176, shirt);
    block(c, -180, 42, 78, 55, skin); block(c, 102, 42, 78, 55, skin);
    block(c, -138, 71, 57, 66, skin); block(c, 81, 71, 57, 66, skin);
  }
  if (pose === "walking") {
    block(c, -214, -137, 66, 207, shirt); block(c, -230, 42, 66, 67, skin);
    block(c, 138, -116, 64, 180, shirt); block(c, 166, 42, 64, 67, skin);
  }
  if (pose === "vouch") {
    block(c, -202, -120, 64, 246, shirt); block(c, -202, 96, 64, 66, skin);
    block(c, 138, -113, 164, 63, shirt); block(c, 284, -113, 68, 63, skin);
    block(c, 335, -132, 81, 100, "#ffbd2e"); block(c, 349, -116, 53, 13, "#111318"); block(c, 349, -87, 37, 12, "#111318");
  }
  if (pose === "drink") {
    block(c, -202, -120, 64, 246, shirt); block(c, -202, 96, 64, 66, skin);
    block(c, 138, -115, 72, 196, shirt); block(c, 180, 49, 62, 62, skin);
    block(c, 207, -57, 66, 132, "#26a7e6"); block(c, 220, -91, 40, 44, "#26a7e6"); block(c, 207, 1, 66, 21, "#ffbd2e");
  }

  if (pose === "walking") {
    block(c, -117, 105, 102, 205, shade); block(c, 14, 105, 103, 154, shirt);
    block(c, -148, 281, 133, 48, "#111318"); block(c, 14, 230, 133, 48, "#111318");
  } else {
    block(c, -119, 105, 105, 205, shade); block(c, 14, 105, 105, 205, shirt);
    block(c, -145, 280, 131, 49, "#111318"); block(c, 14, 280, 131, 49, "#111318");
  }
}

function drawHead(c, image) {
  if (!image?.complete || !image.naturalWidth) return;
  const height = 365;
  const width = height * (image.naturalWidth / image.naturalHeight);
  c.imageSmoothingEnabled = false;
  c.drawImage(image, -width / 2, -520, width, height);
}

function drawCharacter(c, { x, y, scale, head, outfit, pose, flip = false, alpha = 1 }) {
  const artScale = (canvas.width / 1200) * (scale / 100);
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale((flip ? -1 : 1) * artScale, artScale);
  drawBody(c, resolvePalette(head, outfit), outfit === "auto" ? "auto" : outfit, pose);
  drawHead(c, heads[head]);
  c.restore();
}

function characterPlacement() {
  return { x: state.x * canvas.width, y: state.y * canvas.height, scale: state.scale, head: state.head, outfit: state.outfit, pose: state.pose, flip: state.flip };
}

function drawCharacters(c) {
  const t = currentTemplate();
  if (t?.id === "ordinal") {
    drawCharacter(c, { x: canvas.width * .28, y: canvas.height * .79, scale: Math.max(46, state.scale * .72), head: state.head, outfit: state.outfit, pose: "standing", flip: false, alpha: .28 });
  }
  drawCharacter(c, characterPlacement());
  if (t?.partner) {
    drawCharacter(c, {
      x: canvas.width * .72,
      y: state.y * canvas.height,
      scale: state.scale,
      head: (state.head + 7) % heads.length,
      outfit: "suit",
      pose: "vouch",
      flip: true,
      alpha: 1
    });
  }
}

function wrappedLines(c, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const attempt = line ? `${line} ${word}` : word;
    if (line && c.measureText(attempt).width > maxWidth) { lines.push(line); line = word; }
    else line = attempt;
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function fitText(c, text, requestedSize, maxWidth) {
  let size = requestedSize;
  let lines;
  do {
    c.font = `900 ${size}px Impact, Haettenschweiler, "Arial Black", sans-serif`;
    lines = wrappedLines(c, text, maxWidth);
    if (lines.length <= 2 && lines.every(line => c.measureText(line).width <= maxWidth)) break;
    size -= 4;
  } while (size > 32);
  return { size, lines };
}

function drawCaption(c, text, position) {
  if (!text.trim()) return;
  const w = canvas.width;
  const h = canvas.height;
  const base = state.fontSize * (w / 1000);
  const maxWidth = w * .88;
  const content = state.textStyle === "classic" ? text.toUpperCase() : text;
  const fitted = fitText(c, content, base, maxWidth);
  const lineHeight = fitted.size * 1.03;
  const totalHeight = fitted.lines.length * lineHeight;
  const isTop = position === "top";
  const yStart = isTop ? h * .045 : h - h * .045 - totalHeight + lineHeight;

  c.save();
  c.font = `900 ${fitted.size}px Impact, Haettenschweiler, "Arial Black", sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineJoin = "round";

  if (state.textStyle === "boxed") {
    const pad = fitted.size * .38;
    const boxHeight = totalHeight + pad * 1.3;
    const boxY = isTop ? 0 : h - boxHeight;
    block(c, 0, boxY, w, boxHeight, "#111318");
    c.fillStyle = "#f4f0e6";
    fitted.lines.forEach((line, i) => c.fillText(line, w / 2, boxY + pad * .65 + lineHeight * (i + .5)));
  } else if (state.textStyle === "clean") {
    const widest = Math.max(...fitted.lines.map(line => c.measureText(line).width));
    const boxHeight = totalHeight + fitted.size * .45;
    const boxY = yStart - lineHeight * .56;
    block(c, (w - widest) / 2 - fitted.size * .3, boxY, widest + fitted.size * .6, boxHeight, "#f4f0e6");
    c.fillStyle = "#111318";
    fitted.lines.forEach((line, i) => c.fillText(line, w / 2, yStart + i * lineHeight));
  } else {
    c.lineWidth = Math.max(8, fitted.size * .13);
    c.strokeStyle = "#111318";
    c.fillStyle = "#fff";
    fitted.lines.forEach((line, i) => {
      c.strokeText(line, w / 2, yStart + i * lineHeight);
      c.fillText(line, w / 2, yStart + i * lineHeight);
    });
  }
  c.restore();
}

function drawTag(c) {
  if (!state.showTag) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = w * .022;
  c.save();
  c.font = `900 ${w * .015}px ui-monospace, SFMono-Regular, monospace`;
  const text = "FOOTPRINT LAB · BITFOOTS";
  const width = c.measureText(text).width + pad;
  block(c, w - width - pad * .55, h * .86, width, w * .03, "rgba(17,19,24,.78)");
  c.fillStyle = "#ffbd2e"; c.textAlign = "left"; c.textBaseline = "middle";
  c.fillText(text, w - width - pad * .12, h * .875);
  c.restore();
}

let framePending = false;
function requestRender() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => { framePending = false; render(); });
}

function render() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackdrop(ctx, canvas.width, canvas.height);
  drawCharacters(ctx);
  drawCaption(ctx, state.topText, "top");
  drawCaption(ctx, state.bottomText, "bottom");
  drawTag(ctx);
  ctx.restore();
}

function buildTemplateCards() {
  const template = document.querySelector("#templateCard");
  templates.forEach((item, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.template = item.id;
    node.querySelector(".template-copy b").textContent = item.name;
    node.querySelector(".template-copy small").textContent = item.note;
    node.querySelector(".template-number").textContent = String(index + 1).padStart(2, "0");
    node.addEventListener("click", () => selectTemplate(index));
    els.templateGrid.append(node);
  });
}

function buildHeads() {
  heads.forEach((image, index) => {
    const button = document.createElement("button");
    button.className = "head-button";
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `Bitfoot ${String(index + 1).padStart(2, "0")}`);
    const thumb = new Image();
    thumb.src = image.src;
    thumb.alt = "";
    button.append(thumb);
    button.addEventListener("click", () => {
      state.head = index;
      els.headCount.textContent = `${String(index + 1).padStart(2, "0")} / 18`;
      syncSelections();
      requestRender();
    });
    els.headStrip.append(button);
  });
}

function selectTemplate(index, applyCopy = true) {
  const item = templates[index];
  state.template = index;
  state.customImage = null;
  state.x = item.x; state.y = item.y; state.scale = item.scale;
  state.pose = item.pose; state.outfit = item.outfit;
  if (applyCopy) { state.topText = item.top; state.bottomText = item.bottom; }
  syncControls();
  requestRender();
}

function syncSelections() {
  [...els.templateGrid.children].forEach((button, index) => button.setAttribute("aria-checked", String(!state.customImage && index === state.template)));
  [...els.headStrip.children].forEach((button, index) => button.setAttribute("aria-checked", String(index === state.head)));
}

function syncControls() {
  const item = currentTemplate();
  els.previewTitle.textContent = state.customImage ? state.customName : item.name;
  els.outfit.value = state.outfit;
  els.pose.value = state.pose;
  els.topText.value = state.topText;
  els.bottomText.value = state.bottomText;
  els.textStyle.value = state.textStyle;
  els.format.value = state.format;
  els.scale.value = state.scale;
  els.fontSize.value = state.fontSize;
  els.flip.checked = state.flip;
  els.showTag.checked = state.showTag;
  els.scaleValue.textContent = `${state.scale}%`;
  els.fontValue.textContent = `${state.fontSize}px`;
  syncSelections();
}

function setFormat(value) {
  state.format = value;
  const [w, h] = formatSizes[value];
  canvas.width = w;
  canvas.height = h;
  els.resolution.textContent = `${w} × ${h}`;
  requestRender();
}

function bindInputs() {
  const bindings = [
    [els.outfit, "change", () => { state.outfit = els.outfit.value; requestRender(); }],
    [els.pose, "change", () => { state.pose = els.pose.value; requestRender(); }],
    [els.topText, "input", () => { state.topText = els.topText.value; requestRender(); }],
    [els.bottomText, "input", () => { state.bottomText = els.bottomText.value; requestRender(); }],
    [els.textStyle, "change", () => { state.textStyle = els.textStyle.value; requestRender(); }],
    [els.format, "change", () => setFormat(els.format.value)],
    [els.scale, "input", () => { state.scale = Number(els.scale.value); els.scaleValue.textContent = `${state.scale}%`; requestRender(); }],
    [els.fontSize, "input", () => { state.fontSize = Number(els.fontSize.value); els.fontValue.textContent = `${state.fontSize}px`; requestRender(); }],
    [els.flip, "change", () => { state.flip = els.flip.checked; requestRender(); }],
    [els.showTag, "change", () => { state.showTag = els.showTag.checked; requestRender(); }]
  ];
  bindings.forEach(([element, event, handler]) => element.addEventListener(event, handler));

  document.querySelector("#downloadBtn").addEventListener("click", downloadImage);
  document.querySelector("#copyBtn").addEventListener("click", copyImage);
  document.querySelector("#resetPosition").addEventListener("click", () => {
    const t = currentTemplate() || { x: .5, y: .8, scale: 80 };
    state.x = t.x; state.y = t.y; state.scale = t.scale;
    syncControls(); requestRender();
  });
  document.querySelector("#randomizeTop").addEventListener("click", randomize);

  els.upload.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.customImage = image;
        state.customName = file.name.replace(/\.[^.]+$/, "");
        state.x = .5; state.y = .8; state.scale = 78;
        els.previewTitle.textContent = state.customName;
        syncSelections(); requestRender();
        setStatus("Custom template loaded locally.");
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function randomize() {
  const index = Math.floor(Math.random() * templates.length);
  state.head = Math.floor(Math.random() * heads.length);
  state.flip = Math.random() > .6;
  selectTemplate(index, true);
  els.headCount.textContent = `${String(state.head + 1).padStart(2, "0")} / 18`;
  syncControls();
  setStatus("Fresh Bitfoot meme assembled.");
}

function setStatus(message, error = false) {
  els.status.lastChild.textContent = ` ${message}`;
  els.status.querySelector("i").style.background = error ? "#e8493f" : "#32a85b";
}

function downloadImage() {
  render();
  const link = document.createElement("a");
  const slug = (currentTemplate()?.id || "custom").replace(/[^a-z0-9]+/g, "-");
  link.download = `bitfoots-${slug}-${String(state.head + 1).padStart(2, "0")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("High-resolution PNG downloaded.");
}

async function copyImage() {
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setStatus("Meme copied to clipboard.");
  } catch {
    setStatus("Clipboard access was blocked. Use Download PNG.", true);
  }
}

let dragging = false;
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, .08, .92),
    y: clamp((event.clientY - rect.top) / rect.height + .1, .42, .96)
  };
}

canvas.addEventListener("pointerdown", event => {
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("dragging");
  els.dragHint.classList.add("hidden");
  Object.assign(state, pointerPosition(event));
  requestRender();
});
canvas.addEventListener("pointermove", event => {
  if (!dragging) return;
  Object.assign(state, pointerPosition(event));
  requestRender();
});
canvas.addEventListener("pointerup", event => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
  canvas.classList.remove("dragging");
});
canvas.addEventListener("pointercancel", () => { dragging = false; canvas.classList.remove("dragging"); });

async function init() {
  buildTemplateCards();
  buildHeads();
  bindInputs();
  const params = new URLSearchParams(window.location.search);
  const requestedTemplate = templates.findIndex(item => item.id === params.get("template"));
  const requestedHead = Number(params.get("head"));
  if (Number.isInteger(requestedHead) && requestedHead >= 1 && requestedHead <= heads.length) state.head = requestedHead - 1;
  if (requestedTemplate >= 0) selectTemplate(requestedTemplate, true);
  else syncControls();
  els.headCount.textContent = `${String(state.head + 1).padStart(2, "0")} / 18`;
  setFormat(state.format);
  await Promise.all(heads.map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })));
  render();
  els.loading.classList.add("hide");
}

init();
