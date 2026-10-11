// Interactive 3D ship viewer (three.js + Draco-compressed glTF holo models from FleetYards).
// Loaded on demand so pages stay light until someone asks for 3D.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/';

function holoMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        vY = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uTime;
      varying vec3 vNormal; varying vec3 vView; varying float vY;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNormal), vView)), 2.2);
        float scan = 0.55 + 0.45 * sin(vY * 3.0 - uTime * 2.4);
        float a = clamp(0.08 + fres * 0.95, 0.0, 1.0) * (0.75 + 0.25 * scan);
        gl_FragColor = vec4(uColor * (0.35 + fres * 1.4), a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
}

export function mountViewer(host, { url, length = 20, accent = '#f0a33a', paint = null, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x1a1208, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1, 1.4, 0.8); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(accent), 1.2); rim.position.set(-1.2, 0.4, -1); scene.add(rim);

  // 10 m deck grid for scale.
  const gridSize = Math.max(20, Math.ceil(length * 1.6 / 10) * 10);
  const grid = new THREE.GridHelper(gridSize, gridSize / 10, new THREE.Color(accent), 0x3a4a56);
  grid.material.transparent = true; grid.material.opacity = 0.35;
  scene.add(grid);

  let model = null, originals = new Map(), painted = new Map(), mode = paint ? 'paint' : 'real', disposed = false;
  const holo = holoMaterial(accent);

  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const ready = new Promise((resolve, reject) => {
    loader.load(url, gltf => {
      if (disposed) return;
      model = gltf.scene;
      // Normalise to the ship's real length so the grid reads in metres.
      const box = new THREE.Box3().setFromObject(model);
      const sizeV = box.getSize(new THREE.Vector3());
      const scale = length / Math.max(sizeV.x, sizeV.y, sizeV.z);
      model.scale.setScalar(scale);
      const box2 = new THREE.Box3().setFromObject(model);
      const center = box2.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y += (box2.max.y - box2.min.y) / 2;
      model.traverse(o => {
        if (!o.isMesh) return;
        originals.set(o, o.material);
        const glass = /glass|canopy|window/i.test(o.material?.name || '') || (o.material?.opacity ?? 1) < 1;
        if (glass || !paint) { painted.set(o, o.material); return; }
        const m = o.material.clone();
        m.color = new THREE.Color(paint);
        m.metalness = 0.55; m.roughness = 0.42;
        painted.set(o, m);
      });
      scene.add(model);
      setMode(mode);
      const r = length * 0.9;
      camera.position.set(r * 1.1, r * 0.55, r * 1.25);
      controls.target.set(0, (box2.max.y - box2.min.y) / 3, 0);
      controls.minDistance = length * 0.15;
      controls.maxDistance = length * 6;
      resolve();
    }, e => onProgress?.(e.total ? e.loaded / e.total : null, e.loaded), err => reject(err));
  });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!host.isConnected) { dispose(); return; }
    holo.uniforms.uTime.value = clock.getElapsedTime();
    controls.update();
    renderer.render(scene, camera);
  });

  function setMode(m) {
    mode = m;
    if (!model) return;
    model.traverse(o => { if (o.isMesh) o.material = m === 'holo' ? holo : m === 'paint' ? painted.get(o) : originals.get(o); });
    grid.material.opacity = m === 'holo' ? 0.5 : 0.35;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    ro.disconnect(); controls.dispose(); draco.dispose(); pmrem.dispose();
    scene.traverse(o => { o.geometry?.dispose?.(); });
    renderer.dispose();
    renderer.domElement.remove();
  }
  return {
    ready, setMode, dispose,
    get mode() { return mode; },
    setAutoRotate: v => { controls.autoRotate = v; },
    reset: () => { const r = length * 0.9; camera.position.set(r * 1.1, r * 0.55, r * 1.25); },
  };
}

// ---------------------------------------------------------------- whole-fleet 3D hangar
// items: [{ url, length, beam, color, name, id }]. Models load one after another so the
// first ships appear quickly; each is scaled to its real length and parked on a deck.
export function mountFleet(host, items, { accent = '#f0a33a', onProgress, onPick } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);
  const labels = document.createElement('div');
  labels.className = 'h3d-labels';
  host.append(labels);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x1a1208, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(1, 1.6, 0.6); scene.add(key);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 50000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Layout: biggest first, side by side along X with a gap proportional to size.
  const sorted = items.slice().sort((a, b) => b.length - a.length);
  let x = 0;
  for (const it of sorted) { const w = Math.max(it.beam || it.length * 0.6, 4); it.x = x + w / 2; x += w + Math.max(6, w * 0.35); }
  const span = Math.max(20, x);
  const deck = new THREE.GridHelper(Math.ceil(span * 1.4 / 10) * 10 + 40, Math.ceil(span * 1.4 / 10) + 4, new THREE.Color(accent), 0x34444f);
  deck.material.transparent = true; deck.material.opacity = 0.3;
  deck.position.x = span / 2;
  scene.add(deck);
  const maxL = sorted[0]?.length || 20;
  camera.position.set(span / 2 + span * 0.15, maxL * 0.9 + span * 0.25, span * 0.75 + maxL);
  controls.target.set(span / 2, maxL * 0.15, 0);
  controls.maxDistance = span * 4 + 400;

  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const holo = holoMaterial(accent);
  const placed = [];
  let mode = 'paint', disposed = false;

  const labelFor = it => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'h3d-label'; el.textContent = it.name;
    el.addEventListener('click', () => { focus(it); onPick?.(it); });
    labels.append(el);
    return el;
  };
  function focus(it) {
    const tgt = new THREE.Vector3(it.x, it.length * 0.15, 0);
    const from = controls.target.clone(), camFrom = camera.position.clone();
    const camTo = new THREE.Vector3(it.x + it.length * 0.9, it.length * 0.6, it.length * 1.3);
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      controls.target.lerpVectors(from, tgt, e); camera.position.lerpVectors(camFrom, camTo, e);
      if (k < 1 && !disposed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let bytes = 0;
  const ready = (async () => {
    for (const [i, it] of sorted.entries()) {
      if (disposed) return;
      onProgress?.(i, sorted.length, bytes);
      try {
        const gltf = await new Promise((res, rej) => loader.load(it.url, res, e => { if (e.total) onProgress?.(i + e.loaded / e.total, sorted.length, bytes + e.loaded); }, rej));
        if (disposed) return;
        const m = gltf.scene;
        const box = new THREE.Box3().setFromObject(m);
        const sz = box.getSize(new THREE.Vector3());
        m.scale.setScalar(it.length / Math.max(sz.x, sz.y, sz.z));
        // Turn the ship so its length runs along Z (nose toward the camera).
        const b2 = new THREE.Box3().setFromObject(m), s2 = b2.getSize(new THREE.Vector3());
        if (s2.x > s2.z) m.rotation.y = Math.PI / 2;
        const b3 = new THREE.Box3().setFromObject(m);
        const c3 = b3.getCenter(new THREE.Vector3());
        m.position.set(it.x - c3.x, -b3.min.y, -c3.z);
        const paint = new Map(), orig = new Map();
        m.traverse(o => {
          if (!o.isMesh) return;
          orig.set(o, o.material);
          const glass = /glass|canopy|window/i.test(o.material?.name || '') || (o.material?.opacity ?? 1) < 1;
          if (glass || !it.color) { paint.set(o, o.material); return; }
          const mm = o.material.clone(); mm.color = new THREE.Color(it.color); mm.metalness = 0.55; mm.roughness = 0.42; paint.set(o, mm);
        });
        const entry = { it, m, paint, orig, label: labelFor(it), top: b3.max.y - b3.min.y };
        placed.push(entry);
        applyMode(entry);
        scene.add(m);
        bytes += it.size || 0;
      } catch { /* skip ships whose model fails to load */ }
    }
    onProgress?.(sorted.length, sorted.length, bytes);
  })();

  function applyMode(e) { e.m.traverse(o => { if (o.isMesh) o.material = mode === 'holo' ? holo : e.paint.get(o); }); }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  const clock = new THREE.Clock();
  const v = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (!host.isConnected) { dispose(); return; }
    holo.uniforms.uTime.value = clock.getElapsedTime();
    controls.update();
    renderer.render(scene, camera);
    const w = host.clientWidth, h = host.clientHeight;
    for (const e of placed) {
      v.set(e.it.x, e.top + 2, 0).project(camera);
      const vis = v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
      e.label.style.display = vis ? '' : 'none';
      if (vis) e.label.style.transform = `translate(-50%, -100%) translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px)`;
    }
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    ro.disconnect(); controls.dispose(); draco.dispose(); pmrem.dispose();
    scene.traverse(o => o.geometry?.dispose?.());
    renderer.dispose(); renderer.domElement.remove(); labels.remove();
  }
  return {
    ready, dispose,
    setMode(m) { mode = m; placed.forEach(applyMode); },
    reset() { controls.target.set(span / 2, maxL * 0.15, 0); camera.position.set(span / 2 + span * 0.15, maxL * 0.9 + span * 0.25, span * 0.75 + maxL); },
  };
}
