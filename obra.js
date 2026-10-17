// Arma la obra en 3D: las tres escenas animadas, las piezas que salen del póster
// (orquídeas, isla, sol, tarjeta), las gotas, el polvo dorado, las chispas y los símbolos de las salas.
// El plano mide 1 de ancho, igual que el marcador, para calzar sobre el póster impreso.
import * as THREE from "three";
import { VERT, FRAG_COMP, FRAG_PAISAJE, FRAG_ORQUIDEA, FRAG_TARJETA, FRAG_RECORTE } from "./shaders.js?v=7";
import { ZONAS, PINES, PIN_TARJETA } from "./contenido.js?v=7";

const TAM = { comp: [816, 1024], paisaje: [810, 1024], orquidea: [810, 1024] };
const ALTO = 1024 / 816;
const TAU = Math.PI * 2;
const TARJETA = { x0: 271, y0: 869, x1: 541, y1: 1022 };
// Piezas recortadas de la composición (caja en píxeles), dónde giran y a qué sala pertenecen.
const RECORTES = {
  orquideas: { caja: [-2, 67, 384, 829], pivote: [200, 829], sala: "flores" },
  isla: { caja: [466, 182, 583, 312], pivote: [524, 247], sala: "atardecer" },
  sol: { caja: [645, 211, 754, 388], pivote: [699, 265], sala: "atardecer" },
};
const GOTA_DESDE = [697, 384];
const GOTA_HASTA = [683, 534];

const aPlano = (x, y, z = 0) => new THREE.Vector3(x / 816 - 0.5, (0.5 - y / 1024) * ALTO, z);
const suave = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const rebote = (v) => { const x = Math.min(1, Math.max(0, v)) - 1; return 1 + 2.70158 * x * x * x + 1.70158 * x * x; };
const ORO = "#F7B22C";
const NOCHE = "#2A1250";

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

// Transparencia reducida de una imagen, para que un toque en una zona vacía no cuente.
function mascara(imagen) {
  const lado = 128;
  const k = Math.min(1, lado / Math.max(imagen.width, imagen.height));
  const w = Math.max(1, Math.round(imagen.width * k));
  const h = Math.max(1, Math.round(imagen.height * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0, w, h);
  return { w, h, datos: ctx.getImageData(0, 0, w, h).data };
}
const opaco = (m, uv) => m.datos[(Math.min(m.h - 1, Math.floor((1 - uv.y) * m.h)) * m.w + Math.min(m.w - 1, Math.floor(uv.x * m.w))) * 4 + 3] > 60;

function lienzo(w, h, dibujar) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dibujar(c.getContext("2d"));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const texturaLuz = (interior, exterior) => lienzo(64, 64, (ctx) => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, interior);
  g.addColorStop(0.35, exterior);
  g.addColorStop(1, "rgba(250,205,95,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
});

const texturaGota = () => lienzo(64, 96, (ctx) => {
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.bezierCurveTo(36, 30, 56, 48, 56, 66);
  ctx.arc(32, 66, 24, 0, Math.PI);
  ctx.bezierCurveTo(8, 48, 28, 30, 32, 4);
  ctx.fillStyle = ORO;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#CD6E1E";
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(24, 62, 5, 9, -0.3, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
});

// Símbolos de la obra, dibujados en trazo dorado (como los de la cinta Quimbaya).
const ICONOS = {
  espiral(ctx) {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * TAU * 2.25;
      const r = 6 + (i / 120) * 46;
      const x = 128 + r * Math.cos(a), y = 128 + r * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  },
  ojo(ctx) {
    ctx.beginPath();
    ctx.moveTo(66, 128);
    ctx.quadraticCurveTo(128, 70, 190, 128);
    ctx.quadraticCurveTo(128, 186, 66, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 18, 0, TAU);
    ctx.fill();
  },
  sol(ctx) {
    ctx.beginPath();
    ctx.arc(128, 112, 32, 0, TAU);
    ctx.stroke();
    for (const [x, largo] of [[106, 36], [128, 56], [150, 28]]) {
      ctx.beginPath();
      ctx.moveTo(x, 140);
      ctx.lineTo(x, 140 + largo);
      ctx.stroke();
    }
  },
  cuadros(ctx) {
    ctx.strokeRect(80, 80, 96, 96);
    ctx.strokeRect(108, 108, 40, 40);
  },
  flor(ctx) {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * TAU) / 5;
      ctx.beginPath();
      ctx.ellipse(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30, 22, 13, a, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(128, 128, 9, 0, TAU);
    ctx.fill();
  },
  moneda(ctx) {
    ctx.beginPath();
    ctx.arc(128, 128, 50, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 32, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 118, 7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(116, 146);
    ctx.lineTo(128, 128);
    ctx.lineTo(140, 146);
    ctx.stroke();
  },
};

// Símbolo en un círculo translúcido; al visitarlo, el círculo se llena de oro.
function texturaPin(icono, visitado) {
  return lienzo(256, 256, (ctx) => {
    ctx.beginPath();
    ctx.arc(128, 128, 98, 0, TAU);
    ctx.fillStyle = visitado ? ORO : "rgba(26, 12, 52, 0.55)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = visitado ? "rgba(255,255,255,0.9)" : ORO;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ctx.fillStyle = visitado ? NOCHE : ORO;
    ICONOS[icono](ctx);
  });
}

const texturaAnillo = () => lienzo(256, 256, (ctx) => {
  ctx.beginPath();
  ctx.arc(128, 128, 116, 0, TAU);
  ctx.lineWidth = 4;
  ctx.strokeStyle = ORO;
  ctx.stroke();
});

// Nombre de la sala en letra blanca con sombra suave, sin recuadro.
const texturaEtiqueta = (texto) => lienzo(512, 128, (ctx) => {
  ctx.font = "600 54px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(10, 4, 24, 0.9)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(texto, 256, 64);
  ctx.fillText(texto, 256, 64);
});

export async function crearObra() {
  const [tBase, tPais, tOrq, mCinta, mRio, tTarj, tRecOrq, tRecIsla, tRecSol] = await Promise.all([
    "imagenes/composicion_base.jpg", "imagenes/paisaje.jpg", "imagenes/orquidea.jpg",
    "imagenes/mascara_cinta.png", "imagenes/mascara_rio.png", "imagenes/tarjeta.png",
    "imagenes/orquideas.png", "imagenes/isla.png", "imagenes/sol.png",
  ].map(cargar));

  const grupo = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, ALTO);
  const toques = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
  let turnoToque = 0;
  let reloj = 0;

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

  const disparos = new THREE.Vector4(-99, -99, -99, -99);
  const mallas = {
    comp: escena(FRAG_COMP, tBase, TAM.comp, {
      uMascara: { value: mCinta }, uHueco: { value: 0 }, uRevela: { value: -40 }, uDisparos: { value: disparos },
    }, 0),
    paisaje: escena(FRAG_PAISAJE, tPais, TAM.paisaje, { uMascara: { value: mRio } }, 1),
    orquidea: escena(FRAG_ORQUIDEA, tOrq, TAM.orquidea, {}, 2),
  };

  // Piezas que salen del póster. Cada una gira alrededor de su pivote.
  const piezas = {};
  const ordenes = { orquideas: 3, isla: 4, sol: 6 };
  const texturasPieza = { orquideas: tRecOrq, isla: tRecIsla, sol: tRecSol };
  for (const [nombre, def] of Object.entries(RECORTES)) {
    const tex = texturasPieza[nombre];
    const [x0, y0, x1, y1] = def.caja;
    const malla = new THREE.Mesh(
      new THREE.PlaneGeometry((x1 - x0) / 816, (y1 - y0) / 816),
      new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG_RECORTE, transparent: true, depthWrite: false,
        uniforms: { uTex: { value: tex }, uOpacidad: { value: 0 }, uBrillo: { value: 0 } },
      })
    );
    malla.renderOrder = ordenes[nombre];
    const pivote = new THREE.Object3D();
    pivote.position.copy(aPlano(...def.pivote));
    malla.position.copy(aPlano((x0 + x1) / 2, (y0 + y1) / 2).sub(pivote.position));
    pivote.add(malla);
    grupo.add(pivote);
    piezas[nombre] = { malla, pivote, sala: def.sala, mascara: mascara(tex.image), nombre };
  }

  // Resplandor detrás del sol.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaLuz("rgba(255,230,150,1)", "rgba(250,190,70,0.5)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.renderOrder = 5;
  grupo.add(halo);

  // Tarjeta que se levanta de la obra.
  const anchoT = (TARJETA.x1 - TARJETA.x0) / 816;
  const altoT = (TARJETA.y1 - TARJETA.y0) / 816;
  const tarjeta = new THREE.Mesh(
    new THREE.PlaneGeometry(anchoT, altoT),
    new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_TARJETA, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTex: { value: tTarj }, uTiempo: { value: 0 }, uOpacidad: { value: 0 } },
    })
  );
  const baseT = aPlano((TARJETA.x0 + TARJETA.x1) / 2, (TARJETA.y0 + TARJETA.y1) / 2);
  tarjeta.position.copy(baseT);
  tarjeta.renderOrder = 8;
  grupo.add(tarjeta);

  // Gotas de oro que caen del sol a la laguna (una cada 1,6 s, y lluvias al tocar el sol).
  const texGota = texturaGota();
  const gotas = Array.from({ length: 10 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGota, transparent: true, depthWrite: false }));
    s.renderOrder = 7;
    s.visible = false;
    grupo.add(s);
    return s;
  });
  let lluvias = [];

  // Polvo dorado que sube desde la tarjeta y chispas donde se toca.
  function nube(n, tam, orden) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ map: texturaLuz("rgba(255,240,180,1)", "rgba(250,205,95,0.7)"), size: tam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true });
    const p = new THREE.Points(g, m);
    p.renderOrder = orden;
    p.frustumCulled = false;
    grupo.add(p);
    return { pos, col, g, m };
  }
  const POLVO = 90;
  const polvo = nube(POLVO, 0.022, 9);
  const semillas = Array.from({ length: POLVO }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
  const CHISPAS = 120;
  const chispas = nube(CHISPAS, 0.03, 10);
  const vivas = Array.from({ length: CHISPAS }, () => ({ t0: -99, p: new THREE.Vector3(), v: new THREE.Vector3() }));
  let turnoChispa = 0;
  function estallar(punto, cuantas = 18, fuerza = 1) {
    for (let i = 0; i < cuantas; i++) {
      const c = vivas[turnoChispa];
      turnoChispa = (turnoChispa + 1) % CHISPAS;
      const a = Math.random() * TAU;
      const r = (0.15 + Math.random() * 0.35) * fuerza;
      c.t0 = reloj;
      c.p.copy(punto);
      c.v.set(Math.cos(a) * r, Math.sin(a) * r + 0.1, 0.15 + Math.random() * 0.3 * fuerza);
    }
  }

  // Símbolos que invitan a tocar: uno por sala y uno sobre la tarjeta.
  const texAnillo = texturaAnillo();
  const sprite = (map, orden) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }));
    s.renderOrder = orden;
    return s;
  };
  const pines = [...PINES, { ...PIN_TARJETA, enTarjeta: true }].map((def, i) => {
    const g = new THREE.Group();
    const anillo = sprite(texAnillo, 20);
    const disco = sprite(texturaPin(def.icono, false), 21);
    const etiqueta = sprite(texturaEtiqueta(def.texto), 22);
    disco.userData.sala = etiqueta.userData.sala = def.sala;
    etiqueta.position.y = -0.072;
    etiqueta.scale.set(0.2, 0.05, 1);
    g.add(anillo, disco, etiqueta);
    if (def.enTarjeta) {
      g.position.set(anchoT / 2 - 0.03, altoT / 2 - 0.005, 0.03);
      tarjeta.add(g);
    } else {
      g.position.copy(aPlano(def.x, def.y, 0.12));
      grupo.add(g);
    }
    return { def, g, anillo, disco, etiqueta, i, visitado: false };
  });
  const tocables = pines.flatMap((p) => [p.disco, p.etiqueta]);

  function marcar(sala) {
    const p = pines.find((q) => q.def.sala === sala);
    if (!p || p.visitado) return;
    p.visitado = true;
    p.disco.material.map = texturaPin(p.def.icono, true);
    p.disco.material.needsUpdate = true;
  }

  // Reacciones de la obra cuando se toca cada elemento.
  const reaccion = { isla: -99, flores: -99, tarjeta: -99, sol: -99 };
  function reaccionar(clave, punto) {
    estallar(punto, 18);
    if (clave === "sie") disparos.x = reloj;
    else if (clave === "buho") disparos.y = reloj;
    else if (clave === "quimbaya") disparos.z = reloj;
    else if (clave === "sol" || clave === "atardecer") {
      reaccion.sol = reloj;
      lluvias = [0, 0.12, 0.24, 0.36, 0.5].map((d, i) => ({ t0: reloj + d, dx: (i - 2) * 9 }));
    } else if (clave in reaccion) reaccion[clave] = reloj;
  }

  let actual = "comp";
  let transicion = { de: null, a: "comp", inicio: -10 };
  let inicio = null;

  function irA(nombre) {
    if (nombre === actual || !mallas[nombre]) return;
    transicion = { de: actual, a: nombre, inicio: reloj };
    actual = nombre;
  }

  function reiniciar() { inicio = null; }

  function actualizar(t) {
    const dt = Math.min(0.05, Math.max(0, t - reloj));
    reloj = t;
    if (inicio === null) inicio = t;
    const ti = t - inicio;
    const k = suave(0, 0.8, t - transicion.inicio);
    for (const [nombre, malla] of Object.entries(mallas)) {
      const op = nombre === actual ? (transicion.de ? k : 1) : nombre === transicion.de ? 1 - k : 0;
      malla.material.uniforms.uOpacidad.value = op;
      malla.material.uniforms.uTiempo.value = t;
      malla.visible = op > 0.002;
    }
    // La obra despierta detrás de una línea dorada y las piezas salen del póster.
    const u = mallas.comp.material.uniforms;
    u.uRevela.value = -40 + suave(0, 1.3, ti) * 1110;
    if (ti > 1.25 && ti - dt <= 1.25) estallar(aPlano(408, 1000, 0.02), 40, 1.6);
    const enComp = u.uOpacidad.value;
    const alza = rebote((ti - 1.1) / 0.9) * enComp;
    const listo = suave(0.9, 1.3, ti) * enComp;

    const orq = piezas.orquideas;
    const flor = t >= reaccion.flores ? Math.exp(-(t - reaccion.flores) * 3) : 0;
    orq.pivote.position.z = 0.035 * alza;
    orq.pivote.rotation.z = 0.03 * Math.sin(t * 1.3) + 0.06 * flor * Math.sin((t - reaccion.flores) * 14);
    orq.pivote.scale.setScalar(1 + 0.1 * flor);

    const isla = piezas.isla;
    const flota = 0.012 * Math.sin(t * TAU / 3.5);
    isla.pivote.position.copy(aPlano(...RECORTES.isla.pivote, 0.1 * alza + flota));
    isla.pivote.position.y += flota * alza;
    isla.pivote.rotation.z = 0.05 * Math.sin(t * 0.9);
    isla.pivote.rotation.y = t - reaccion.isla < 1.2 ? TAU * suave(0, 1.2, t - reaccion.isla) : 0;

    const sol = piezas.sol;
    const fulgor = t >= reaccion.sol ? Math.exp(-(t - reaccion.sol) * 2) : 0;
    sol.pivote.position.z = 0.065 * alza;
    sol.pivote.scale.setScalar(1 + 0.035 * Math.sin(t * 2) + 0.12 * fulgor);
    sol.malla.material.uniforms.uBrillo.value = 0.12 * (0.5 + 0.5 * Math.sin(t * 2)) + 0.35 * fulgor;
    halo.position.copy(aPlano(699, 265, 0.06 * alza));
    const th = 0.3 * (1 + 0.15 * Math.sin(t * 2) + 0.6 * fulgor) * alza;
    halo.scale.set(th, th, 1);
    halo.material.opacity = 0.55 * listo;

    for (const p of Object.values(piezas)) p.malla.material.uniforms.uOpacidad.value = listo;

    // Gotas: el goteo constante y las lluvias al tocar el sol.
    const caidas = [];
    const ciclo = t % 1.6;
    if (ciclo < 0.85) caidas.push({ p: Math.pow(ciclo / 0.85, 1.6), dx: 0 });
    lluvias = lluvias.filter((l) => t - l.t0 < 0.7);
    for (const l of lluvias) if (t >= l.t0) caidas.push({ p: Math.pow((t - l.t0) / 0.7, 1.6), dx: l.dx });
    gotas.forEach((g, i) => {
      const c = caidas[i];
      g.visible = Boolean(c) && listo > 0.5;
      if (!c) return;
      const x = GOTA_DESDE[0] + c.dx * (1 - c.p) + (GOTA_HASTA[0] - GOTA_DESDE[0]) * c.p;
      const y = GOTA_DESDE[1] + (GOTA_HASTA[1] - GOTA_DESDE[1]) * c.p;
      g.position.copy(aPlano(x, y, 0.065 * alza * (1 - c.p) + 0.004));
      const s = 0.016 * (0.8 + 0.4 * c.p);
      g.scale.set(s, s * 1.5, 1);
      g.material.opacity = Math.min(1, c.p * 8 + 0.2);
    });

    // La tarjeta se levanta, flota y da una vuelta si se toca.
    const vuelta = t - reaccion.tarjeta < 1.0 ? suave(0, 1.0, t - reaccion.tarjeta) * TAU : 0;
    tarjeta.material.uniforms.uOpacidad.value = enComp * suave(0.3, 0.9, ti);
    tarjeta.material.uniforms.uTiempo.value = t;
    tarjeta.position.set(baseT.x, baseT.y + 0.012 * alza * Math.sin(t * 1.3), 0.004 + 0.07 * alza);
    tarjeta.rotation.set(-0.15 * alza, vuelta, 0.03 * alza * Math.sin(t * 0.9));
    u.uHueco.value = alza;

    // Polvo dorado.
    for (let i = 0; i < POLVO; i++) {
      const [sx, fase, vel] = semillas[i];
      const p = (t * 0.07 * vel + fase) % 1;
      polvo.pos[i * 3] = baseT.x + (sx - 0.5) * anchoT + 0.02 * Math.sin(t * 1.3 + fase * 9);
      polvo.pos[i * 3 + 1] = baseT.y + altoT / 2 + p * 0.55;
      polvo.pos[i * 3 + 2] = 0.07 * alza + p * 0.35;
      const b = Math.sin(Math.PI * p) * alza;
      polvo.col[i * 3] = polvo.col[i * 3 + 1] = polvo.col[i * 3 + 2] = Math.max(0, b);
    }
    polvo.g.attributes.position.needsUpdate = true;
    polvo.g.attributes.color.needsUpdate = true;

    // Chispas de los toques.
    vivas.forEach((c, i) => {
      const e = t - c.t0;
      const vida = e >= 0 && e < 0.9 ? 1 - e / 0.9 : 0;
      chispas.pos[i * 3] = c.p.x + c.v.x * e;
      chispas.pos[i * 3 + 1] = c.p.y + c.v.y * e - 0.35 * e * e;
      chispas.pos[i * 3 + 2] = c.p.z + c.v.z * e;
      chispas.col[i * 3] = vida;
      chispas.col[i * 3 + 1] = vida * 0.85;
      chispas.col[i * 3 + 2] = vida * 0.5;
    });
    chispas.g.attributes.position.needsUpdate = true;
    chispas.g.attributes.color.needsUpdate = true;

    // Símbolos: aparecen uno tras otro, laten y flotan sobre la obra.
    for (const p of pines) {
      const ap = rebote((ti - 1.7 - p.i * 0.15) / 0.5) * (enComp > 0.5 ? 1 : 0);
      p.g.visible = ap > 0.01;
      const s = 0.088 * ap * (p.visitado ? 0.9 : 1 + 0.05 * Math.sin(t * 2.5 + p.i));
      p.disco.scale.set(s, s, 1);
      const kk = (t * 0.7 + p.i * 0.17) % 1;
      const sa = 0.088 * ap * (1 + 0.7 * kk);
      p.anillo.scale.set(sa, sa, 1);
      p.anillo.material.opacity = p.visitado ? 0 : (1 - kk) * 0.7;
      p.etiqueta.material.opacity = Math.min(1, ap);
      if (!p.def.enTarjeta) p.g.position.z = 0.12 + 0.01 * Math.sin(t * 1.5 + p.i);
    }
  }

  // Toque: un símbolo abre su sala; la obra reacciona donde se toca.
  function tocar(rayo) {
    if (actual === "comp") {
      const pin = rayo.intersectObjects(tocables.filter((s) => s.parent.visible), false)[0];
      if (pin) return { sala: pin.object.userData.sala, pin: true };
      const candidatos = [tarjeta, ...Object.values(piezas).map((p) => p.malla)].filter((m) => m.material.uniforms.uOpacidad.value > 0.5);
      for (const hit of rayo.intersectObjects(candidatos, false)) {
        const local = grupo.worldToLocal(hit.point.clone());
        if (hit.object === tarjeta) {
          reaccionar("tarjeta", local);
          return { sala: "tarjeta" };
        }
        const pieza = Object.values(piezas).find((p) => p.malla === hit.object);
        if (pieza && hit.uv && opaco(pieza.mascara, hit.uv)) {
          reaccionar(pieza.nombre === "orquideas" ? "flores" : pieza.nombre, local);
          return { sala: pieza.sala };
        }
      }
    }
    const malla = mallas[actual];
    const hit = rayo.intersectObject(malla, false)[0];
    if (!hit) return null;
    const [w, h] = TAM[actual];
    const x = hit.uv.x * w;
    const y = (1 - hit.uv.y) * h;
    toques[turnoToque].set(x, y, reloj, 1);
    turnoToque = (turnoToque + 1) % toques.length;
    const local = grupo.worldToLocal(hit.point.clone());
    let sala = null;
    for (const z of ZONAS[actual]) {
      if (z.minX !== undefined && x < z.minX) continue;
      if (z.maxX !== undefined && x > z.maxX) continue;
      if (z.rect) {
        const [x0, y0, x1, y1] = z.rect;
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { sala = z.sala; break; }
      } else {
        const [cx, cy, rx, ry] = z.elipse;
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) { sala = z.sala; break; }
      }
    }
    if (actual === "comp" && sala) reaccionar(sala, local);
    else estallar(local, 12);
    return { sala };
  }

  return { grupo, actualizar, reiniciar, tocar, irA, marcar, totalSalas: pines.length, escena: () => actual, alto: ALTO };
}
