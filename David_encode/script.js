const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const inputKeyValue = document.getElementById("key");

document.addEventListener("DOMContentLoaded", function () {
  setPassAlgo();
  setMode();
});

document.getElementById("encode-button").addEventListener("click", encode);
document.getElementById("decode-button").addEventListener("click", decode);
document.getElementById("download-button").addEventListener("click", downloadImage);
document.getElementById("reset-button").addEventListener("click", clearForm);

document.getElementById("mode").addEventListener("change", function () {
  setMode();
  setPassAlgo();
});

document.getElementById("algorithm").addEventListener("change", function () {
  setPassAlgo();
});

document.getElementById("toggle-info").addEventListener("click", function () {
  const info = document.getElementById("sidebar");
  const container = document.getElementById("container");
  container.style.margin = container.style.margin === "0 auto" ? "0" : "0 auto";
  this.textContent = info.style.display === "block" ? "Show Info" : "Hide Info";
  info.style.display = info.style.display === "block" ? "none" : "block";
});

function sanitizeInput(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function setPassAlgo() {
  const algo = document.getElementById("algorithm").value;
  if (algo === "password") {
    document.getElementById("passphrase").setAttribute("required", "true");
    document.getElementById("passphrase").focus();
  } else {
    document.getElementById("passphrase").removeAttribute("required");
  }
  if (algo === "standard") {
    document.getElementById("passphrase").value = "";
  }
}

function setMode() {
  const mode = document.getElementById("mode").value;
  if (mode === "hidden-noise") {
    document.getElementById("algorithm").value = "password";
    document.getElementById("algorithm").disabled = true;
    inputKeyValue.style.display = "block";
  } else {
    document.getElementById("algorithm").disabled = false;
    inputKeyValue.style.display = "none";
    inputKeyValue.value = "";
    inputKeyValue.setAttribute("readonly", "true");
  }
}

function clearForm() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  document.getElementById("output").textContent = "";
  document.getElementById("input").value = "";
  document.getElementById("passphrase").value = "";
  inputKeyValue.value = "";
}

function encode() {
  const text = document.getElementById("input").value.trim();
  const mode = document.getElementById("mode").value;
  const algo = document.getElementById("algorithm").value;
  const passphrase = document.getElementById("passphrase").value.trim();

  if (!text) {
    alert("Please enter text to encode.");
    return;
  }

  if (algo === "password" && !passphrase) {
    alert("Please enter a passphrase for password obfuscation.");
    return;
  }

  //const sanitizedText = sanitizeInput(text);
  const encoder = new TextEncoder();
  let data = encoder.encode(text);

  if (mode === "hidden-noise") {
    // Prepend length of data for accurate decoding
    const dataWithLen = new Uint8Array(4 + data.length);
    new DataView(dataWithLen.buffer).setUint32(0, data.length, false); // Use Big Endian for consistency
    dataWithLen.set(data, 4);
    data = dataWithLen; // Now data contains the length prefix
  }

  if (algo === "password") {
    data = obfuscate(data, passphrase);
  }

  if (mode === "hidden-noise") {
    if (algo !== "password") {
      algo = "password";
      document.getElementById("algorithm").value = algo;
    }
    const embedWidth = 64;
    const embedHeight = Math.ceil(data.length / embedWidth);
    const canvasSize = 256;

    canvas.width = canvas.height = canvasSize;
    fillWith3DNoise(ctx, canvasSize, canvasSize);

    // Pick random location that fits
    const xStart = Math.floor(Math.random() * (canvasSize - embedWidth));
    const yStart = Math.floor(Math.random() * (canvasSize - embedHeight));

    const result = padDataToGrid(data, embedWidth);
    const encoded = (algo === "custom") ? obfuscate(result.padded, passphrase) : result.padded;

    embedEncodedData(ctx, encoded, xStart, yStart, embedWidth, result.height);

    //embedEncodedData(ctx, data, xStart, yStart, embedWidth, embedHeight);

    inputKeyValue.value = `x=${xStart};y=${yStart};w=${embedWidth};h=${embedHeight}`;
    inputKeyValue.setAttribute("readonly", "true");
  } else if (mode === "rgb") {
    encodeRGB(data);
  } else if (mode === "bw") {
    encodeBW(data);
  }
}


function decode() {
  const mode = document.getElementById("mode").value;
  const algo = document.getElementById("algorithm").value;
  const passphrase = document.getElementById("passphrase").value.trim();

  if (algo === "password" && !passphrase) {
    alert("Please enter the correct passphrase for decoding.");
    return;
  }

  let bytes = [];

  if (mode === "hidden-noise") {
    const sanitizeKey = key => key.replace(/[^0-9xywh=;]/g, '');
    const key = sanitizeKey(inputKeyValue.value);

    if (!key) {
      inputKeyValue.removeAttribute("readonly");
      alert("Please enter key (x, y, w, h) to decode hidden noise image.");
      return;
    }

    const parts = Object.fromEntries(key.split(";").map(p => p.split("=")));
    const x = parseInt(parts.x), y = parseInt(parts.y);
    const w = parseInt(parts.w), h = parseInt(parts.h);

    if ([x, y, w, h].some(isNaN)) {
      alert("Invalid key format.");
      return;
    }

    let decoded = extractDataRegion(ctx, x, y, w, h);

    if (algo === "password") {
      decoded = deobfuscate(decoded, passphrase);
    }

    if (decoded.length < 4) {
      alert("Invalid data: too short to contain length information.");
      return;
    }

    const dataView = new DataView(decoded.buffer);
    const originalLength = dataView.getUint32(0, false); // Big Endian

    if (decoded.length < 4 + originalLength) {
      alert("Invalid data: length mismatch. The data may be corrupt or the key is incorrect.");
      return;
    }

    const originalData = decoded.slice(4, 4 + originalLength);

    const text = new TextDecoder().decode(originalData);
    document.getElementById("output").textContent = text.trim();
    return;
  } else if (mode === "rgb") {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height - 1);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      bytes.push(pixels[i], pixels[i + 1], pixels[i + 2]);
    }
  } else if (mode === "bw") {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height - 1);
    const pixels = imgData.data;
    const bits = [];
    for (let i = 0; i < pixels.length; i += 4) {
      bits.push(pixels[i] < 128 ? 1 : 0);
    }
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | (bits[i + j] || 0);
      }
      bytes.push(byte);
    }
  } else {
    return;
  }

  while (bytes[bytes.length - 1] === 0) bytes.pop();
  let decoded = new Uint8Array(bytes);

  try {
    if (algo === "password") {
      decoded = deobfuscate(decoded, passphrase);
    }
    const text = new TextDecoder().decode(decoded);
    document.getElementById("output").textContent = text;
  } catch (e) {
    alert("Failed to decode. Possibly incorrect passphrase or corrupted image.");
    document.getElementById("output").textContent = "";
  }
}


function encodeRGB(data) {
  const bytes = Array.from(data);
  while (bytes.length % 3 !== 0) bytes.push(0);
  const size = Math.ceil(Math.sqrt(bytes.length / 3));
  canvas.width = size;
  canvas.height = size + 1;

  const imgData = ctx.createImageData(size, size + 1);
  const pixels = imgData.data;

  let i = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const j = (y * size + x) * 4;
      pixels[j] = bytes[i++] || 0;
      pixels[j + 1] = bytes[i++] || 0;
      pixels[j + 2] = bytes[i++] || 0;
      pixels[j + 3] = 255;
    }
  }

  // white orientation strip
  const start = size * size * 4;
  for (let i = start; i < pixels.length; i += 4) {
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

function encodeBW(data) {
  if (data.length === 0) {
    alert("Please enter some text to encode.");
    return;
  }
  const bits = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  const size = Math.ceil(Math.sqrt(bits.length));
  canvas.width = size;
  canvas.height = size + 1;

  const imgData = ctx.createImageData(size, size + 1);
  const pixels = imgData.data;

  let i = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const j = (y * size + x) * 4;
      const bit = bits[i++] || 0;
      const c = bit ? 0 : 255;
      pixels[j] = pixels[j + 1] = pixels[j + 2] = c;
      pixels[j + 3] = 255;
    }
  }

  // white orientation strip
  const start = size * size * 4;
  for (let i = start; i < pixels.length; i += 4) {
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

function obfuscate(data, passphrase = "obfuscate") {
  const prng = mulberry32(seedFromString(passphrase));
  const sbox = Array.from({ length: 256 }, (_, i) => i);

  // Shuffle the sbox
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [sbox[i], sbox[j]] = [sbox[j], sbox[i]];
  }

  // Substitute and rotate
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const sub = sbox[data[i]];
    out[i] = ((sub << 3) | (sub >> 5)) & 0xff;  // Rotate left by 3 bits
  }
  return out;
}

function deobfuscate(data, passphrase = "obfuscate") {
  const prng = mulberry32(seedFromString(passphrase));
  const sbox = Array.from({ length: 256 }, (_, i) => i);

  // Shuffle the sbox
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [sbox[i], sbox[j]] = [sbox[j], sbox[i]];
  }

  // Reverse sbox lookup
  const revSbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    revSbox[sbox[i]] = i;
  }

  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const rot = ((data[i] >> 3) | (data[i] << 5)) & 0xff;
    out[i] = revSbox[rot];
  }
  return out;
}

// Deterministic PRNG
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

function padDataToGrid(data, width) {
  const height = Math.ceil(data.length / width);
  const total = width * height;

  const padded = new Uint8Array(total);
  padded.set(data);

  // Optional: Fill remainder with random/obfuscated pattern
  for (let i = data.length; i < total; i++) {
    padded[i] = Math.floor(Math.random() * 256);  // Simulates noise
    // OR: padded[i] = 0;  // Safer/cleaner if you want deterministic decoding
  }

  return { padded, width, height };
}

function fillWith3DNoise(ctx, width, height) {
  const imgData = ctx.createImageData(width, height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    let val = Math.floor(Math.random() * 256);

    imgData.data[i] = val;
    imgData.data[i+1] = val;
    imgData.data[i+2] = val;
    imgData.data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

function embedEncodedData(ctx, data, xStart, yStart, width, height) {
  const imgData = ctx.createImageData(width, height);
  let i = 0;
  for (let y = 0; y < height && i < data.length; y++) {
    for (let x = 0; x < width && i < data.length; x++) {
      const val = data[i++];
      const idx = (y * width + x) * 4;
      imgData.data[idx] = val;
      imgData.data[idx+1] = val;
      imgData.data[idx+2] = val;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, xStart, yStart);
}

function extractDataRegion(ctx, x, y, width, height) {
  const imgData = ctx.getImageData(x, y, width, height);
  const data = [];
  for (let i = 0; i < imgData.data.length; i += 4) {
    data.push(imgData.data[i]);  // Assume grayscale encode
  }
  return new Uint8Array(data);
}

function downloadImage() {
  if (canvas.width === 0 || canvas.height === 0 || canvas.length === 0) return;
  const rndChars = Math.random().toString(36).substring(7);

  const keyValue = inputKeyValue.value.trim();
  const sanitizeKey = keyValue => keyValue.replace(/[^0-9xywh=;]/g, '');
  sanitizeKey(keyValue);

  if (keyValue.length > 0) {
    const blob = new Blob([keyValue], {type: "text/plain"});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `visual-encoded-key-${rndChars}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const link = document.createElement("a");
  link.download = `visual-encoded-${rndChars}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function loadImage(event) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(event.target.files[0]);
  setMode();
  inputKeyValue.removeAttribute("readonly");
}
