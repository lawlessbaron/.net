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

export function mountViewer(host, { url, length = 20, accent = '#f0a33a', onProgress }) {
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

  let model = null, originals = new Map(), mode = 'real', disposed = false;
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
      model.traverse(o => { if (o.isMesh) originals.set(o, o.material); });
      scene.add(model);
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
    model.traverse(o => { if (o.isMesh) o.material = m === 'holo' ? holo : originals.get(o); });
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
