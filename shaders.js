// Sombreadores que animan las imágenes del grupo en el celular.
// Cada imagen se deforma suavemente por zonas (sin redibujarla) y se le suman
// gotas, ondas y brillos. Todas las coordenadas están en píxeles de la imagen original.

export const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const COMUN = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTam;
uniform float uTiempo;
uniform float uOpacidad;
uniform vec4 uToques[3];
varying vec2 vUv;
const float TAU = 6.2831853;

float elipse(vec2 p, vec2 c, vec2 r, float b) {
  float d = length((p - c) / r);
  float k = clamp((d - (1.0 - b)) / b, 0.0, 1.0);
  return 1.0 - k * k * (3.0 - 2.0 * k);
}
float gauss(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return exp(-dot(q, q)); }
vec2 girar(vec2 p, vec2 piv, float th, float m) { return th * m * vec2(-(p.y - piv.y), p.x - piv.x); }
vec2 oleaje(vec2 p, float t, float amp, float m, float k, float w) {
  return amp * m * vec2(sin(k * p.y + w * t), sin(k * 0.8 * p.x + w * 1.2 * t + 1.7));
}
float cierre(float t, float periodo, float fase, float dur) {
  float d = abs(mod(t + fase, periodo) - periodo * 0.5);
  return d < dur * 0.5 ? 1.0 + 3.2 * (1.0 - d / (dur * 0.5)) : 1.0;
}
vec2 toques(vec2 p, float t) {
  vec2 d = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    vec4 q = uToques[i];
    float edad = t - q.z;
    if (q.w > 0.5 && edad > 0.0 && edad < 2.5) {
      vec2 v = p - q.xy;
      float r = length(v) + 0.001;
      float x = (r - edad * 280.0) / 45.0;
      d += v / r * exp(-x * x) * sin(x * 6.3) * 16.0 * (1.0 - edad / 2.5);
    }
  }
  return d;
}
vec2 aUv(vec2 s) { return vec2(s.x / uTam.x, 1.0 - s.y / uTam.y); }
vec2 pixel() { return vec2(vUv.x * uTam.x, (1.0 - vUv.y) * uTam.y); }
float brillo(float y, float banda, float ancho) { float x = (y - banda) / ancho; return exp(-x * x); }

vec2 gota(vec2 p, vec2 c, float r) {
  vec2 q = p - c;
  float ry = q.y < 0.0 ? r * 1.8 : r;
  float d = length(vec2(q.x / r, q.y / ry));
  return vec2(1.0 - smoothstep(0.92, 1.0, d), smoothstep(0.7, 0.8, d));
}
float anillo(vec2 p, vec2 c, float rx, float grosor) {
  float d = length((p - c) / vec2(rx, rx * 0.27));
  return 1.0 - smoothstep(0.0, grosor / rx, abs(d - 1.0));
}
// Gotas de oro que caen del sol y abren ondas en la laguna.
vec3 caida(vec2 p, float t, vec2 a, vec2 b, float r, float periodo, float dur, vec2 centro, float rmax, vec3 col) {
  float ciclo = mod(t, periodo);
  if (ciclo < dur) {
    float pp = pow(ciclo / dur, 1.6);
    vec2 g = gota(p, mix(a, b, pp), r * (0.75 + 0.25 * pp));
    col = mix(col, mix(vec3(0.969, 0.698, 0.173), vec3(0.804, 0.431, 0.118), g.y), g.x * min(1.0, ciclo / 0.15));
  }
  float edad = ciclo >= dur ? ciclo - dur : ciclo + periodo - dur;
  for (int k = 0; k < 3; k++) {
    float e = edad - float(k) * 0.25;
    if (e > 0.0 && e < 1.4) {
      float pr = e / 1.4;
      col = mix(col, vec3(0.98, 0.925, 0.627), anillo(p, centro, rmax * (0.12 + 0.88 * pr), 1.6) * 0.85 * (1.0 - pr));
    }
  }
  return col;
}`;

// La composición sin el sol, la isla ni las orquídeas: esos salen del póster en 3D (ver obra.js).
export const FRAG_COMP = COMUN + /* glsl */ `
uniform sampler2D uMascara;
uniform float uHueco;
uniform float uRevela;     // línea dorada que despierta la obra (en píxeles de alto)
uniform vec4 uDisparos;    // momento del último toque: x Sie, y búho, z cinta Quimbaya
float pulso(float d, float dur) { return d > 0.0 && d < dur ? 1.0 + 3.2 * (1.0 - abs(d - dur * 0.5) / (dur * 0.5)) : 1.0; }
void main() {
  vec2 p = pixel();
  float t = uTiempo;
  vec2 D = vec2(0.0);
  // Cielo del paisaje dentro del cabello: fluye y gira, lejos de la cresta de Sie.
  float cielo = elipse(p, vec2(655.0, 228.0), vec2(135.0, 100.0), 0.5);
  D += oleaje(p, t, 4.5, cielo, 0.04, 1.5);
  D += girar(p, vec2(700.0, 150.0), 0.12 * sin(t * 0.8), gauss(p, vec2(700.0, 150.0), vec2(60.0)) * cielo);
  // Laguna.
  float r = length((p - vec2(683.0, 540.0)) / vec2(80.0, 22.0));
  D.y += elipse(p, vec2(683.0, 540.0), vec2(82.0, 24.0), 0.35) * 1.8 * sin(r * 9.0 - t * 4.0);
  // Enredadera y plumas del búho (se erizan al tocarlo).
  float erizo = 1.0 + 3.0 * exp(-max(t - uDisparos.y, 0.0) * 2.5) * step(0.0, t - uDisparos.y);
  D.x += gauss(p, vec2(100.0, 400.0), vec2(80.0, 420.0)) * 3.2 * sin(p.y * 0.03 + t * 2.2);
  D.x += elipse(p, vec2(330.0, 470.0), vec2(210.0, 330.0), 0.35) * (1.0 - gauss(p, vec2(320.0, 440.0), vec2(60.0, 50.0))) * (1.0 - smoothstep(380.0, 398.0, p.x)) * 2.4 * erizo * sin((p.x + p.y) * 0.04 - t * 2.4);
  // Frailejones del fondo.
  D += girar(p, vec2(45.0, 1030.0), 0.05 * sin(t * 2.0), gauss(p, vec2(45.0, 870.0), vec2(45.0, 90.0)));
  D += girar(p, vec2(100.0, 1030.0), 0.05 * sin(t * 2.0 + 1.4), gauss(p, vec2(100.0, 920.0), vec2(45.0, 90.0)));
  D += girar(p, vec2(205.0, 1030.0), 0.05 * sin(t * 2.0 + 2.6), gauss(p, vec2(205.0, 960.0), vec2(45.0, 90.0)));
  D += girar(p, vec2(770.0, 1030.0), 0.05 * sin(t * 2.0 + 3.3), gauss(p, vec2(770.0, 930.0), vec2(45.0, 90.0)));
  // Pupila del búho (se abre mucho al tocarlo) y parpadeo de Sie.
  float f = 1.0 + 0.16 * sin(t * 1.1) + 0.1 * (cierre(t, 4.0, 0.0, 0.7) - 1.0) + 0.12 * (pulso(t - uDisparos.y, 0.9) - 1.0);
  vec2 v = p - vec2(326.0, 437.0);
  float k = clamp((length(v) - 16.0) / 18.0, 0.0, 1.0);
  D += v * (1.0 - 1.0 / f) * (1.0 - k * k * (3.0 - 2.0 * k));
  float g = max(cierre(t, 3.6, 0.05, 0.22), pulso(t - uDisparos.x, 0.25));
  D.y -= elipse(p, vec2(497.0, 432.0), vec2(60.0, 44.0), 0.45) * (g - 1.0) * (p.y - 432.0);
  D += toques(p, t);

  vec2 s = p - D;
  vec3 col = texture2D(uTex, aUv(s)).rgb;
  // Brillo dorado que baja por la cinta Quimbaya (cada 6 s, o al tocarla).
  float fase = t - uDisparos.z < 1.8 ? (t - uDisparos.z) / 1.8 : mod(t, 6.0) / 1.8;
  if (fase < 1.0) col = mix(col, vec3(0.98, 0.804, 0.373), brillo(s.y, 515.0 + 370.0 * fase, 28.0) * texture2D(uMascara, aUv(s)).r * 0.65);
  // Ondas donde caen las gotas del sol (las gotas son 3D).
  float edad = mod(t, 1.6) - 0.85;
  if (edad < 0.0) edad += 1.6;
  for (int i = 0; i < 3; i++) {
    float e = edad - float(i) * 0.25;
    if (e > 0.0 && e < 1.4) col = mix(col, vec3(0.98, 0.925, 0.627), anillo(p, vec2(683.0, 540.0), 72.0 * (0.12 + 0.88 * e / 1.4), 1.8) * 0.9 * (1.0 - e / 1.4));
  }
  // Cuando la tarjeta flota, su sitio en la obra queda en sombra.
  vec2 q = abs(p - vec2(406.0, 945.5)) - vec2(135.0, 76.5) + 12.0;
  float sitio = 1.0 - smoothstep(-1.0, 1.5, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 12.0);
  col = mix(col, col * 0.3, sitio * uHueco);
  // La obra despierta de arriba abajo, detrás de una línea dorada.
  float dl = (p.y - uRevela) / 9.0;
  float linea = exp(-dl * dl);
  float visible = 1.0 - smoothstep(uRevela - 3.0, uRevela + 3.0, p.y);
  col = mix(col, vec3(1.0, 0.86, 0.45), linea * 0.9);
  gl_FragColor = vec4(col, uOpacidad * max(visible, linea));
}`;

// Piezas recortadas que salen del póster (sol, isla, orquídeas).
export const FRAG_RECORTE = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uOpacidad;
uniform float uBrillo;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uTex, vUv);
  gl_FragColor = vec4(min(c.rgb * (1.0 + uBrillo) + uBrillo * 0.15, 1.0), c.a * uOpacidad);
}`;

export const FRAG_PAISAJE = COMUN + /* glsl */ `
uniform sampler2D uMascara;
void main() {
  vec2 p = pixel();
  float t = uTiempo;
  vec2 D = vec2(0.0);
  float isla = elipse(p, vec2(150.0, 255.0), vec2(100.0, 115.0), 0.5);
  D += oleaje(p, t, 5.0, clamp((470.0 - p.y) / 60.0, 0.0, 1.0) * (1.0 - isla), 0.03, 1.2);
  D += girar(p, vec2(305.0, 85.0), 0.18 * sin(t * 0.9), gauss(p, vec2(305.0, 85.0), vec2(70.0)));
  D += girar(p, vec2(725.0, 115.0), 0.18 * sin(t * 0.9 + 1.6), gauss(p, vec2(725.0, 115.0), vec2(70.0)));
  D.y += gauss(p, vec2(538.0, 410.0), vec2(75.0, 80.0)) * step(330.0, p.y) * 10.0 * (0.5 + 0.5 * sin(t * 2.0)) * clamp((p.y - 335.0) / 140.0, 0.0, 1.0);
  float r = length((p - vec2(500.0, 730.0)) / vec2(165.0, 45.0));
  D.y += elipse(p, vec2(500.0, 730.0), vec2(168.0, 47.0), 0.35) * 1.4 * sin(r * 9.0 - t * 4.0);
  D.y += isla * 11.0 * sin(t * TAU / 3.0);
  D += girar(p, vec2(68.0, 925.0), 0.035 * sin(t * 2.0), gauss(p, vec2(50.0, 860.0), vec2(70.0, 110.0)));
  D += girar(p, vec2(105.0, 1030.0), 0.035 * sin(t * 2.0 + 1.2), gauss(p, vec2(105.0, 930.0), vec2(70.0, 110.0)));
  D += girar(p, vec2(210.0, 1030.0), 0.035 * sin(t * 2.0 + 2.4), gauss(p, vec2(210.0, 965.0), vec2(70.0, 110.0)));
  D += girar(p, vec2(750.0, 1030.0), 0.035 * sin(t * 2.0 + 3.1), gauss(p, vec2(750.0, 935.0), vec2(70.0, 110.0)));
  D += toques(p, t);

  vec2 s = p - D;
  vec3 col = texture2D(uTex, aUv(s)).rgb;
  float fase = mod(t, 4.0) / 2.0;
  if (fase < 1.0) col = mix(col, vec3(1.0, 0.988, 0.882), brillo(s.y, 755.0 + 270.0 * fase, 30.0) * texture2D(uMascara, aUv(s)).r * 0.45);
  col = caida(p, t, vec2(540.0, 492.0), vec2(500.0, 712.0), 8.5, 1.8, 1.0, vec2(500.0, 730.0), 160.0, col);
  gl_FragColor = vec4(col, uOpacidad);
}`;

export const FRAG_ORQUIDEA = COMUN + /* glsl */ `
void main() {
  vec2 p = pixel();
  float t = uTiempo;
  vec2 D = vec2(0.0);
  D += girar(p, vec2(410.0, 340.0), 0.055 * sin(t * 1.5), gauss(p, vec2(440.0, 300.0), vec2(150.0)));
  D += girar(p, vec2(520.0, 560.0), 0.055 * sin(t * 1.5 + 1.1), gauss(p, vec2(540.0, 510.0), vec2(165.0)));
  D += girar(p, vec2(520.0, 690.0), 0.055 * sin(t * 1.5 + 2.2), gauss(p, vec2(460.0, 770.0), vec2(165.0)));
  D += girar(p, vec2(340.0, 395.0), 0.055 * sin(t * 1.5 + 3.0), gauss(p, vec2(280.0, 430.0), vec2(100.0)));
  D += girar(p, vec2(240.0, 210.0), 0.055 * sin(t * 1.5 + 3.8), gauss(p, vec2(170.0, 130.0), vec2(90.0)));
  D += girar(p, vec2(340.0, 1030.0), 0.02 * sin(t * 1.8), gauss(p, vec2(190.0, 910.0), vec2(170.0, 130.0)));
  D.y -= elipse(p, vec2(582.0, 950.0), vec2(15.0, 17.6), 0.45) * (cierre(t, 3.8, 0.0, 0.2) - 1.0) * (p.y - 950.0);
  D += toques(p, t);
  gl_FragColor = vec4(texture2D(uTex, aUv(p - D)).rgb, uOpacidad);
}`;

// La tarjeta que flota sobre la obra, con una franja de luz que la cruza.
export const FRAG_TARJETA = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uTiempo;
uniform float uOpacidad;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uTex, vUv);
  float fase = mod(uTiempo, 6.0) / 0.9;
  float x = vUv.x + (1.0 - vUv.y) * 0.25 - (-0.25 + 1.5 * fase);
  float banda = fase < 1.0 ? exp(-x * x / 0.004) : 0.0;
  gl_FragColor = vec4(mix(c.rgb, vec3(1.0), banda * 0.4), c.a * uOpacidad);
}`;
