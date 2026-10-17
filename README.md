# Museo de Bolsillo: realidad aumentada

Página web que se abre con el QR del póster. Al apuntar la cámara al dibujo del póster, la obra cobra vida encima. La animación se calcula en vivo en el celular, a partir de las imágenes del grupo:

- Sie parpadea, la pupila del búho se dilata y las orquídeas se mecen.
- Gotea el sol, la laguna hace ondas, la isla flota y un brillo dorado recorre la cinta Quimbaya.
- La tarjeta se levanta del dibujo y suelta polvo dorado en 3D.

Sobre la obra flotan seis círculos dorados numerados, que laten y llevan el nombre de su sala: Sie, Búho, Atardecer, Quimbaya, Flores y Tarjeta. Al reconocer el póster aparece un mensaje que invita a tocarlos, y un contador muestra las salas descubiertas (0/6). Cada sala abierta pasa a un visto y, al completar las seis, aparece un mensaje de cierre con el resumen de las lecciones. Los círculos se definen en `PINES`, en `contenido.js`.

Al tocar un elemento se abre su sala, con la lección y un dato. Desde la sala del atardecer se entra al paisaje, y desde la de las flores, a la orquídea. Cada toque deja una onda en la obra.

Sin cámara, la obra se mueve al inclinar el celular. Ese es el plan B, junto con el video.

## Archivos

- `index.html`, `app.js`: la página, el modo cámara y el modo sin cámara.
- `obra.js`: arma la obra en 3D (las tres escenas, la tarjeta flotante y el polvo).
- `shaders.js`: los movimientos de cada imagen, con coordenadas en píxeles de la imagen original.
- `contenido.js`: textos de las salas y zonas que se pueden tocar. Es lo que más se edita.
- `imagenes/`: la composición, el paisaje, la orquídea, la tarjeta recortada y dos máscaras de brillo.
- `targets/poster.mind`: el marcador que reconoce la cámara, hecho a partir de `targets/poster.jpg`.
- `video/`: el video de la animación.
- `herramientas/`: servidor local y compilador del marcador. No se publican.
- `version-anterior/`: la primera versión, con capas de prueba. No se publica.

## Si cambia la imagen del póster

El marcador tiene que corresponder exactamente al dibujo impreso. Si cambian la composición:

1. Reemplazar `imagenes/composicion.jpg` y `targets/poster.jpg`.
2. Volver a compilar `targets/poster.mind`.
3. Revisar las coordenadas en `shaders.js` y `contenido.js`.

## Para probar sin el póster impreso

Abre la página en el celular y apunta a la imagen `targets/poster.jpg` en la pantalla de un computador, completa y con buen brillo.
