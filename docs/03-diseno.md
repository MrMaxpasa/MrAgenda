# Sistema de diseño

Fuente de verdad visual: `referencia/hoy-mockup.html` (mockup aprobado por el usuario).
Referencia estética: Things 3 / Apple Fitness. Calma, aire, precisión. Nunca dashboard.

## Tokens de color
| Token     | Hex      | Uso |
|-----------|----------|-----|
| fog       | #EDF0F3  | fondo de pantalla |
| paper     | #FBFCFD  | superficies base |
| card      | #FFFFFF  | tarjetas |
| ink       | #1B2430  | texto principal, botón primario |
| muted     | #78828F  | texto secundario |
| line      | #E3E8ED  | bordes y divisores |
| evento    | #5B7CC4  | acento eventos (azul sereno) |
| deporte   | #3E8E6E  | acento deporte y completado (verde bosque) |
| ambar     | #DE9E38  | alarmas, rachas, marcador AHORA |
| nota      | #8B7BC4  | acento notas/personas |

Regla: el color se usa con intención — un acento sutil por tipo de ítem
(punto de la cronología + hora), nunca fondos saturados ni arcoíris.
Modo oscuro: previsto desde el inicio (definir tokens equivalentes al implementarlo).

## Tipografía
- **Display** (saludos, titulares emotivos): Fraunces, peso ligero, itálica para el
  saludo — aporta el toque editorial/humano.
- **UI y cuerpo**: Outfit (o Inter como alternativa), pesos 340–600.
- Jerarquía contenida: eyebrow 12.5px mayúsculas con tracking / título 15px /
  meta 12.5px. Nada de más de 3 tamaños por pantalla.

## Componentes clave (ver mockup)
- **Tarjeta briefing**: fondo oscuro degradado (#1E2A38→#27384A), texto claro,
  destacado en ámbar suave, chip de acción con borde translúcido.
- **Cronología**: línea vertical fina a la izquierda, punto de color por tipo,
  marcador «AHORA» ámbar punteado cruzando.
- **Tarjeta de ítem**: hora en color del tipo + título + meta + círculo de check.
- **Hábitos**: tarjetitas cuadradas con emoji, nombre y racha; activo = fondo
  verde muy suave.
- **FAB "+"**: círculo tinta, centro de la barra inferior, rota al pulsar.
- **Hoja de captura**: sube desde abajo, un campo, interpretación en vivo con
  chips (pills) editables.

## Movimiento
- Micro-animaciones cortas y satisfactorias: check con escala + háptica ligera,
  toast superior, celebración discreta al completar el día.
- Respetar `reduced motion` del sistema. Menos es más: sin parallax ni confeti
  permanente.

## Tono de los textos (tan importante como el color)
- Español, cercano, verbos activos, frases cortas. Sentence case.
- La app habla como un buen asistente humano: «Tienes hueco de 17 a 19, ¿lo
  aprovechas para el gym?» — nunca como un robot ni como un jefe.
- **Prohibido el tono culpabilizador**: nada de «¡Has fallado!», «34 tareas
  vencidas». Los errores y vacíos orientan: qué pasó y qué hacer.
- Estados vacíos = invitación a actuar («Toca + y escribe lo primero que tengas
  en la cabeza»).
