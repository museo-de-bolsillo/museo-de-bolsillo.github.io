import * as THREE from "three";
import { crearObra } from "./obra.js";
import { SALAS } from "./contenido.js";

const $ = (s) => document.querySelector(s);
const inicio = $("#inicio");
const escenario = $("#escenario");
const ficha = $("#ficha");
const pista = $("#pista");
const aviso = $("#aviso");
const aObra = $("#a-obra");
const MARCADOR = "./targets/poster.mind";
const ayuda = $("#ayuda");
const progreso = $("#progreso");
let obraActiva = null;

// Recorrido: cuántas salas se han descubierto y el mensaje final al completarlas.
const visitadas = new Set();
let recorridoIniciado = false;
let finalPendiente = false;

function actualizarProgreso() {
  const total = obraActiva.totalSalas;
  $("#progreso-texto").textContent = `Salas ${visitadas.size}/${total}`;
  const puntos = $("#puntos");
  puntos.replaceChildren(...Array.from({ length: total }, (_, i) => {
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
  setTimeout(() => { if (visitadas.size === 0) ayuda.hidden = false; }, 1800);
  setTimeout(() => { ayuda.hidden = true; }, 9000);
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

// Un toque corto deja una onda y abre la sala; arrastrar no cuenta como toque.
function escucharToques(elemento, camara, obra) {
  const rayo = new THREE.Raycaster();
  const punto = new THREE.Vector2();
  let desde = null;
  elemento.addEventListener("pointerdown", (e) => { desde = [e.clientX, e.clientY]; });
  elemento.addEventListener("pointerup", (e) => {
    if (!desde) return;
    const movido = Math.hypot(e.clientX - desde[0], e.clientY - desde[1]);
    desde = null;
    if (movido > 10 || !ficha.hidden) return;
    const r = elemento.getBoundingClientRect();
    punto.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(punto, camara);
    const sala = obra.tocar(rayo);
    if (sala) setTimeout(() => mostrarSala(sala), 450);
  });
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
    if (performance.now() - perdidoDesde > 2500) obra.reiniciar();
    pista.textContent = "Toca los círculos dorados";
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
  escucharToques(escenario, camera, obra);
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
  pista.textContent = "Inclina el celular · toca los círculos";
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  escenario.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  const mesa = new THREE.Group();
  scene.add(mesa);
  const obra = await crearObra();
  obraActiva = obra;
  mesa.add(obra.grupo);
  iniciarRecorrido();

  function ajustar() {
    const w = escenario.clientWidth, h = escenario.clientHeight;
    renderer.setSize(w, h);
    camara.aspect = w / h;
    const vista = 2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    camara.position.set(0, 0, Math.max((obra.alto + 0.25) / vista, 1.15 / (vista * camara.aspect)));
    camara.updateProjectionMatrix();
  }
  window.addEventListener("resize", ajustar);
  ajustar();

  const giro = { x: 0, y: 0 };
  let ultimoGesto = -10;
  const reloj = new THREE.Clock();
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
  let arrastre = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { arrastre = { x: e.clientX, y: e.clientY, gx: giro.x, gy: giro.y }; });
  window.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    giro.y = THREE.MathUtils.clamp(arrastre.gy + (e.clientX - arrastre.x) * 0.004, -0.6, 0.6);
    giro.x = THREE.MathUtils.clamp(arrastre.gx + (e.clientY - arrastre.y) * 0.004, -0.5, 0.5);
    ultimoGesto = reloj.getElapsedTime();
  });
  window.addEventListener("pointerup", () => { arrastre = null; });

  renderer.setAnimationLoop(() => {
    const t = reloj.getElapsedTime();
    const libre = Math.min(1, Math.max(0, (t - ultimoGesto - 2.5) / 2));
    const objetivoX = giro.x * (1 - libre) + libre * (-0.08 + 0.07 * Math.sin(t * 0.3));
    const objetivoY = giro.y * (1 - libre) + libre * 0.22 * Math.sin(t * 0.35);
    mesa.rotation.x += (objetivoX - mesa.rotation.x) * 0.1;
    mesa.rotation.y += (objetivoY - mesa.rotation.y) * 0.1;
    obra.actualizar(t);
    renderer.render(scene, camara);
  });
  escucharToques(renderer.domElement, camara, obra);
}

$("#btn-camara").addEventListener("click", () => modoCamara().catch((e) => avisar(`Error: ${e.message}`)));
$("#btn-previa").addEventListener("click", () => modoSinCamara().catch((e) => avisar(`Error: ${e.message}`)));
if (location.hash === "#previa") modoSinCamara();
