// Arma la obra en 3D: las tres escenas animadas, la tarjeta que flota y el polvo dorado.
// El plano mide 1 de ancho, igual que el marcador, para calzar sobre el póster impreso.
import * as THREE from "three";
import { VERT, FRAG_COMP, FRAG_PAISAJE, FRAG_ORQUIDEA, FRAG_TARJETA } from "./shaders.js";
import { ZONAS, PINES } from "./contenido.js";

const TAM = { comp: [816, 1024], paisaje: [810, 1024], orquidea: [810, 1024] };
const ALTO = 1024 / 816;
const TARJETA = { x0: 271, y0: 869, x1: 541, y1: 1022 };

function cargar(url) {
  return new Promise((ok, mal) => {
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.NoColorSpace;   // los sombreadores devuelven el color tal cual
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      ok(t);
    }, undefined, () => mal(new Error(`No se pudo cargar ${url}`)));
  });
}

function texturaPolvo() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,240,180,1)");
  g.addColorStop(0.35, "rgba(250,205,95,0.7)");
  g.addColorStop(1, "rgba(250,205,95,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const suave = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const rebote = (v) => { const x = Math.min(1, Math.max(0, v)) - 1; return 1 + 2.70158 * x * x * x + 1.70158 * x * x; };

function lienzo(w, h, dibujar) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dibujar(c.getContext("2d"));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Círculo dorado con el número de la sala; morado con un visto cuando ya se visitó.
function texturaPin(n, visitado) {
  return lienzo(256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 104, 0, Math.PI * 2);
    ctx.fillStyle = visitado ? "#5B23A8" : "#F7B22C";
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = visitado ? "#F7B22C" : "#FFFFFF";
    ctx.stroke();
    if (visitado) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(80, 132);
      ctx.lineTo(114, 166);
      ctx.lineTo(180, 98);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#2A1250";
      ctx.font = "bold 118px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n, 128, 138);
    }
  });
}

function texturaAnillo() {
  return lienzo(256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#F7B22C";
    ctx.stroke();
  });
}

function texturaEtiqueta(texto) {
  return lienzo(512, 128, (ctx) => {
    ctx.font = "bold 62px system-ui, -apple-system, 'Segoe UI', sans-serif";
    const w = Math.min(500, ctx.measureText(texto).width + 70);
    const x = (512 - w) / 2;
    ctx.fillStyle = "rgba(26, 12, 52, 0.86)";
    ctx.beginPath();
    ctx.moveTo(x + 40, 14);
    ctx.arcTo(x + w, 14, x + w, 114, 50);
    ctx.arcTo(x + w, 114, x, 114, 50);
    ctx.arcTo(x, 114, x, 14, 50);
    ctx.arcTo(x, 14, x + w, 14, 50);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 256, 68);
  });
}

export async function crearObra() {
  const [tComp, tPais, tOrq, mCinta, mRio, tTarj] = await Promise.all([
    "imagenes/composicion.jpg", "imagenes/paisaje.jpg", "imagenes/orquidea.jpg",
    "imagenes/mascara_cinta.png", "imagenes/mascara_rio.png", "imagenes/tarjeta.png",
  ].map(cargar));

  const grupo = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, ALTO);
  const toques = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
  let turnoToque = 0;

  function escena(frag, tex, tam, extra, orden) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false,
      uniforms: {
        uTex: { value: tex }, uTam: { value: new THREE.Vector2(...tam) }, uTiempo: { value: 0 },
        uOpacidad: { value: 0 }, uToques: { value: toques }, ...extra,
      },
    });
    const malla = new THREE.Mesh(geo, material);
    malla.position.z = orden * 0.001;
    malla.renderOrder = orden;
    grupo.add(malla);
    return malla;
  }

  const mallas = {
    comp: escena(FRAG_COMP, tComp, TAM.comp, { uMascara: { value: mCinta }, uHueco: { value: 0 } }, 0),
    paisaje: escena(FRAG_PAISAJE, tPais, TAM.paisaje, { uMascara: { value: mRio } }, 1),
    orquidea: escena(FRAG_ORQUIDEA, tOrq, TAM.orquidea, {}, 2),
  };

  // Tarjeta que se levanta de la obra.
  const anchoT = (TARJETA.x1 - TARJETA.x0) / 816;
  const altoT = (TARJETA.y1 - TARJETA.y0) / 816;
  const tarjeta = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoT, altoT),
    new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_TARJETA, transparent: true, depthWrite: false,
      uniforms: { uTex: { value: tTarj }, uTiempo: { value: 0 }, uOpacidad: { value: 0 } },
    })
  );
  const baseT = new THREE.Vector3((TARJETA.x0 + TARJETA.x1) / 2 / 816 - 0.5, (0.5 - (TARJETA.y0 + TARJETA.y1) / 2 / 1024) * ALTO, 0);
  tarjeta.position.copy(baseT);
  tarjeta.renderOrder = 5;
  grupo.add(tarjeta);

  // Polvo dorado que sube desde la tarjeta hacia quien mira.
  const N = 90;
  const pos = new Float32Array(N * 3);
  const semillas = Array.from({ length: N }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
  const geoPolvo = new THREE.BufferGeometry();
  geoPolvo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const matPolvo = new THREE.PointsMaterial({ map: texturaPolvo(), size: 0.022, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const polvo = new THREE.Points(geoPolvo, matPolvo);
  polvo.renderOrder = 6;
  grupo.add(polvo);

  // Círculos que invitan a tocar: uno por sala y uno sobre la tarjeta.
  const texAnillo = texturaAnillo();
  const sprite = (map, orden) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }));
    s.renderOrder = orden;
    return s;
  };
  const pines = [...PINES, { sala: "tarjeta", n: "★", texto: "Tarjeta", enTarjeta: true }].map((def, i) => {
    const g = new THREE.Group();
    const anillo = sprite(texAnillo, 20);
    const disco = sprite(texturaPin(def.n, false), 21);
    const etiqueta = sprite(texturaEtiqueta(def.texto), 22);
    disco.userData.sala = etiqueta.userData.sala = def.sala;
    etiqueta.position.y = -0.068;
    etiqueta.scale.set(0.17, 0.0425, 1);
    g.add(anillo, disco, etiqueta);
    if (def.enTarjeta) {
      g.position.set(anchoT / 2 - 0.03, altoT / 2 - 0.005, 0.03);
      tarjeta.add(g);
    } else {
      g.position.set(def.x / 816 - 0.5, (0.5 - def.y / 1024) * ALTO, 0.07);
      grupo.add(g);
    }
    return { def, g, anillo, disco, etiqueta, i, visitado: false };
  });
  const tocables = pines.flatMap((p) => [p.disco, p.etiqueta]);

  function marcar(sala) {
    const p = pines.find((q) => q.def.sala === sala);
    if (!p || p.visitado) return;
    p.visitado = true;
    p.disco.material.map = texturaPin(p.def.n, true);
    p.disco.material.needsUpdate = true;
  }

  let actual = "comp";
  let transicion = { de: null, a: "comp", inicio: -10 };
  let inicio = null;
  let reloj = 0;

  function irA(nombre) {
    if (nombre === actual || !mallas[nombre]) return;
    transicion = { de: actual, a: nombre, inicio: reloj };
    actual = nombre;
  }

  function reiniciar() { inicio = null; }

  function actualizar(t) {
    reloj = t;
    if (inicio === null) inicio = t;
    const ti = t - inicio;
    const k = suave(0, 0.8, t - transicion.inicio);
    for (const [nombre, malla] of Object.entries(mallas)) {
      let op = nombre === actual ? (transicion.de ? k : 1) : nombre === transicion.de ? 1 - k : 0;
      if (nombre === "comp" && actual === "comp") op = Math.min(op, suave(0, 0.6, ti));
      malla.material.uniforms.uOpacidad.value = op;
      malla.material.uniforms.uTiempo.value = t;
      malla.visible = op > 0.002;
    }
    // La tarjeta se levanta al aparecer la obra y vuelve a su sitio fuera de la composición.
    const enComp = mallas.comp.material.uniforms.uOpacidad.value;
    const alza = suave(0.6, 1.8, ti) * enComp;
    tarjeta.material.uniforms.uOpacidad.value = enComp;
    tarjeta.material.uniforms.uTiempo.value = t;
    tarjeta.position.set(baseT.x, baseT.y + 0.01 * alza * Math.sin(t * 1.3), 0.004 + 0.06 * alza);
    tarjeta.rotation.x = -0.12 * alza;
    tarjeta.rotation.z = 0.025 * alza * Math.sin(t * 0.9);
    mallas.comp.material.uniforms.uHueco.value = alza;

    matPolvo.opacity = 0.9 * alza;
    for (let i = 0; i < N; i++) {
      const [sx, fase, vel] = semillas[i];
      const p = (t * 0.07 * vel + fase) % 1;
      pos[i * 3] = baseT.x + (sx - 0.5) * anchoT + 0.02 * Math.sin(t * 1.3 + fase * 9);
      pos[i * 3 + 1] = baseT.y + altoT / 2 + p * 0.5;
      pos[i * 3 + 2] = 0.06 * alza + p * 0.32;
    }
    geoPolvo.attributes.position.needsUpdate = true;

    // Los círculos aparecen uno tras otro, laten y flotan sobre la obra.
    for (const p of pines) {
      const ap = rebote((ti - 1.6 - p.i * 0.15) / 0.5) * (enComp > 0.5 ? 1 : 0);
      p.g.visible = ap > 0.01;
      const s = 0.085 * ap * (p.visitado ? 0.85 : 1 + 0.06 * Math.sin(t * 3 + p.i));
      p.disco.scale.set(s, s, 1);
      const k = (t * 0.7 + p.i * 0.17) % 1;
      const sa = 0.085 * ap * (1 + k);
      p.anillo.scale.set(sa, sa, 1);
      p.anillo.material.opacity = p.visitado ? 0 : (1 - k) * 0.9;
      p.etiqueta.material.opacity = Math.min(1, ap);
      if (!p.def.enTarjeta) p.g.position.z = 0.07 + 0.008 * Math.sin(t * 1.5 + p.i);
    }
  }

  // Devuelve la sala tocada y deja una onda donde cayó el dedo.
  function tocar(rayo) {
    if (actual === "comp") {
      const pin = rayo.intersectObjects(tocables.filter((s) => s.parent.visible), false)[0];
      if (pin) return pin.object.userData.sala;
    }
    const malla = mallas[actual];
    const objetivos = actual === "comp" && tarjeta.material.uniforms.uOpacidad.value > 0.5 ? [tarjeta, malla] : [malla];
    const hit = rayo.intersectObjects(objetivos, false)[0];
    if (!hit) return null;
    if (hit.object === tarjeta) return "tarjeta";
    const [w, h] = TAM[actual];
    const x = hit.uv.x * w;
    const y = (1 - hit.uv.y) * h;
    toques[turnoToque].set(x, y, reloj, 1);
    turnoToque = (turnoToque + 1) % toques.length;
    for (const z of ZONAS[actual]) {
      if (z.minX !== undefined && x < z.minX) continue;
      if (z.maxX !== undefined && x > z.maxX) continue;
      if (z.rect) {
        const [x0, y0, x1, y1] = z.rect;
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return z.sala;
      } else {
        const [cx, cy, rx, ry] = z.elipse;
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return z.sala;
      }
    }
    return null;
  }

  return { grupo, actualizar, reiniciar, tocar, irA, marcar, totalSalas: pines.length, escena: () => actual, alto: ALTO };
}
