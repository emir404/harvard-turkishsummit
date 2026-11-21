/**
 * Renders the house model as a hidden-line drawing on an isometric grid, and
 * makes it something to play with: drag to turn it (it settles on the nearest
 * isometric view), hover to switch on the lights in the rooms under the
 * pointer, click to send a wave of light through the building. The tower clock
 * keeps Cambridge time.
 *
 * Frames are only drawn while something is moving.
 *
 * Framing comes from CSS custom properties on the host element, so it can
 * change at breakpoints next to the layout it belongs to:
 * `--house-x` and `--house-y` place the building's centre as a share of the
 * canvas, and `--house-fill` is the share of the canvas it may fill across a
 * full turn.
 */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DataTexture,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  RedFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildHouse, Ink, type HouseModel, type Vec3 } from "./model";

export type HouseSceneOptions = {
  reducedMotion: boolean;
  /** Called the first time someone turns or lights the building. */
  onInteract?: () => void;
};

export type HouseScene = {
  dispose(): void;
};

/** True isometric: the ground grid reads as lines at 30° either side of level. */
const ISO_PITCH = Math.atan(1 / Math.SQRT2);
const HOME_YAW = Math.PI / 4;
const QUARTER = Math.PI / 2;
const CAMERA_DISTANCE = 300;
/** How far the building turns, and the camera rises, as the hero scrolls away. */
const SCROLL_YAW = Math.PI / 3;
const SCROLL_PITCH = 0.22;

const LINE_WIDTH = 1.15; // CSS pixels
const LINE_COLOR = [1, 1, 1];
const LINE_OPACITY = 0.52;
const GRID_CELL = 8;
/** How far the grid runs out from the building before it has faded away, in footprint radii. */
const GRID_REACH = 1.45;

/** Surface tones, indexed by `Surface` in the model. sRGB, 0–1. */
const TONES = [
  [0.085, 0.085, 0.088], // wall
  [0.1, 0.1, 0.104], // roof
  [0.1, 0.1, 0.104], // trim
  [0.03, 0.03, 0.032], // reveal
  [0.085, 0.085, 0.088], // stone
  [0.1, 0.1, 0.104], // dome
  [0.105, 0.106, 0.108], // canopy
];

// ---------------------------------------------------------------------------
// Shaders

const fillVertex = /* glsl */ `
  attribute float surface;
  attribute vec2 offset;
  varying vec3 vNormal;
  varying float vSurface;
  varying float vHeight;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 view = viewMatrix * world;
    view.xy += offset;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vSurface = surface;
    vHeight = world.y;
    gl_Position = projectionMatrix * view;
  }
`;

const fillFragment = /* glsl */ `
  uniform vec3 uTones[7];
  uniform vec3 uLight;
  uniform vec3 uView;
  uniform float uBuilt;
  varying vec3 vNormal;
  varying float vSurface;
  varying float vHeight;
  void main() {
    if (vHeight > uBuilt) discard;
    vec3 n = normalize(vNormal);
    if (dot(n, uView) > 0.0) n = -n;
    float lit = max(dot(n, uLight), 0.0);
    vec3 tone = uTones[int(vSurface + 0.5)];
    gl_FragColor = vec4(tone * (0.62 + 0.75 * lit), 1.0);
  }
`;

const glassVertex = /* glsl */ `
  attribute float aWindow;
  uniform sampler2D uLights;
  varying float vLight;
  varying float vSeed;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    vLight = texelFetch(uLights, ivec2(int(aWindow + 0.5), 0), 0).r;
    vSeed = fract(sin(aWindow * 91.7) * 4375.85);
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vHeight = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const glassFragment = /* glsl */ `
  uniform float uBuilt;
  varying float vLight;
  varying float vSeed;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    if (vHeight > uBuilt) discard;
    // Unlit panes catch a little sky at the top.
    vec3 dark = mix(vec3(0.03, 0.031, 0.035), vec3(0.055, 0.057, 0.064), vUv.y);
    // Lit rooms: warm, brightest low and in the middle, each a slightly different lamp.
    vec3 warm = mix(vec3(1.0, 0.7, 0.38), vec3(1.0, 0.86, 0.62), vSeed);
    float falloff = (1.0 - 0.35 * vUv.y) * (1.0 - 0.25 * abs(vUv.x - 0.5) * 2.0);
    vec3 lit = warm * (0.85 + 0.15 * vSeed) * falloff;
    gl_FragColor = vec4(mix(dark, lit, vLight), 1.0);
  }
`;

const lineVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec2 aOffsetStart;
  attribute vec2 aOffsetEnd;
  attribute float aInk;
  attribute float aDelay;
  uniform vec2 uResolution;
  uniform float uWidth;
  uniform float uProgress;
  uniform float uGrow;
  varying float vInk;
  varying float vSide;
  varying float vHalf;
  void main() {
    float t = clamp((uProgress - aDelay) / uGrow, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec4 a = viewMatrix * modelMatrix * vec4(aStart, 1.0);
    a.xy += aOffsetStart;
    vec4 b = viewMatrix * modelMatrix * vec4(aEnd, 1.0);
    b.xy += aOffsetEnd;
    b = mix(a, b, t);
    vec4 ca = projectionMatrix * a;
    vec4 cb = projectionMatrix * b;
    vec2 sa = ca.xy / ca.w * 0.5 * uResolution;
    vec2 sb = cb.xy / cb.w * 0.5 * uResolution;
    vec2 d = sb - sa;
    float len = length(d);
    vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
    vec2 across = vec2(-dir.y, dir.x);
    float extent = uWidth * 0.5 + 1.0;
    vec4 clip = mix(ca, cb, position.x);
    vec2 shift = across * position.y * extent + dir * (position.x * 2.0 - 1.0) * extent;
    clip.xy += shift / (0.5 * uResolution) * clip.w;
    // Lines sit on the faces they outline; nudge them forward so they win.
    clip.z -= 0.0002 * clip.w;
    vInk = t > 0.0 ? aInk : 0.0;
    vSide = position.y * extent;
    vHalf = uWidth * 0.5;
    gl_Position = clip;
  }
`;

const lineFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vInk;
  varying float vSide;
  varying float vHalf;
  void main() {
    float coverage = clamp(vHalf + 0.5 - abs(vSide), 0.0, 1.0);
    float a = coverage * vInk * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const gridVertex = /* glsl */ `
  varying vec2 vGround;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vGround = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const gridFragment = /* glsl */ `
  uniform float uCell;
  uniform float uWidth;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uOpacity;
  uniform vec4 uRipple;
  varying vec2 vGround;
  void main() {
    vec2 p = vGround / uCell;
    vec2 g = abs(fract(p - 0.5) - 0.5) / (fwidth(p) * uWidth);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float d = length(vGround - uCenter);
    float fade = 1.0 - smoothstep(uRadius * 0.3, uRadius, d);
    float ring = uRipple.w * exp(-pow((length(vGround - uRipple.xy) - uRipple.z) / 3.5, 2.0));
    float a = line * (fade * uOpacity + ring * 0.5);
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(a), a);
  }
`;

// ---------------------------------------------------------------------------

type LineData = {
  start: Float32Array;
  end: Float32Array;
  offsetStart: Float32Array;
  offsetEnd: Float32Array;
  ink: Float32Array;
  delay: Float32Array;
};

function lineGeometry(data: LineData) {
  const g = new InstancedBufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  g.setAttribute("aStart", new InstancedBufferAttribute(data.start, 3));
  g.setAttribute("aEnd", new InstancedBufferAttribute(data.end, 3));
  g.setAttribute("aOffsetStart", new InstancedBufferAttribute(data.offsetStart, 2));
  g.setAttribute("aOffsetEnd", new InstancedBufferAttribute(data.offsetEnd, 2));
  g.setAttribute("aInk", new InstancedBufferAttribute(data.ink, 1));
  g.setAttribute("aDelay", new InstancedBufferAttribute(data.delay, 1));
  g.instanceCount = data.ink.length;
  return g;
}

/** A handful of plain segments, for the parts that move. */
function segments(pairs: [Vec3, Vec3, number][], delay: number): LineData {
  const n = pairs.length;
  const data: LineData = {
    start: new Float32Array(n * 3),
    end: new Float32Array(n * 3),
    offsetStart: new Float32Array(n * 2),
    offsetEnd: new Float32Array(n * 2),
    ink: new Float32Array(n),
    delay: new Float32Array(n).fill(delay),
  };
  pairs.forEach(([a, b, ink], i) => {
    data.start.set(a, i * 3);
    data.end.set(b, i * 3);
    data.ink[i] = ink;
  });
  return data;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** The time on the Harvard clock. */
const cambridgeTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

function clockAngles() {
  const parts = Object.fromEntries(cambridgeTime.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const h = Number(parts.hour) % 12;
  const m = Number(parts.minute);
  const s = Number(parts.second);
  return {
    hour: ((h + m / 60) / 12) * Math.PI * 2,
    minute: ((m + s / 60) / 60) * Math.PI * 2,
    key: h * 60 + m,
  };
}

// ---------------------------------------------------------------------------

export function createHouseScene(host: HTMLElement, canvas: HTMLCanvasElement, options: HouseSceneOptions): HouseScene {
  const reduced = options.reducedMotion;
  const model: HouseModel = buildHouse();
  let focus = { x: 0.5, y: 0.5 };
  let fill = 0.9;
  let interacted = false;
  const interact = () => {
    if (interacted) return;
    interacted = true;
    options.onInteract?.();
  };

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, CAMERA_DISTANCE - 150, CAMERA_DISTANCE + 150);
  const pivot = new Vector3(model.center[0], 0, model.center[2]);

  // --- Surfaces
  const tones = TONES.map(([r, g, b]) => new Vector3(r, g, b));
  const shared = {
    uLight: { value: new Vector3(-0.5, 0.75, 0.45).normalize() },
    uView: { value: new Vector3(0, 0, -1) },
    uBuilt: { value: reduced ? 1e4 : -1 },
  };
  const fillMaterial = new ShaderMaterial({
    vertexShader: fillVertex,
    fragmentShader: fillFragment,
    uniforms: { uTones: { value: tones }, ...shared },
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  const fillGeometry = new BufferGeometry();
  fillGeometry.setAttribute("position", new BufferAttribute(model.fill.position, 3));
  fillGeometry.setAttribute("normal", new BufferAttribute(model.fill.normal, 3));
  fillGeometry.setAttribute("surface", new BufferAttribute(model.fill.surface, 1));
  fillGeometry.setAttribute("offset", new BufferAttribute(model.fill.offset, 2));
  const fills = new Mesh(fillGeometry, fillMaterial);
  fills.frustumCulled = false;
  scene.add(fills);

  // --- Window panes, lit from a one-row texture of levels.
  const count = model.windows.length;
  const levels = new Float32Array(count);
  const base = new Float32Array(count);
  const hold = new Float32Array(count);
  const wave = new Float32Array(count).fill(-1);
  const lightBytes = new Uint8Array(count);
  const lightTexture = new DataTexture(lightBytes, count, 1, RedFormat, UnsignedByteType);
  lightTexture.magFilter = NearestFilter;
  lightTexture.minFilter = NearestFilter;
  lightTexture.needsUpdate = true;
  const glassMaterial = new ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    uniforms: { uLights: { value: lightTexture }, uBuilt: shared.uBuilt },
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  const glassGeometry = new BufferGeometry();
  glassGeometry.setAttribute("position", new BufferAttribute(model.glass.position, 3));
  glassGeometry.setAttribute("aWindow", new BufferAttribute(model.glass.window, 1));
  glassGeometry.setAttribute("uv", new BufferAttribute(model.glass.uv, 2));
  const glass = new Mesh(glassGeometry, glassMaterial);
  glass.frustumCulled = false;
  scene.add(glass);

  // Evening: a share of rooms are lit, doors more often than not.
  for (let i = 0; i < count; i++) {
    const w = model.windows[i];
    const r = Math.abs(Math.sin(i * 12.9898 + 4.1414) * 43758.5453) % 1;
    if (w.door) base[i] = r < 0.75 ? 1 : 0;
    else if (w.floor === 9 || w.floor === 4) base[i] = 0;
    else base[i] = r < 0.24 ? 0.7 + 0.3 * ((r * 7) % 1) : 0;
  }
  const lightsOn = new Float32Array(count); // when each room's evening light comes on
  for (let i = 0; i < count; i++) lightsOn[i] = Math.random();

  // --- Lines
  const lineUniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uWidth: { value: LINE_WIDTH },
    uProgress: { value: reduced ? 2 : 0 },
    uGrow: { value: 0.16 },
    uColor: { value: new Vector3(...LINE_COLOR) },
    uOpacity: { value: LINE_OPACITY },
  };
  const lineMaterial = new ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    uniforms: lineUniforms,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: MaxEquation,
  });
  const lines = new Mesh(lineGeometry(model.lines), lineMaterial);
  lines.frustumCulled = false;
  lines.renderOrder = 2;
  scene.add(lines);

  // --- Clock hands, one pair per face.
  const hands: { hour: Group; minute: Group }[] = [];
  for (const clock of model.clocks) {
    const face = new Group();
    face.position.set(...clock.center);
    face.lookAt(clock.center[0] + clock.normal[0], clock.center[1], clock.center[2] + clock.normal[2]);
    const hour = new Group();
    const minute = new Group();
    const hourLine = new Mesh(
      lineGeometry(segments([[[0, 0, 0.01], [0, clock.radius * 0.56, 0.01], Ink.edge]], 0.8)),
      lineMaterial,
    );
    const minuteLine = new Mesh(
      lineGeometry(segments([[[0, 0, 0.02], [0, clock.radius * 0.84, 0.02], Ink.edge]], 0.8)),
      lineMaterial,
    );
    for (const m of [hourLine, minuteLine]) {
      m.frustumCulled = false;
      m.renderOrder = 2;
    }
    hour.add(hourLine);
    minute.add(minuteLine);
    face.add(hour, minute);
    scene.add(face);
    hands.push({ hour, minute });
  }
  let clockKey = -1;
  const setClock = () => {
    const { hour, minute, key } = clockAngles();
    if (key === clockKey) return;
    clockKey = key;
    // Local +z points out of the face and +x to the viewer's right, so clockwise is a negative turn.
    for (const h of hands) {
      h.hour.rotation.z = -hour;
      h.minute.rotation.z = -minute;
    }
  };
  setClock();

  // --- Weather vane.
  const vane = new Group();
  vane.position.set(...model.vane);
  const vaneLines = new Mesh(
    lineGeometry(
      segments(
        [
          [[-1.0, 0, 0], [0.95, 0, 0], Ink.edge],
          [[-1.0, 0, 0], [-0.7, 0.2, 0], Ink.edge],
          [[-1.0, 0, 0], [-0.7, -0.2, 0], Ink.edge],
          [[0.25, 0, 0], [0.25, 0.48, 0], Ink.edge],
          [[0.25, 0.48, 0], [0.95, 0.4, 0], Ink.edge],
          [[0.95, 0.4, 0], [0.95, 0, 0], Ink.edge],
        ],
        0.84,
      ),
    ),
    lineMaterial,
  );
  vaneLines.frustumCulled = false;
  vaneLines.renderOrder = 2;
  const flagGeometry = new BufferGeometry();
  const flag = [0.25, 0, 0, 0.95, 0, 0, 0.95, 0.4, 0, 0.25, 0, 0, 0.95, 0.4, 0, 0.25, 0.48, 0];
  flagGeometry.setAttribute("position", new BufferAttribute(new Float32Array(flag), 3));
  flagGeometry.setAttribute("normal", new BufferAttribute(new Float32Array(18).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  flagGeometry.setAttribute("surface", new BufferAttribute(new Float32Array(6).fill(2), 1));
  flagGeometry.setAttribute("offset", new BufferAttribute(new Float32Array(12), 2));
  const flagMesh = new Mesh(flagGeometry, fillMaterial);
  flagMesh.frustumCulled = false;
  vane.add(vaneLines, flagMesh);
  vane.scale.setScalar(model.vaneSize);
  vane.rotation.y = 0.6;
  scene.add(vane);

  // --- Ground grid.
  const ripple = { x: 0, z: 0, r: 0, strength: 0 };
  const gridMaterial = new ShaderMaterial({
    vertexShader: gridVertex,
    fragmentShader: gridFragment,
    uniforms: {
      uCell: { value: GRID_CELL },
      uWidth: { value: 1 },
      uCenter: { value: new Vector2(pivot.x, pivot.z) },
      uRadius: { value: reduced ? model.radius * GRID_REACH : 0 },
      uOpacity: { value: 0.13 },
      uRipple: { value: [0, 0, 0, 0] },
    },
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
  const gridGeometry = new PlaneGeometry(900, 900);
  gridGeometry.rotateX(-Math.PI / 2);
  const grid = new Mesh(gridGeometry, gridMaterial);
  grid.position.set(pivot.x, 0, pivot.z);
  grid.renderOrder = 1;
  grid.frustumCulled = false;
  scene.add(grid);

  // --- View state
  const view = {
    yaw: HOME_YAW,
    pitch: ISO_PITCH,
    yawVelocity: 0,
    pitchVelocity: 0,
    yawTarget: HOME_YAW,
    dragging: false,
    lean: { x: 0, y: 0 },
    leanTarget: { x: 0, y: 0 },
  };

  let width = 1;
  let height = 1;
  let zoom = 1; // CSS pixels per world unit

  // How far the building reaches from the pivot on screen, seen from the
  // isometric pitch: across a full turn (for the zoom, so it always fits) and
  // from the resting view (for centring it).
  const samplePoints: Vec3[] = [];
  for (const b of model.blocks) {
    for (const x of [b.min[0], b.max[0]])
      for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) samplePoints.push([x, y, z]);
  }
  samplePoints.push([model.vane[0], model.height, model.vane[2]]);
  const reach = (yaw: number) => {
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const upv = [-Math.sin(ISO_PITCH) * Math.sin(yaw), Math.cos(ISO_PITCH), -Math.sin(ISO_PITCH) * Math.cos(yaw)];
    const r = { left: 0, right: 0, up: 0, down: 0 };
    for (const p of samplePoints) {
      const d = [p[0] - pivot.x, p[1], p[2] - pivot.z];
      const sx = d[0] * right[0] + d[2] * right[2];
      const sy = d[0] * upv[0] + d[1] * upv[1] + d[2] * upv[2];
      r.left = Math.max(r.left, -sx);
      r.right = Math.max(r.right, sx);
      r.up = Math.max(r.up, sy);
      r.down = Math.max(r.down, -sy);
    }
    return r;
  };
  const home = reach(HOME_YAW);
  const turn = { width: 0, height: 0 };
  for (let k = 0; k < 24; k++) {
    const r = reach(HOME_YAW + (k / 24) * Math.PI * 2);
    turn.width = Math.max(turn.width, r.left + r.right);
    turn.height = Math.max(turn.height, r.up + r.down);
  }

  function readFraming() {
    const style = getComputedStyle(host);
    const read = (name: string, fallback: number) => {
      const v = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    focus = { x: read("--house-x", 0.5), y: read("--house-y", 0.5) };
    fill = read("--house-fill", 0.9);
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    lineUniforms.uResolution.value.set(width * dpr, height * dpr);
    lineUniforms.uWidth.value = LINE_WIDTH * dpr;
    gridMaterial.uniforms.uWidth.value = dpr;
    readFraming();
    zoom = Math.min((width * fill) / turn.width, (height * fill) / turn.height);
    invalidate();
  }

  function placeCamera() {
    const yaw = view.yaw + view.lean.x - scroll.value * SCROLL_YAW;
    const pitch = view.pitch + view.lean.y + scroll.value * SCROLL_PITCH;
    const cp = Math.cos(pitch);
    camera.position.set(
      pivot.x + CAMERA_DISTANCE * cp * Math.sin(yaw),
      CAMERA_DISTANCE * Math.sin(pitch),
      pivot.z + CAMERA_DISTANCE * cp * Math.cos(yaw),
    );
    camera.lookAt(pivot);
    // Frame the building: the centre of its resting view lands on the focus point.
    const halfW = width / 2 / zoom;
    const halfH = height / 2 / zoom;
    const midX = (home.right - home.left) / 2;
    const midY = (home.up - home.down) / 2;
    const fx = (focus.x - 0.5) * 2 * halfW;
    const fy = (focus.y - 0.5) * 2 * halfH;
    camera.left = -halfW + midX - fx;
    camera.right = halfW + midX - fx;
    camera.top = halfH + midY + fy;
    camera.bottom = -halfH + midY + fy;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const forward = new Vector3();
    camera.getWorldDirection(forward);
    shared.uView.value.copy(forward);
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    // A light from the upper left of the view, so faces read the same at any angle.
    shared.uLight.value.copy(right.multiplyScalar(-0.62).add(up.multiplyScalar(0.62)).addScaledVector(forward, -0.48)).normalize();
  }

  // --- Picking: the stand-in boxes are plenty for finding which rooms are under the pointer.
  const boxes = model.blocks.map((b) => new Box3(new Vector3(...b.min), new Vector3(...b.max)));
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hit = new Vector3();
  function pick(clientX: number, clientY: number): Vector3 | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    let best: Vector3 | null = null;
    let bestDistance = Infinity;
    for (const box of boxes) {
      if (raycaster.ray.intersectBox(box, hit)) {
        const d = hit.distanceToSquared(raycaster.ray.origin);
        if (d < bestDistance) {
          bestDistance = d;
          best = hit.clone();
        }
      }
    }
    return best;
  }

  function lightAround(point: Vector3, radius: number, seconds: number) {
    for (let i = 0; i < count; i++) {
      const c = model.windows[i].center;
      const d = Math.hypot(c[0] - point.x, c[1] - point.y, c[2] - point.z);
      if (d < radius) hold[i] = Math.max(hold[i], seconds * (1 - (d / radius) * 0.5));
    }
  }

  function sendWave(point: Vector3) {
    interact();
    const now = clock;
    for (let i = 0; i < count; i++) {
      const c = model.windows[i].center;
      wave[i] = now + Math.hypot(c[0] - point.x, c[1] - point.y, c[2] - point.z) / 34;
    }
    ripple.x = point.x;
    ripple.z = point.z;
    ripple.r = 0;
    ripple.strength = 1;
    invalidate();
  }

  // --- Pointer
  let drag: { id: number; moved: number; t: number; lastX: number; lastY: number; lastT: number } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const now = performance.now();
    drag = { id: e.pointerId, moved: 0, t: now, lastX: e.clientX, lastY: e.clientY, lastT: now };
    canvas.setPointerCapture(e.pointerId);
    view.dragging = true;
    view.yawVelocity = 0;
    canvas.style.cursor = "grabbing";
    interact();
    invalidate();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT) / 1000;
      const turn = -dx * (Math.PI / Math.max(520, width));
      view.yaw += turn;
      view.yawVelocity = view.yawVelocity * 0.6 + (turn / dt) * 0.4;
      view.pitch = Math.min(ISO_PITCH + 0.32, Math.max(ISO_PITCH - 0.22, view.pitch + dy * 0.0025));
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.lastT = now;
      invalidate();
      return;
    }
    if (e.pointerType !== "mouse") return;
    const p = pick(e.clientX, e.clientY);
    canvas.style.cursor = p ? "grab" : "";
    if (p) {
      lightAround(p, 6.5, 1.4);
      invalidate();
    }
  };
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasClick = drag.moved < 6 && performance.now() - drag.t < 450;
    if (performance.now() - drag.lastT > 80) view.yawVelocity = 0;
    drag = null;
    view.dragging = false;
    canvas.style.cursor = "grab";
    if (wasClick && e.type === "pointerup") {
      sendWave(pick(e.clientX, e.clientY) ?? new Vector3(pivot.x, 8, pivot.z));
    }
    // Settle on the isometric view nearest to where the throw would stop.
    const stop = view.yaw + view.yawVelocity * 0.28;
    view.yawTarget = HOME_YAW + Math.round((stop - HOME_YAW) / QUARTER) * QUARTER;
    invalidate();
  };
  const onLeave = () => {
    view.leanTarget = { x: 0, y: 0 };
    invalidate();
  };
  // The element the canvas sits in (the hero), over which the building leans towards the pointer.
  const stage = host.parentElement ?? host;
  // Scrolling the hero away turns the building and lifts the camera a little.
  const scroll = { target: 0, value: 0 };
  const readScroll = () => {
    if (reduced) return;
    const rect = stage.getBoundingClientRect();
    scroll.target = clamp01(-rect.top / Math.max(1, rect.height));
    invalidate();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      view.yawTarget += e.key === "ArrowLeft" ? -QUARTER : QUARTER;
      interact();
      invalidate();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      sendWave(new Vector3(pivot.x, 10, pivot.z + 20));
    }
  };
  const lean = (e: PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || view.dragging) return;
    const rect = host.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width * focus.x)) / window.innerWidth;
    const ny = (e.clientY - (rect.top + rect.height * focus.y)) / window.innerHeight;
    view.leanTarget = { x: Math.max(-1, Math.min(1, nx)) * 0.07, y: Math.max(-1, Math.min(1, ny)) * -0.035 };
    invalidate();
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("keydown", onKey);
  stage.addEventListener("pointermove", lean, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", readScroll, { passive: true });
  canvas.style.cursor = "grab";

  // --- Loop
  let clock = 0;
  let frame = 0;
  let last = 0;
  let visible = true;
  let running = false;
  const revealSeconds = reduced ? 0 : 2.8;
  let revealed = reduced;
  let nextFlicker = performance.now() + 6000;
  let nextClockCheck = 0;

  function invalidate() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    let busy = false;

    // Drawing the building in, then the evening lights.
    if (!revealed) {
      const t = clamp01(clock / revealSeconds);
      lineUniforms.uProgress.value = t * (1 + lineUniforms.uGrow.value) * 1.02;
      // Faces follow the lines up, hiding what is behind them.
      shared.uBuilt.value = t >= 1 ? 1e4 : -2 + smooth(clamp01((t - 0.18) / 0.82)) * (model.height + 4);
      gridMaterial.uniforms.uRadius.value = smooth(clamp01(t / 0.7)) * model.radius * GRID_REACH;
      if (t >= 1) revealed = true;
      busy = true;
    }

    // Turning.
    if (!view.dragging) {
      // A critically damped spring towards the resting view.
      const w = 7;
      const a = w * w * (view.yawTarget - view.yaw) - 2 * w * view.yawVelocity;
      view.yawVelocity += a * dt;
      view.yaw += view.yawVelocity * dt;
      const ap = w * w * (ISO_PITCH - view.pitch) - 2 * w * view.pitchVelocity;
      view.pitchVelocity += ap * dt;
      view.pitch += view.pitchVelocity * dt;
      if (Math.abs(view.yawTarget - view.yaw) > 1e-4 || Math.abs(view.yawVelocity) > 1e-3) busy = true;
      if (Math.abs(ISO_PITCH - view.pitch) > 1e-4 || Math.abs(view.pitchVelocity) > 1e-3) busy = true;
    } else {
      busy = true;
    }
    const k = 1 - Math.exp(-dt * 4);
    view.lean.x += (view.leanTarget.x - view.lean.x) * k;
    view.lean.y += (view.leanTarget.y - view.lean.y) * k;
    if (Math.abs(view.leanTarget.x - view.lean.x) > 1e-4 || Math.abs(view.leanTarget.y - view.lean.y) > 1e-4) busy = true;
    // Follow the scroll position, eased so wheel steps glide.
    scroll.value += (scroll.target - scroll.value) * (1 - Math.exp(-dt * 7));
    if (Math.abs(scroll.target - scroll.value) > 1e-4) busy = true;
    else scroll.value = scroll.target;

    // The vane swings with the turning, like wind.
    const vaneTarget = 0.6 - view.yawVelocity * 0.5;
    vane.rotation.y += (vaneTarget - vane.rotation.y) * (1 - Math.exp(-dt * 2.5));
    if (Math.abs(vaneTarget - vane.rotation.y) > 1e-3) busy = true;

    // Lights.
    const evening = reduced ? 1 : clamp01((clock - revealSeconds * 0.85) / 1.6);
    if (!reduced && revealed && now > nextFlicker) {
      // Someone somewhere turns a lamp on or off.
      const i = Math.floor(Math.random() * count);
      const w = model.windows[i];
      if (!w.door && w.floor < 4) base[i] = base[i] > 0 ? 0 : 0.6 + Math.random() * 0.4;
      nextFlicker = now + 2500 + Math.random() * 4000;
    }
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (wave[i] >= 0 && clock >= wave[i]) {
        hold[i] = Math.max(hold[i], 1.8);
        wave[i] = -1;
      }
      if (wave[i] >= 0) busy = true;
      if (hold[i] > 0) {
        hold[i] = Math.max(0, hold[i] - dt);
        busy = true;
      }
      const on = lightsOn[i] < evening ? base[i] : 0;
      const target = hold[i] > 0 ? 1 : on;
      const rate = target > levels[i] ? 7 : 1.6;
      const next = levels[i] + (target - levels[i]) * (1 - Math.exp(-dt * rate));
      if (Math.abs(next - levels[i]) > 1e-3) busy = true;
      levels[i] = Math.abs(target - next) < 1e-3 ? target : next;
      const byte = Math.round(levels[i] * 255);
      if (byte !== lightBytes[i]) {
        lightBytes[i] = byte;
        changed = true;
      }
    }
    if (changed) lightTexture.needsUpdate = true;
    if (!revealed || evening < 1) busy = true;

    // Ripple across the ground.
    if (ripple.strength > 0) {
      ripple.r += dt * 34;
      ripple.strength = Math.max(0, 1 - ripple.r / (model.radius * 2.2));
      busy = true;
    }
    gridMaterial.uniforms.uRipple.value = [ripple.x, ripple.z, ripple.r, ripple.strength];

    if (now > nextClockCheck) {
      nextClockCheck = now + 1000;
      setClock();
    }

    placeCamera();
    renderer.render(scene, camera);

    if (busy && visible) {
      frame = requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && document.visibilityState === "visible";
    if (visible) invalidate();
  });
  io.observe(host);
  const onVisibility = () => {
    visible = document.visibilityState === "visible";
    if (visible) invalidate();
  };
  document.addEventListener("visibilitychange", onVisibility);
  // Wake once in a while for the clock and the lamps.
  const idle = window.setInterval(() => invalidate(), reduced ? 20000 : 3000);

  resize();
  // A page opened part-way down starts with the building already turned.
  readScroll();
  scroll.value = scroll.target;
  invalidate();

  return {
    dispose() {
      cancelAnimationFrame(frame);
      window.clearInterval(idle);
      window.removeEventListener("scroll", readScroll);
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stage.removeEventListener("pointermove", lean);
      stage.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("keydown", onKey);
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      fillMaterial.dispose();
      glassMaterial.dispose();
      lineMaterial.dispose();
      gridMaterial.dispose();
      lightTexture.dispose();
      renderer.dispose();
    },
  };
}
