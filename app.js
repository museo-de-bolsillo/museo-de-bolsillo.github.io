import * as THREE from "three";
import { crearObra } from "./obra.js?v=7";
import { SALAS } from "./contenido.js?v=7";

const $ = (s) => document.querySelector(s);
const inicio = $("#inicio");
const escenario = $("#escenario");
const ficha = $("#ficha");
const pista = $("#pista");
const aviso = $("#aviso");
const aObra = $("#a-obra");
const ayuda = $("#ayuda");
const progreso = $("#progreso");
const deCerca = $("#de-cerca");
const zoomBotones = $("#zoom");
const MARCADOR = "./targets/poster.mind";
let obraActiva = null;
let soltarGestos = null;

// Recorrido: cuántas salas se han descubierto y el mensaje final al completarlas.
const visitadas = new Set();
let recorridoIniciado = false;
let finalPendiente = false;

function actualizarProgreso() {
  const total = obraActiva.totalSalas;
  $("#progreso-texto").textContent = `Salas ${visitadas.size}/${total}`;
  $("#puntos").replaceChildren(...Array.from({ length: total }, (_, i) => {
    const p = document.createElement("span");
    p.className = i < visitadas.size ? "punto lleno" : "punto";
    return p;
  }));
}

function iniciarRecorrido() {
  if (recorridoIniciado) return;
  recorridoIniciado = true;
  actualizarProgreso();
  progreso.hidden = false;
  setTimeout(() => { if (visitadas.size === 0) ayuda.hidden = false; }, 2200);
  setTimeout(() => { ayuda.hidden = true; }, 10000);
}

function avisar(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
}

function entrar() {
  inicio.hidden = true;
  escenario.hidden = false;
  pista.hidden = false;
  $("#volver").hidden = false;
}

function mostrarSala(clave) {
  const s = SALAS[clave];
  if (!s) return;
  ayuda.hidden = true;
  if (clave !== "final" && obraActiva && !visitadas.has(clave)) {
    visitadas.add(clave);
    obraActiva.marcar(clave);
    actualizarProgreso();
    if (visitadas.size === obraActiva.totalSalas) finalPendiente = true;
  }
  $("#ficha-nombre").textContent = s.nombre;
  $("#ficha-autora").textContent = s.autora;
  $("#ficha-obra").textContent = s.obra;
  $("#ficha-leccion").textContent = s.leccion;
  $("#ficha-dato").textContent = s.dato;
  $("#ficha-fuente").textContent = s.fuente;
  const entrarBtn = $("#entrar");
  const puedeEntrar = s.escena && obraActiva && obraActiva.escena() !== s.escena;
  entrarBtn.hidden = !puedeEntrar;
  if (puedeEntrar) {
    entrarBtn.textContent = s.boton;
    entrarBtn.onclick = () => {
      obraActiva.irA(s.escena);
      ficha.hidden = true;
      aObra.hidden = false;
    };
  }
  ficha.hidden = false;
}

$("#cerrar-ficha").addEventListener("click", () => {
  ficha.hidden = true;
  if (finalPendiente) {
    finalPendiente = false;
    setTimeout(() => mostrarSala("final"), 350);
  }
});
$("#volver").addEventListener("click", () => location.reload());
aObra.addEventListener("click", () => {
  obraActiva?.irA("comp");
  aObra.hidden = true;
});

// Gestos sobre la escena: toque, doble toque, arrastre con un dedo y pellizco con dos.
function gestos(elemento, { toque, dobleToque, arrastre, pellizco }) {
  const dedos = new Map();
  let inicioToque = null;
  let huboPellizco = false;
  let pellizcoBase = null;
  let ultimoToque = { t: 0, x: 0, y: 0 };
  const distancia = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const centro = () => { const [a, b] = [...dedos.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };

  const abajo = (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 1) {
      inicioToque = { x: e.clientX, y: e.clientY, t: performance.now(), ux: e.clientX, uy: e.clientY };
      huboPellizco = false;
    } else if (dedos.size === 2) {
      huboPellizco = true;
      pellizcoBase = { d: distancia(), c: centro() };
      pellizco?.("inicio", 1, pellizcoBase.c);
    }
  };
  const mover = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2 && pellizcoBase) {
      pellizco?.("mover", distancia() / pellizcoBase.d, centro());
    } else if (dedos.size === 1 && inicioToque && !huboPellizco) {
      arrastre?.(e.clientX - inicioToque.ux, e.clientY - inicioToque.uy);
      inicioToque.ux = e.clientX;
      inicioToque.uy = e.clientY;
    }
  };
  const arriba = (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.delete(e.pointerId);
    if (dedos.size < 2) pellizcoBase = null;
    if (dedos.size === 0 && inicioToque && !huboPellizco) {
      const movido = Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y);
      const ahora = performance.now();
      if (movido < 12 && ahora - inicioToque.t < 450 && ficha.hidden) {
        const doble = ahora - ultimoToque.t < 320 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 40;
        if (doble && dobleToque) dobleToque(e.clientX, e.clientY);
        else toque(e.clientX, e.clientY);
        ultimoToque = doble ? { t: 0, x: 0, y: 0 } : { t: ahora, x: e.clientX, y: e.clientY };
      }
      inicioToque = null;
    }
  };
  elemento.addEventListener("pointerdown", abajo);
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", arriba);
  window.addEventListener("pointercancel", arriba);
  return () => {
    elemento.removeEventListener("pointerdown", abajo);
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", arriba);
    window.removeEventListener("pointercancel", arriba);
  };
}

// Convierte un toque en pantalla en un rayo sobre la escena. `lienzo` es el canvas que dibuja:
// en modo cámara es más grande que la pantalla (se recorta para llenarla).
function tocarEn(x, y, lienzo, camara, obra) {
  const r = lienzo.getBoundingClientRect();
  const rayo = new THREE.Raycaster();
  rayo.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camara);
  const res = obra.tocar(rayo);
  if (res?.pin) setTimeout(() => mostrarSala(res.sala), 250);
}

async function modoCamara() {
  if (!navigator.mediaDevices?.getUserMedia) {
    avisar("Este navegador no permite usar la cámara. Ábrelo en Chrome o Safari, o usa “Ver sin cámara”.");
    return;
  }
  entrar();
  pista.textContent = "Cargando…";
  const { MindARThree } = await import("mindar-image-three");
  const mind = new MindARThree({
    container: escenario,
    imageTargetSrc: MARCADOR,
    filterMinCF: 0.0001,
    filterBeta: 0.001,
    uiScanning: "no",
    uiLoading: "yes",
  });
  const { renderer, scene, camera } = mind;
  const obra = await crearObra();
  obraActiva = obra;
  const ancla = mind.addAnchor(0);
  ancla.group.add(obra.grupo);

  let perdidoDesde = -Infinity;
  ancla.onTargetFound = () => {
    if (performance.now() - perdidoDesde > 2500) {
      obra.reiniciar();
      navigator.vibrate?.(35);
    }
    pista.textContent = "Toca la obra y sus símbolos";
    deCerca.hidden = false;
    iniciarRecorrido();
  };
  ancla.onTargetLost = () => {
    perdidoDesde = performance.now();
    pista.textContent = "Apunta al póster";
  };

  try {
    await mind.start();
  } catch (error) {
    document.querySelectorAll(".mindar-ui-overlay").forEach((el) => el.remove());
    escenario.replaceChildren();
    escenario.hidden = true;
    pista.hidden = true;
    $("#volver").hidden = true;
    inicio.hidden = false;
    avisar("No se pudo abrir la cámara. Revisa el permiso en el navegador o usa “Ver sin cámara”.");
    return;
  }
  pista.textContent = "Apunta al póster";
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    obra.actualizar(reloj.getElapsedTime());
    renderer.render(scene, camera);
  });

  // Zoom con dos dedos: acerca toda la vista (cámara y obra) sin perder el seguimiento.
  let zoom = 1;
  let zoomBase = 1;
  const aplicarZoom = (z, c) => {
    zoom = THREE.MathUtils.clamp(z, 1, 3);
    escenario.style.transformOrigin = `${c.x}px ${c.y}px`;
    escenario.style.transform = `scale(${zoom})`;
  };
  soltarGestos = gestos(escenario, {
    toque: (x, y) => tocarEn(x, y, renderer.domElement, camera, obra),
    dobleToque: (x, y) => aplicarZoom(zoom > 1.2 ? 1 : 2, { x, y }),
    pellizco: (fase, k, c) => {
      if (fase === "inicio") zoomBase = zoom;
      else aplicarZoom(zoomBase * k, c);
    },
  });

  // "Ver de cerca": trae la obra a la pantalla para explorarla sin apuntar al póster.
  deCerca.onclick = () => {
    renderer.setAnimationLoop(null);
    mind.stop();
    soltarGestos?.();
    ancla.group.remove(obra.grupo);
    escenario.style.transform = "";
    escenario.replaceChildren();
    document.querySelectorAll(".mindar-ui-overlay").forEach((el) => el.remove());
    deCerca.hidden = true;
    visor(obra, false);
  };
}

// Visor sin cámara: la obra en 3D, que se inclina con el celular y se puede acercar.
function visor(obra, inclinacion) {
  pista.textContent = "Pellizca para acercar · toca la obra";
  zoomBotones.hidden = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  escenario.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  const mesa = new THREE.Group();
  scene.add(mesa);
  mesa.add(obra.grupo);
  let distancia = 3;

  function ajustar() {
    const w = escenario.clientWidth, h = escenario.clientHeight;
    renderer.setSize(w, h);
    camara.aspect = w / h;
    const vista = 2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    distancia = Math.max((obra.alto + 0.3) / vista, 1.2 / (vista * camara.aspect));
    camara.updateProjectionMatrix();
  }
  window.addEventListener("resize", ajustar);
  ajustar();

  const giro = { x: 0, y: 0 };
  const vista = { zoom: 1, x: 0, y: 0 };
  let ultimoGesto = -10;
  const reloj = new THREE.Clock();
  const limitar = () => {
    const mx = 0.5 * (1 - 1 / vista.zoom) + 0.05;
    const my = obra.alto / 2 * (1 - 1 / vista.zoom) + 0.05;
    vista.x = THREE.MathUtils.clamp(vista.x, -mx, mx);
    vista.y = THREE.MathUtils.clamp(vista.y, -my, my);
  };
  const fijarZoom = (z) => {
    vista.zoom = THREE.MathUtils.clamp(z, 1, 3.5);
    limitar();
  };
  // Lleva el punto tocado al centro de la vista al acercar.
  const puntoEnObra = (x, y) => {
    const r = renderer.domElement.getBoundingClientRect();
    const rayo = new THREE.Raycaster();
    rayo.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camara);
    const p = new THREE.Vector3();
    return rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), p) ? p : null;
  };

  if (inclinacion) {
    let base = null;
    window.addEventListener("deviceorientation", (e) => {
      if (e.beta === null || e.gamma === null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      giro.x = THREE.MathUtils.clamp((e.beta - base.b) * 0.012, -0.5, 0.5);
      giro.y = THREE.MathUtils.clamp((e.gamma - base.g) * 0.015, -0.6, 0.6);
      ultimoGesto = reloj.getElapsedTime();
    });
  }

  let zoomBase = 1;
  gestos(renderer.domElement, {
    toque: (x, y) => tocarEn(x, y, renderer.domElement, camara, obra),
    dobleToque: (x, y) => {
      if (vista.zoom > 1.3) {
        fijarZoom(1);
        vista.x = vista.y = 0;
      } else {
        const p = puntoEnObra(x, y);
        fijarZoom(2.4);
        if (p) { vista.x = p.x; vista.y = p.y; limitar(); }
      }
      ultimoGesto = reloj.getElapsedTime();
    },
    arrastre: (dx, dy) => {
      const escala = (obra.alto + 0.3) / escenario.clientHeight / vista.zoom;
      if (vista.zoom > 1.05) {
        vista.x -= dx * escala;
        vista.y += dy * escala;
        limitar();
      } else {
        giro.y = THREE.MathUtils.clamp(giro.y + dx * 0.004, -0.6, 0.6);
        giro.x = THREE.MathUtils.clamp(giro.x + dy * 0.004, -0.5, 0.5);
      }
      ultimoGesto = reloj.getElapsedTime();
    },
    pellizco: (fase, k) => {
      if (fase === "inicio") zoomBase = vista.zoom;
      else fijarZoom(zoomBase * k);
      ultimoGesto = reloj.getElapsedTime();
    },
  });
  $("#zoom-mas").onclick = () => { fijarZoom(vista.zoom * 1.4); ultimoGesto = reloj.getElapsedTime(); };
  $("#zoom-menos").onclick = () => { fijarZoom(vista.zoom / 1.4); if (vista.zoom < 1.05) vista.x = vista.y = 0; ultimoGesto = reloj.getElapsedTime(); };

  renderer.setAnimationLoop(() => {
    const t = reloj.getElapsedTime();
    const libre = vista.zoom > 1.05 ? 0 : Math.min(1, Math.max(0, (t - ultimoGesto - 2.5) / 2));
    const objetivoX = giro.x * (1 - libre) + libre * (-0.08 + 0.07 * Math.sin(t * 0.3));
    const objetivoY = giro.y * (1 - libre) + libre * 0.22 * Math.sin(t * 0.35);
    mesa.rotation.x += (objetivoX - mesa.rotation.x) * 0.1;
    mesa.rotation.y += (objetivoY - mesa.rotation.y) * 0.1;
    const objetivoZ = distancia / vista.zoom;
    camara.position.x += (vista.x - camara.position.x) * 0.15;
    camara.position.y += (vista.y - camara.position.y) * 0.15;
    camara.position.z += (objetivoZ - camara.position.z) * 0.15;
    obra.actualizar(t);
    renderer.render(scene, camara);
  });
}

async function modoSinCamara() {
  // En iPhone el permiso de inclinación se pide dentro del mismo toque.
  let inclinacion = false;
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      inclinacion = (await DeviceOrientationEvent.requestPermission()) === "granted";
    } else {
      inclinacion = "DeviceOrientationEvent" in window;
    }
  } catch {
    inclinacion = false;
  }
  entrar();
  pista.textContent = "Cargando…";
  const obra = await crearObra();
  obraActiva = obra;
  iniciarRecorrido();
  visor(obra, inclinacion);
}

$("#btn-camara").addEventListener("click", () => modoCamara().catch((e) => avisar(`Error: ${e.message}`)));
$("#btn-previa").addEventListener("click", () => modoSinCamara().catch((e) => avisar(`Error: ${e.message}`)));
window.__museoListo = true;
aviso.hidden = true;
if (location.hash === "#previa") modoSinCamara();
