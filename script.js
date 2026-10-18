import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import { lenis, introStarted } from "./common.js";

const CONFIG = {
  cameraZ: 10,
  mobileCameraZ: 13,
  looseLeaves: 34,
  mobileLooseLeaves: 18,
  goldLeafRatio: 0.3,
  floatAmplitude: 0.18,
  scrollRotationMultiplier: 0.002,
  rotationDecay: 0.92,
  scrollRise: 2.5,
  parallaxStrength: 0.12,
};

const COLORS = {
  leaf: "#6f8f55",
  leafUnderside: "#b7c2a4",
  gold: "#c9a96e",
  oliveGreen: "#5f7a2e",
  oliveBlack: "#2b1f2a",
};

const heroSection = document.querySelector(".hero");
let isMobile = window.innerWidth < 1000;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  heroSection.clientWidth / heroSection.clientHeight,
  0.1,
  100,
);
camera.position.z = isMobile ? CONFIG.mobileCameraZ : CONFIG.cameraZ;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
heroSection.appendChild(renderer.domElement);

// Soft studio reflections so the gold reads as metal
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.HemisphereLight("#fff6e0", "#16291f", 0.6));
const sun = new THREE.DirectionalLight("#fff1d6", 1.6);
sun.position.set(4, 6, 6);
scene.add(sun);

const materials = {
  leafTop: new THREE.MeshStandardMaterial({
    color: COLORS.leaf,
    roughness: 0.55,
    side: THREE.FrontSide,
  }),
  leafBottom: new THREE.MeshStandardMaterial({
    color: COLORS.leafUnderside,
    roughness: 0.75,
    side: THREE.BackSide,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    metalness: 1,
    roughness: 0.28,
    side: THREE.DoubleSide,
  }),
  oliveGreen: new THREE.MeshPhysicalMaterial({
    color: COLORS.oliveGreen,
    roughness: 0.3,
    clearcoat: 0.8,
  }),
  oliveBlack: new THREE.MeshPhysicalMaterial({
    color: COLORS.oliveBlack,
    roughness: 0.25,
    clearcoat: 1,
  }),
};

// Olive leaf: long and narrow, tapered at both ends, folded along the
// midrib and slightly curved. Base at the origin, pointing up +Y.
function createLeafGeometry(length, width) {
  const geometry = new THREE.PlaneGeometry(1, 1, 6, 24);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i);
    const v = position.getY(i) + 0.5;
    const half = width * Math.pow(Math.sin(Math.PI * v), 0.75) * (1 - 0.2 * v);
    const x = u * 2 * half;
    const z = Math.abs(x) * 0.5 + Math.sin(v * Math.PI) * 0.08 - v * v * 0.2;
    position.setXYZ(i, x, v * length, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const leafGeometries = [
  createLeafGeometry(1.5, 0.17),
  createLeafGeometry(1.25, 0.15),
  createLeafGeometry(1.7, 0.19),
];
const oliveGeometry = new THREE.SphereGeometry(0.2, 24, 16).scale(1, 1.3, 1);

function createLeaf(gold = false) {
  const geometry =
    leafGeometries[Math.floor(Math.random() * leafGeometries.length)];
  if (gold) return new THREE.Mesh(geometry, materials.gold);
  const leaf = new THREE.Group();
  leaf.add(new THREE.Mesh(geometry, materials.leafTop));
  leaf.add(new THREE.Mesh(geometry, materials.leafBottom));
  return leaf;
}

const UP = new THREE.Vector3(0, 1, 0);

// A gold twig with alternating leaves and a few hanging olives
function createBranch({ length = 4, leaves = 12, olives = 3, goldLeaves = 2 }) {
  const branch = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length * 0.33, 0.25, 0.1),
    new THREE.Vector3(length * 0.66, 0.1, -0.1),
    new THREE.Vector3(length, 0.35, 0),
  ]);
  branch.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.03, 8), materials.gold),
  );

  for (let i = 0; i < leaves; i++) {
    const t = 0.1 + (i / leaves) * 0.88;
    const side = i % 2 === 0 ? 1 : -1;
    const direction = curve
      .getTangent(t)
      .applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        side * (0.7 + Math.random() * 0.3),
      )
      .normalize();
    const leaf = createLeaf(i < goldLeaves);
    leaf.position.copy(curve.getPoint(t));
    leaf.quaternion.setFromUnitVectors(UP, direction);
    leaf.rotateY((Math.random() - 0.5) * 1.6);
    leaf.scale.setScalar(0.75 + (1 - t) * 0.35);
    branch.add(leaf);
  }

  for (let i = 0; i < olives; i++) {
    const t = 0.3 + (i / olives) * 0.6;
    const olive = new THREE.Mesh(
      oliveGeometry,
      i % 2 === 0 ? materials.oliveGreen : materials.oliveBlack,
    );
    olive.position
      .copy(curve.getPoint(t))
      .add(new THREE.Vector3(0, -0.32, 0.15));
    olive.rotation.z = (Math.random() - 0.5) * 0.6;
    branch.add(olive);
  }

  return branch;
}

const world = new THREE.Group();
scene.add(world);

// Everything that floats: { object, base position, phase, speed, depth }
const floaters = [];

function addFloater(object, x, y, z) {
  object.position.set(x, y, z);
  world.add(object);
  floaters.push({
    object,
    base: new THREE.Vector3(x, y, z),
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.5,
    spin: (Math.random() - 0.5) * 0.25,
  });
}

// Laid out for the hero's tall frame (visible area is roughly ±4.4 x ±4.1)
const branchLayout = [
  { x: 0.8, y: 2.6, z: 0, rz: -0.3, s: 1 },
  { x: 4.6, y: -0.5, z: -1, rz: -0.35, s: 1, ry: Math.PI },
  { x: -4.8, y: -3.4, z: -1.5, rz: 0.35, s: 1.1 },
  { x: 0.8, y: -3.6, z: 0.5, rz: -0.15, s: 0.9 },
];

branchLayout.forEach(({ x, y, z, rz, s, ry = 0 }, i) => {
  const branch = createBranch({
    length: 4,
    leaves: 12 + (i % 2) * 2,
    olives: 2 + (i % 2),
  });
  branch.rotation.set(0, ry, rz);
  branch.scale.setScalar(s);
  addFloater(branch, x, y, z);
});

const looseCount = isMobile ? CONFIG.mobileLooseLeaves : CONFIG.looseLeaves;
for (let i = 0; i < looseCount; i++) {
  const leaf = createLeaf(Math.random() < CONFIG.goldLeafRatio);
  leaf.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
  leaf.scale.setScalar(0.5 + Math.random() * 0.5);
  addFloater(
    leaf,
    (Math.random() - 0.5) * 11,
    (Math.random() - 0.5) * 9,
    -5 + Math.random() * 6,
  );
}

// Leaves grow in when the page intro starts
const worldScale = () => (isMobile ? 0.6 : 1);
world.scale.setScalar(0.001);
introStarted.then(() => {
  const s = worldScale();
  gsap.to(world.scale, { x: s, y: s, z: s, duration: 2, ease: "power3.out" });
  floaters.forEach(({ object }, i) => {
    gsap.from(object.rotation, {
      z: object.rotation.z + 1.2,
      duration: 2.2,
      delay: i * 0.01,
      ease: "power3.out",
    });
  });
});

let scrollY = 0;
let spinVelocity = 0;

lenis.on("scroll", (e) => {
  scrollY = e.scroll;
  spinVelocity = e.velocity * CONFIG.scrollRotationMultiplier;
});

let mouseX = 0,
  mouseY = 0,
  smoothX = 0,
  smoothY = 0;

window.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const progress = Math.min(scrollY / heroSection.clientHeight, 1);

  floaters.forEach(({ object, base, phase, speed, spin }) => {
    // Closer objects rise faster on scroll, for depth
    const depth = (base.z + 6) / 8;
    object.position.y =
      base.y +
      Math.sin(time * speed + phase) * CONFIG.floatAmplitude +
      progress * CONFIG.scrollRise * depth;
    object.position.x = base.x + Math.cos(time * speed * 0.7 + phase) * 0.08;
    object.rotation.x += spin * 0.004;
    object.rotation.y += spin * 0.006 + spinVelocity * 0.5;
  });
  spinVelocity *= CONFIG.rotationDecay;

  if (!isMobile) {
    smoothX += (mouseX - smoothX) * 0.03;
    smoothY += (mouseY - smoothY) * 0.03;
    world.rotation.y = smoothX * CONFIG.parallaxStrength;
    world.rotation.x = smoothY * CONFIG.parallaxStrength * 0.6;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  isMobile = window.innerWidth < 1000;
  camera.aspect = heroSection.clientWidth / heroSection.clientHeight;
  camera.position.z = isMobile ? CONFIG.mobileCameraZ : CONFIG.cameraZ;
  camera.updateProjectionMatrix();
  if (!gsap.isTweening(world.scale)) world.scale.setScalar(worldScale());
  renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);
});
