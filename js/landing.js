import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ------------------------------------------------------------------
// GEBAEUDE-KONFIGURATION
// Neues Gebaeude = neuer Eintrag hier. position verschiebt es in der
// Szene, link bestimmt die Zielseite bei Klick. Kein weiterer Code
// muss angefasst werden, um ein Gebaeude hinzuzufuegen.
// ------------------------------------------------------------------
const BUILDINGS = [
  {
    id: "headquarter",
    label: "Headquarter",
    position: [0, 0, 0],
    link: "cockpit.html",
  },
  // { id: "marketing", label: "Marketing", position: [7, 0, -3], link: "marketing.html" },
  // { id: "tiktok", label: "TikTok", position: [-7, 0, -3], link: "tiktok.html" },
];

const COLORS = {
  background: 0x0f0f10,
  floor: 0x1a1a1c,
  buildingBody: 0xf2f2f2,
  buildingAccent: 0xc9a24b, // gold
};

const canvas = document.getElementById("scene");
const labelRoot = document.getElementById("labels");

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.background);
scene.fog = new THREE.Fog(COLORS.background, 18, 40);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(9, 7, 9);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
labelRoot.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // nicht unter den Boden schauen
controls.target.set(0, 1.5, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff2d8, 1);
keyLight.position.set(8, 12, 6);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 48),
  new THREE.MeshStandardMaterial({ color: COLORS.floor, flatShading: true })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ------------------------------------------------------------------
// Erzeugt ein einzelnes, klickbares Gebaeude aus der Konfiguration
// ------------------------------------------------------------------
const buildingMeshes = [];

function createBuilding(config) {
  const group = new THREE.Group();
  group.position.set(...config.position);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.6, 2.4),
    new THREE.MeshStandardMaterial({ color: COLORS.buildingBody, flatShading: true })
  );
  body.position.y = 1.8;
  group.add(body);

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.25, 2.6),
    new THREE.MeshStandardMaterial({
      color: COLORS.buildingAccent,
      flatShading: true,
      metalness: 0.4,
      roughness: 0.35,
    })
  );
  cap.position.y = 3.725;
  group.add(cap);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 0.15, 24),
    new THREE.MeshStandardMaterial({
      color: COLORS.buildingAccent,
      flatShading: true,
      metalness: 0.4,
      roughness: 0.35,
    })
  );
  base.position.y = 0.075;
  group.add(base);

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.link = config.link;
      buildingMeshes.push(obj);
    }
  });

  const labelDiv = document.createElement("div");
  labelDiv.className = "building-label";
  labelDiv.textContent = config.label;
  labelDiv.style.pointerEvents = "auto";
  labelDiv.addEventListener("click", () => {
    window.location.href = config.link;
  });
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 4.4, 0);
  group.add(label);

  scene.add(group);
  return group;
}

BUILDINGS.forEach(createBuilding);

// ------------------------------------------------------------------
// Klick-Erkennung: unterscheidet zwischen "Klick" und "Kamera-Drag"
// anhand der Mausbewegung zwischen pointerdown und pointerup
// ------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = null;

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function hitTest(event) {
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(buildingMeshes, false);
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDownPos) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const moved = Math.sqrt(dx * dx + dy * dy);
  pointerDownPos = null;
  if (moved > 6) return; // war Kamera-Drag, kein Klick

  const hits = hitTest(e);
  if (hits.length > 0) {
    window.location.href = hits[0].object.userData.link;
  }
});

renderer.domElement.addEventListener("pointermove", (e) => {
  const hits = hitTest(e);
  renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "grab";
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
