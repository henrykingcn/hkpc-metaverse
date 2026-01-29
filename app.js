// app.js (FULL) — Browser ES Modules + importmap/CDN friendly
// ✅ Loads coreData/rawData from data.json via fetch (NO JSON import)
// ✅ No <script src="./data.json"> in HTML
// ✅ Start via main() only

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ================= Data Loader =================
async function loadData() {
  const res = await fetch('./data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load data.json: ${res.status}`);
  return await res.json();
}

// ================= UI: header / settings =================
let headerTimeout;
const headerContainer = document.getElementById('header-container');

window.toggleSettings = function () {
  const menu = document.getElementById('settings-menu');
  menu?.classList.toggle('active');
};

window.startHeaderTimer = function () {
  clearTimeout(headerTimeout);
  headerTimeout = setTimeout(() => {
    headerContainer?.classList.add('minimized');
  }, 5000);
};

window.toggleHeader = function () {
  if (!headerContainer) return;
  if (headerContainer.classList.contains('minimized')) {
    headerContainer.classList.remove('minimized');
    startHeaderTimer();
  } else {
    startHeaderTimer();
  }
};

startHeaderTimer();

// ================= Config =================
const TOTAL_NODES = 90;
const GLOBE_RADIUS = 16;
const SHOW_DISTANCE_THRESHOLD = 25;
const UI_SCALE = 0.6;
const UI_SELECTED_SCALE = 1.5;
const scaleFactor = 0.012;

// ================= Scene init =================
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 20, 50);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.3;
container?.appendChild(renderer.domElement);

// ================= Postprocessing =================
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.2;
bloomPass.radius = 0.6;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ================= OrbitControls =================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.0000000000000001;
controls.minDistance = 10;
controls.maxDistance = 100;

// ================= Starfield =================
function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 3500;
  const posArray = new Float32Array(starsCount * 3);
  const colorArray = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount * 3; i += 3) {
    const r = 80 + Math.random() * 200;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);

    posArray[i] = r * Math.sin(phi) * Math.cos(theta);
    posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    posArray[i + 2] = r * Math.cos(phi);

    const starType = Math.random();
    if (starType > 0.95) {
      colorArray[i] = 1; colorArray[i + 1] = 1; colorArray[i + 2] = 1;
    } else if (starType > 0.7) {
      colorArray[i] = 0.4; colorArray[i + 1] = 0.8; colorArray[i + 2] = 1;
    } else {
      colorArray[i] = 0.6; colorArray[i + 1] = 0.6; colorArray[i + 2] = 0.8;
    }
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  const starsMaterial = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(starsGeometry, starsMaterial));
}
createStarfield();

// ================= Glow =================
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 200, 100, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 140, 0, 0.6)');
  gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function addCoreGlow() {
  const spriteMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffaa00,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.8,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(18, 18, 1);
  sprite.renderOrder = -1;
  return sprite;
}

// ================= Canvas rounded rect =================
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ================= Info card generator =================
function createInfoCardData(data, isCore = false, mode = 'simple') {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  const nameFont = 'bold 40px Arial';
  const roleFont = 'bold 24px Arial';
  const jobFont = 'italic 20px Arial';
  const descFont = '22px Arial';

  const padding = 20;
  const hasAvatar = !isCore;
  const avatarSize = hasAvatar ? 100 : 0;
  const avatarMargin = hasAvatar ? 30 : 0;
  const textLeftStart = 10 + padding + avatarSize + avatarMargin;

  tempCtx.font = nameFont;
  const nameWidth = tempCtx.measureText((data.name || '').toUpperCase()).width;

  tempCtx.font = roleFont;
  const roleWidth = tempCtx.measureText((data.role || '') + (isCore ? '' : ' UNIT')).width;

  const minContentWidth = 250;
  const maxContentWidth = 450;

  let jobWidth = 0;
  let jobLines = [];
  let jobHeight = 0;

  if (!isCore && mode === 'full' && data.jobDesc) {
    tempCtx.font = jobFont;
    const jobWords = data.jobDesc.split(' ');
    let line = '';
    for (let n = 0; n < jobWords.length; n++) {
      const testLine = line + jobWords[n] + ' ';
      const metrics = tempCtx.measureText(testLine);
      if (metrics.width > maxContentWidth && n > 0) {
        jobLines.push(line);
        line = jobWords[n] + ' ';
      } else {
        line = testLine;
      }
    }
    jobLines.push(line);
    const maxJobLineWidth = jobLines.reduce((max, l) => Math.max(max, tempCtx.measureText(l).width), 0);
    jobWidth = Math.min(maxJobLineWidth, maxContentWidth);
    jobHeight = jobLines.length * 25;
  }

  const reflectionText = data.reflection || '';
  tempCtx.font = descFont;
  const rawDescWidth = tempCtx.measureText(reflectionText).width;

  let textBlockWidth = Math.max(nameWidth, roleWidth, jobWidth, Math.min(rawDescWidth, maxContentWidth));
  textBlockWidth = Math.max(textBlockWidth, minContentWidth);

  const canvasWidth = Math.ceil(textLeftStart + textBlockWidth + padding);

  const contentAvailableWidth = textBlockWidth;
  const words = reflectionText.split(' ');
  let line = '';
  let lineCount = 1;

  tempCtx.font = descFont;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = tempCtx.measureText(testLine);
    if (metrics.width > contentAvailableWidth && n > 0) {
      line = words[n] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }

  let currentY = 135;
  if (!isCore && mode === 'full' && data.jobDesc) currentY += jobHeight + 10;
  currentY += 10;

  const requiredHeight = currentY + (lineCount * 30) + padding;
  const defaultHeight = 256;
  const canvasHeight = Math.max(defaultHeight, requiredHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mainColor = isCore ? '#FFD700' : '#00f3ff';
  const bgColor = isCore ? 'rgba(20, 15, 5, 0.95)' : 'rgba(2, 8, 15, 0.95)';

  ctx.fillStyle = bgColor;
  roundRectPath(ctx, 10, 10, canvasWidth - 20, canvasHeight - 20, 20);
  ctx.fill();

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  if (hasAvatar) {
    const avatarX = 80;
    const avatarY = 128;
    const avatarRadius = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.clip();

    if (data.avatar && data.avatar !== '') {
      const img = new Image();
      img.src = data.avatar;
      img.onload = () => {
        ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        texture.needsUpdate = true;
      };
    } else {
      ctx.fillStyle = '#003344';
      ctx.fillRect(avatarX - 50, avatarY - 50, 100, 100);
      ctx.fillStyle = mainColor;
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IMG', avatarX, avatarY);
    }
    ctx.restore();
  }

  const textX = textLeftStart;

  ctx.font = nameFont;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText((data.name || '').toUpperCase(), textX, 70);

  ctx.fillStyle = mainColor;
  ctx.fillRect(textX, 90, contentAvailableWidth, 2);
  ctx.font = roleFont;
  ctx.fillText((data.role || '') + (isCore ? '' : ' UNIT'), textX, 125);

  let drawY = 165;

  if (!isCore && mode === 'full' && data.jobDesc) {
    ctx.font = jobFont;
    ctx.fillStyle = '#00f3ff';
    for (let i = 0; i < jobLines.length; i++) {
      ctx.fillText(jobLines[i], textX, 155 + (i * 25));
    }
    drawY = 155 + (jobLines.length * 25) + 15;
  } else if (!isCore) {
    drawY = 165;
  }

  ctx.font = descFont;
  ctx.fillStyle = '#cccccc';
  line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > contentAvailableWidth && n > 0) {
      ctx.fillText(line, textX, drawY);
      line = words[n] + ' ';
      drawY += 30;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, textX, drawY);

  texture.needsUpdate = true;

  return { texture, pixelWidth: canvasWidth, pixelHeight: canvasHeight };
}

// ================= Logo texture (fallback) =================
function createCyberLogoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 10, 30, 0.7)';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
  for (let i = 0; i < 256; i += 4) ctx.fillRect(0, i, 512, 1);

  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowBlur = 20; ctx.shadowColor = '#00f3ff';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HKPC', 256, 100);

  ctx.font = 'bold 40px Arial';
  ctx.shadowBlur = 10; ctx.fillStyle = '#00f3ff';
  ctx.fillText('InnoTalent', 256, 180);

  ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 236);

  return new THREE.CanvasTexture(canvas);
}

// ================= Globals =================
let coreData = null;
let rawData = null;
let nodesData = [];

let coreGroup, coreMesh, innerCore, coreGlowSprite;
let logoGroup, ring1, ring2;

let coreUIGroup, coreCardMesh, coreLine;
let coreInteractable = null;

let nodesGroup, uiRootGroup;
let allNodes = [];
let interactableObjects = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;

// ================= Interaction =================
window.addEventListener('pointerdown', onPointerDown);

function onPointerDown(event) {
  if (event.button !== 0) return;
  if (event.target?.closest?.('#header-container')) return;
  if (event.target?.closest?.('#settings-menu')) return;
  if (event.target?.closest?.('#settings-btn')) return;

  if (!interactableObjects || interactableObjects.length === 0) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactableObjects);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    let target = null;

    if (object === innerCore || object === coreMesh) {
      target = coreInteractable;
    } else {
      target = allNodes.find(n => n.mesh === object);
    }

    if (target) handleSelection(target);
  } else {
    resetSelection();
  }
}

function handleSelection(target) {
  if (!target) return;
  if (selectedNode === target) return;

  if (selectedNode && selectedNode.type === 'node') {
    updateNodeVisuals(selectedNode, false);
  }

  selectedNode = target;
  controls.autoRotate = false;

  const targetPos = new THREE.Vector3();
  if (target.type === 'core') {
    targetPos.set(0, 0, 0);
    target.uiGroup.scale.setScalar(1.5);
  } else {
    target.mesh.getWorldPosition(targetPos);
    allNodes.forEach(n => {
      const isSel = (n === target);
      n.isSelected = isSel;
      updateNodeVisuals(n, isSel);
    });
  }

  const cameraRight = new THREE.Vector3(1, 0, 0);
  cameraRight.applyQuaternion(camera.quaternion);

  let uiWidthWorld = 0;
  if (target.type === 'node') uiWidthWorld = target.fullState.w;
  else uiWidthWorld = 6;

  const visualCenterOffset = 3.5 + (uiWidthWorld / 2);
  const offset = cameraRight.multiplyScalar(visualCenterOffset);

  window.cameraFocusTarget = targetPos.clone().add(offset);
  window.isFocusing = true;
}

function resetSelection() {
  if (selectedNode && selectedNode.type === 'node') {
    updateNodeVisuals(selectedNode, false);
  }

  selectedNode = null;
  window.isFocusing = false;
  controls.autoRotate = true;

  allNodes.forEach(n => {
    n.isSelected = false;
    updateNodeVisuals(n, false);
  });

  if (coreInteractable?.uiGroup) coreInteractable.uiGroup.scale.setScalar(1);
  window.cameraFocusTarget = new THREE.Vector3(0, 0, 0);
}

function updateNodeVisuals(node, isSelected) {
  const targetState = isSelected ? node.fullState : node.simpleState;
  if (node.cardMat.map !== targetState.tex) {
    node.cardMat.map = targetState.tex;
    node.cardMesh.scale.set(targetState.w, targetState.h, 1);
    node.cardMesh.position.set(3.5 + targetState.w / 2, 0, 0);
  }
}

// ================= Hand overlay setup =================
const overlay = document.getElementById('hand-overlay');
const octx = overlay?.getContext('2d');

function resizeOverlay() {
  if (!overlay || !octx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = Math.floor(window.innerWidth * dpr);
  overlay.height = Math.floor(window.innerHeight * dpr);
  overlay.style.width = window.innerWidth + 'px';
  overlay.style.height = window.innerHeight + 'px';
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeOverlay();

// Gesture toggle listener (needs overlay/octx + handEnabled)
let handEnabled = true;
const gestureToggle = document.getElementById('gesture-toggle');
gestureToggle?.addEventListener('change', (e) => {
  handEnabled = e.target.checked;
  const overlayEl = document.getElementById('hand-overlay');
  if (overlayEl) overlayEl.style.opacity = handEnabled ? '1' : '0';
  if (!handEnabled && octx) {
    octx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
});

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function landmarkToScreen(lm) {
  return { x: (1 - lm.x) * window.innerWidth, y: lm.y * window.innerHeight };
}

function drawOneHand(landmarks, opts) {
  if (!octx) return;
  if (!landmarks) return;

  const { stroke = 'rgba(0,243,255,0.9)', label = '', labelY = 0 } = opts || {};
  const pts = landmarks.map(lm => landmarkToScreen(lm));

  octx.lineWidth = 2;
  octx.globalAlpha = 0.85;
  octx.strokeStyle = stroke;

  octx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    octx.moveTo(pts[a].x, pts[a].y);
    octx.lineTo(pts[b].x, pts[b].y);
  }
  octx.stroke();

  octx.globalAlpha = 1;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = (i === 4 || i === 8) ? 6 : 4;
    octx.fillStyle = (i === 8) ? 'rgba(255,255,255,0.95)' : stroke.replace('0.9', '0.95');
    octx.beginPath();
    octx.arc(p.x, p.y, r, 0, Math.PI * 2);
    octx.fill();
  }

  if (label) {
    octx.font = '14px Arial';
    octx.fillStyle = stroke;
    octx.fillText(label, 12, labelY);
  }
}

function drawHandsOverlay({ rightLm, leftLm, rightLabel, leftLabel }) {
  if (!octx) return;
  octx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawOneHand(rightLm, {
    stroke: 'rgba(255,170,0,0.95)',
    label: rightLabel || '',
    labelY: window.innerHeight - 34
  });

  drawOneHand(leftLm, {
    stroke: 'rgba(0,243,255,0.9)',
    label: leftLabel || '',
    labelY: window.innerHeight - 16
  });
}

const videoEl = document.getElementById('hand-video');
const SMOOTHING = 0.35;
const PINCH_START = 0.20;
const PINCH_END = 0.20;
const FIST_START = 0.52;
const FIST_END = 0.62;
const ROTATE_SENS = 0.0045;
const ZOOM_SENS = 0.08;
const MOVE_DEADBAND = 0.8;

let smX = window.innerWidth * 0.5;
let smY = window.innerHeight * 0.5;
let pinchDown = false;
let fistDown = false;
let lastX = null;
let lastY = null;
let leftPinchDown = false;

function pickAtScreen(x, y) {
  const el = document.elementFromPoint(x, y);
  if (el && el.closest && (el.closest('#header-container') || el.closest('#settings-menu') || el.closest('#settings-btn'))) return;

  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactableObjects || []);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    let target = null;
    if (object === innerCore || object === coreMesh) target = coreInteractable;
    else target = allNodes.find(n => n.mesh === object);
    if (target) handleSelection(target);
  } else {
    resetSelection();
  }
}

function fistMeasure(lm) {
  const palm = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5
  };
  const handScale = Math.max(0.0001, dist2D(lm[0], lm[9]));
  const tips = [lm[4], lm[8], lm[12], lm[16], lm[20]];
  const avg = tips.reduce((sum, t) => sum + dist2D(t, palm), 0) / tips.length;
  return avg / handScale;
}

function orbitByPixels(dx, dy) {
  const target = controls.target;
  const offset = new THREE.Vector3().copy(camera.position).sub(target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  sph.theta -= dx * ROTATE_SENS;
  sph.phi -= dy * ROTATE_SENS;
  const EPS = 0.0001;
  sph.phi = Math.max(EPS, Math.min(Math.PI - EPS, sph.phi));
  offset.setFromSpherical(sph);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

function zoomByPixels(dy) {
  const target = controls.target;
  const offset = new THREE.Vector3().copy(camera.position).sub(target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  sph.radius += dy * ZOOM_SENS;
  sph.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, sph.radius));
  offset.setFromSpherical(sph);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

function splitHands(results) {
  const rawLms = results.multiHandLandmarks || [];
  const rawHanded = results.multiHandedness || [];
  const lms = rawLms.filter(arr => Array.isArray(arr) && arr.length >= 21 && arr[8] && arr[4] && arr[0]);

  let rightLm = null, leftLm = null;
  for (let i = 0; i < lms.length; i++) {
    const label = rawHanded[i]?.label;
    if (label === 'Right') rightLm = lms[i];
    else if (label === 'Left') leftLm = lms[i];
  }
  if (!rightLm && lms[0]) rightLm = lms[0];
  if (!leftLm && lms[1]) leftLm = lms[1];
  return { rightLm, leftLm, count: lms.length };
}

async function initHandTracking() {
  if (!window.Hands || !window.Camera) {
    console.warn('MediaPipe not loaded.');
    return;
  }
  if (!videoEl) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
    audio: false
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    if (!handEnabled) return;

    const { rightLm, leftLm, count } = splitHands(results);

    if (!rightLm && !leftLm) {
      drawHandsOverlay({ rightLm: null, leftLm: null, rightLabel: '', leftLabel: '' });
      pinchDown = false; fistDown = false; leftPinchDown = false; lastX = lastY = null;
      return;
    }

    const twoHands = (rightLm && leftLm) || (count >= 2);
    const driverLm = twoHands ? (leftLm || rightLm) : (rightLm || leftLm);
    const driverIsRight = twoHands ? false : !!rightLm;

    if (!driverLm || !driverLm[8] || !driverLm[8].x || !driverLm[8].y) {
      drawHandsOverlay({ rightLm: null, leftLm: null, rightLabel: '', leftLabel: '' });
      pinchDown = false; fistDown = false; leftPinchDown = false; lastX = lastY = null;
      return;
    }

    const idx = landmarkToScreen(driverLm[8]);
    smX = smX + (idx.x - smX) * SMOOTHING;
    smY = smY + (idx.y - smY) * SMOOTHING;

    const driverScale = Math.max(0.0001, dist2D(driverLm[0], driverLm[9]));
    const driverPinch = dist2D(driverLm[4], driverLm[8]) / driverScale;
    const driverFist = fistMeasure(driverLm);

    if (!fistDown && driverFist < FIST_START) {
      fistDown = true; pinchDown = false; lastX = smX; lastY = smY; controls.autoRotate = false;
    } else if (fistDown && driverFist > FIST_END) {
      fistDown = false; lastX = lastY = null;
    }

    if (fistDown) {
      if (lastY != null) {
        const dy = smY - lastY; lastY = smY;
        if (Math.abs(dy) > MOVE_DEADBAND) zoomByPixels(dy);
      }
      drawHandsOverlay({
        rightLm, leftLm,
        rightLabel: twoHands ? 'RIGHT: ZOOM (FIST)' : (driverIsRight ? 'ZOOM (FIST)' : 'ZOOM (FIST)'),
        leftLabel: twoHands ? 'LEFT: (PINCH = CLICK)' : ''
      });
      return;
    }

    if (!pinchDown && driverPinch < PINCH_START) {
      pinchDown = true; lastX = smX; lastY = smY;
      pickAtScreen(smX, smY);
      controls.autoRotate = false;
    } else if (pinchDown && driverPinch > PINCH_END) {
      pinchDown = false; lastX = lastY = null;
    }

    if (pinchDown && lastX != null && lastY != null) {
      const dx = smX - lastX; const dy = smY - lastY; lastX = smX; lastY = smY;
      if (Math.abs(dx) > MOVE_DEADBAND || Math.abs(dy) > MOVE_DEADBAND) orbitByPixels(dx, dy);
    }

    if (twoHands && rightLm) {
      const rightScale = Math.max(0.0001, dist2D(rightLm[0], rightLm[9]));
      const rightPinch = dist2D(rightLm[4], rightLm[8]) / rightScale;
      if (!leftPinchDown && rightPinch < PINCH_START) {
        leftPinchDown = true; pickAtScreen(smX, smY);
      } else if (leftPinchDown && rightPinch > PINCH_END) {
        leftPinchDown = false;
      }
    } else {
      leftPinchDown = false;
    }

    drawHandsOverlay({
      rightLm, leftLm,
      rightLabel: twoHands ? (pinchDown ? 'RIGHT: ROTATE (PINCH)' : 'RIGHT: READY') : (pinchDown ? 'ROTATE (PINCH)' : 'READY'),
      leftLabel: twoHands ? (leftPinchDown ? 'LEFT: CLICK (PINCH)' : 'LEFT: READY (PINCH=CLICK)') : ''
    });
  });

  const cam = new window.Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 640, height: 480
  });
  cam.start();
}

// ================= Build core + nodes =================
function buildCore() {
  coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const coreGeo = new THREE.IcosahedronGeometry(3, 1);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreGroup.add(coreMesh);

  innerCore = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4500 })
  );
  coreGroup.add(innerCore);

  coreGlowSprite = addCoreGlow();
  coreGroup.add(coreGlowSprite);

  // Logo boards
  logoGroup = new THREE.Group();
  coreGroup.add(logoGroup);

  const backupLogoTex = createCyberLogoTexture();
  backupLogoTex.minFilter = THREE.LinearFilter;

  const logoMat = new THREE.MeshBasicMaterial({
    map: backupLogoTex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    opacity: 1.0,
    blending: THREE.NormalBlending
  });

  const texLoader = new THREE.TextureLoader();
  const tryLoadImage = (url) => {
    texLoader.load(
      url,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        logoMat.map = tex;
        logoMat.needsUpdate = true;
      },
      undefined,
      () => {
        if (url === 'logo-hkpc.png') {
          console.log('Local image failed, trying network proxy...');
          tryLoadImage('https://wsrv.nl/?url=smereachout.hkpc.org/images/logo-hkpc.png&w=500&output=png');
        } else {
          console.warn('All image loading failed. Keeping fallback canvas.');
        }
      }
    );
  };
  tryLoadImage('logo-hkpc.png');

  function createHoloBoard(angle) {
    const group = new THREE.Group();

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.0), logoMat);
    group.add(mesh);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.1, 1.1, 0), new THREE.Vector3(3.1, 1.1, 0),
      new THREE.Vector3(-3.1, -1.1, 0), new THREE.Vector3(3.1, -1.1, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    const gridHelper = new THREE.GridHelper(4, 4, 0x00f3ff, 0x00f3ff);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.scale.set(1.5, 0.5, 1);
    gridHelper.position.z = -0.1;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    group.add(gridHelper);

    const dist = 7;
    group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    group.lookAt(0, 0, 0);
    group.rotateY(Math.PI);

    return group;
  }

  for (let i = 0; i < 3; i++) {
    logoGroup.add(createHoloBoard(i * (Math.PI * 2 / 3)));
  }

  // Rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.3 });
  const ringGeo = new THREE.TorusGeometry(5, 0.05, 16, 100);
  ring1 = new THREE.Mesh(ringGeo, ringMat); ring1.rotation.x = Math.PI / 2;
  ring2 = new THREE.Mesh(ringGeo, ringMat);
  coreGroup.add(ring1);
  coreGroup.add(ring2);

  // Core UI card
  coreUIGroup = new THREE.Group();
  scene.add(coreUIGroup);

  const coreUIInfo = createInfoCardData(coreData, true, 'simple');
// --- Core UI material + mesh ---
  const coreCardMat = new THREE.MeshBasicMaterial({
    map: coreUIInfo.texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  coreCardMat.depthTest = true;

  const corePlaneWidth = coreUIInfo.pixelWidth * scaleFactor;
  const corePlaneHeight = coreUIInfo.pixelHeight * scaleFactor;

  coreCardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreCardMat);
  coreCardMesh.scale.set(corePlaneWidth, corePlaneHeight, 1);

  const coreHoverY = 6 + (corePlaneHeight / 2);
  coreCardMesh.position.set(0, coreHoverY, 0);

  // core vertical line
  const coreLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 6, 0)
  ]);
  coreLine = new THREE.Line(coreLineGeo, new THREE.LineBasicMaterial({ color: 0xffaa00 }));

  coreUIGroup.add(coreCardMesh);
  coreUIGroup.add(coreLine);

  // --- Core interactable for raycasting ---
  coreInteractable = {
    type: 'core',
    mesh: innerCore,
    uiGroup: coreUIGroup,
    cardMesh: coreCardMesh,
    originalScale: 1
  };
} // ✅ end buildCore()


// ================= Build nodes =================
function buildNodes() {
  nodesGroup = new THREE.Group();
  scene.add(nodesGroup);

  uiRootGroup = new THREE.Group();
  uiRootGroup.renderOrder = 0;
  scene.add(uiRootGroup);

  allNodes = [];
  interactableObjects = [];

  const nodeGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const baseNodeMat = new THREE.MeshBasicMaterial({
    color: 0x00f3ff,
    wireframe: true,
    transparent: true,
    opacity: 1
  });

  const baseLineMat = new THREE.LineBasicMaterial({
    color: 0x004455,
    transparent: true,
    opacity: 0.15
  });

  const phi = Math.PI * (3 - Math.sqrt(5));

  nodesData.forEach((data, index) => {
    const y = 1 - (index / (nodesData.length - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * index;

    const x = Math.cos(theta) * radius * GLOBE_RADIUS;
    const z = Math.sin(theta) * radius * GLOBE_RADIUS;
    const py = y * GLOBE_RADIUS;

    const position = new THREE.Vector3(x, py, z);

    const nodeMesh = new THREE.Mesh(nodeGeo, baseNodeMat.clone());
    nodeMesh.position.copy(position);
    nodeMesh.lookAt(0, 0, 0);
    nodesGroup.add(nodeMesh);

    const linkLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), position]),
      baseLineMat.clone()
    );
    nodesGroup.add(linkLine);

    // UI container per node
    const uiContainer = new THREE.Group();

    const simpleState = createInfoCardData(data, false, 'simple');
    const fullState = createInfoCardData(data, false, 'full');

    const cardMat = new THREE.MeshBasicMaterial({
      map: simpleState.texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const w = simpleState.pixelWidth * scaleFactor;
    const h = simpleState.pixelHeight * scaleFactor;

    const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cardMat);
    cardMesh.scale.set(w, h, 1);
    cardMesh.position.set(3.5 + w / 2, 0, 0);
    uiContainer.add(cardMesh);

    const rodMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0 });
    const rodMesh = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.5, 0, 0)]),
      rodMat
    );
    uiContainer.add(rodMesh);

    uiRootGroup.add(uiContainer);

    const nodeObj = {
      type: 'node',
      mesh: nodeMesh,
      line: linkLine,
      ui: uiContainer,
      cardMesh,
      cardMat,
      rodMat,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      isSelected: false,

      simpleState: { tex: simpleState.texture, w: simpleState.pixelWidth * scaleFactor, h: simpleState.pixelHeight * scaleFactor },
      fullState: { tex: fullState.texture, w: fullState.pixelWidth * scaleFactor, h: fullState.pixelHeight * scaleFactor }
    };

    allNodes.push(nodeObj);
    interactableObjects.push(nodeMesh);
  });

  // allow clicking core too
  interactableObjects.push(innerCore);
  interactableObjects.push(coreMesh);
}


// ================= Animation =================
const clock = new THREE.Clock();
const dummyVec = new THREE.Vector3();

window.cameraFocusTarget = new THREE.Vector3(0, 0, 0);
window.isFocusing = false;

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  if (nodesGroup && (!selectedNode || selectedNode.type === 'core')) {
    nodesGroup.rotation.y += 0.001;
  }

  if (coreGroup) coreGroup.rotation.y -= 0.002;

  if (logoGroup) {
    logoGroup.rotation.y += 0.005;
    logoGroup.position.y = Math.sin(time * 0.5) * 0.2;
  }

  if (ring1) ring1.rotation.z += 0.01;
  if (ring2) ring2.rotation.x -= 0.01;

  if (coreGlowSprite) {
    const pulse = 18 + Math.sin(time * 1.5) * 2;
    coreGlowSprite.scale.set(pulse, pulse, 1);
  }

  if (coreUIGroup) coreUIGroup.quaternion.copy(camera.quaternion);

  if (window.isFocusing) controls.target.lerp(window.cameraFocusTarget, 0.05);
  else controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);

  const cameraPos = camera.position;

  allNodes.forEach(node => {
    node.mesh.rotation.z += node.rotSpeed;
    node.mesh.getWorldPosition(dummyVec);

    const dist = cameraPos.distanceTo(dummyVec);

    let meshAlpha = 1 - (dist - 15) / 50;
    meshAlpha = Math.max(0.1, Math.min(1, meshAlpha));
    node.mesh.material.opacity = meshAlpha;
    node.line.material.opacity = meshAlpha * 0.15;

    node.ui.position.copy(dummyVec);
    node.ui.quaternion.copy(camera.quaternion);

    if (selectedNode) {
      if (node.isSelected) {
        node.ui.scale.lerp(new THREE.Vector3(1.2, 1.2, 1), 0.1);
        node.cardMat.opacity = 1;
        node.rodMat.opacity = 1;
        node.mesh.material.opacity = 1;
        node.mesh.material.color.setHex(0xffffff);
      } else {
        node.ui.scale.lerp(new THREE.Vector3(0.01, 0.01, 1), 0.1);
        node.cardMat.opacity = 0;
        node.rodMat.opacity = 0;
        node.mesh.material.opacity = 0.1;
        node.mesh.material.color.setHex(0x00f3ff);
      }
    } else {
      if (dist < SHOW_DISTANCE_THRESHOLD) {
        const alpha = Math.min((SHOW_DISTANCE_THRESHOLD - dist) / 5, 1);
        node.ui.scale.setScalar(UI_SCALE * alpha + (1 - alpha) * 0.2);
        node.cardMat.opacity = alpha;
        node.rodMat.opacity = alpha * 0.5;
        node.mesh.scale.setScalar(1 + alpha);
        node.mesh.material.opacity = 1;
        node.mesh.material.color.setHex(0xffffff);
      } else {
        node.ui.scale.setScalar(0.01);
        node.cardMat.opacity = 0;
        node.rodMat.opacity = 0;
        node.mesh.scale.setScalar(1);
        node.mesh.material.color.setHex(0x00f3ff);
      }
    }
  });

  controls.update();
  composer.render();
}


// ================= Main boot =================
async function main() {
  try {
    const data = await loadData();
    coreData = data.coreData;
    rawData = data.rawData;

    nodesData = [];
    for (let i = 0; i < TOTAL_NODES; i++) {
      const seed = rawData[i % rawData.length];
      nodesData.push({ id: i, ...seed });
    }

    buildCore();
    buildNodes();

    document.getElementById('loader')?.style && (document.getElementById('loader').style.display = 'none');

    // start hand tracking (optional)
    initHandTracking().catch(console.error);

    animate();
  } catch (e) {
    console.error(e);
    const loader = document.getElementById('loader');
    if (loader) loader.textContent = 'FAILED TO LOAD data.json';
  }
}

main();


// ================= Resize =================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  resizeOverlay();

  smX = window.innerWidth * 0.5;
  smY = window.innerHeight * 0.5;

  
});

// ================= Background Music (UNLOCK) =================
const bgm = document.getElementById('bgm');
const musicVolume = document.getElementById('musicVolume');

function setupBGM() {
  if (!bgm) return;

  // set initial volume from slider
  bgm.volume = parseFloat(musicVolume?.value ?? '0.6');

  // allow autoplay attempt (muted)
  bgm.muted = true;

  // force load (helps some browsers)
  bgm.load();

  // try to start (may fail; that's ok)
  bgm.play().catch(() => {});

  // volume slider live update
  musicVolume?.addEventListener('input', () => {
    bgm.volume = parseFloat(musicVolume.value);
  });

  // unlock on first gesture
  const unlockAudio = async () => {
    try {
      bgm.muted = false;
      await bgm.play();
    } catch (e) {
      console.warn('Audio unlock failed:', e);
    }
  };

  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

// run once
setupBGM();
