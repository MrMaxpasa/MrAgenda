# Funcionalidades — especificación v1

## 1. Captura rápida universal
- Botón "+" flotante siempre visible (centro de la barra inferior).
- Abre una hoja inferior con un solo campo de texto.
- El usuario escribe en lenguaje natural: «pádel cada jueves 19h con Marc»,
  «he gastado 12€ en comida», «idea: regalo para Marta un libro de cocina».
- Un parser interpreta y muestra EN TIEMPO REAL qué entiende: tipo (evento/tarea/
  nota/deporte), fecha/hora, recurrencia, alarma. El usuario confirma con un toque.
- **Parser 100% local** (sin servicios externos): motor de reglas en español para
  fechas («mañana», «el jueves», «15 de agosto»), horas («19h», «a las 7 y media»),
  recurrencias («cada martes», «cada domingo durante 2 meses»), tipo (verbos y
  vocabulario: gym/pádel→deporte, comprar/pagar→tarea, reunión/cita→evento,
  cantidad+€→gasto futuro, resto→nota) y personas («con Marc»).
  Debe cubrir con tests las 50+ frases de ejemplo más habituales. Lo que no
  entienda se guarda como nota editable — nunca se pierde una captura.
- Si la interpretación es errónea, corregir debe costar un toque (chips editables).

## 2. Vista "Hoy" (pantalla principal)
- Cabecera: fecha + saludo con nombre.
- Tarjeta de briefing (ver §7).
- Fila de hábitos del día: círculos tocables con racha 🔥, un toque = completado.
- Cronología vertical del día con TODO mezclado y ordenado por hora:
  eventos, tareas con hora, entrenos, cumpleaños, recordatorios. Las tareas sin
  hora se agrupan al final o en bloque "cuando puedas".
- Marcador "AHORA" cruzando la cronología a la hora actual.
- Completar un ítem: animación satisfactoria + háptica ligera. Contador de
  pendientes en la cabecera de sección; al llegar a 0, micro-celebración.
- Deslizar un ítem: posponer (a esta tarde / mañana / elegir fecha).

## 3. Tareas y eventos
- Campos: título, tipo, fecha/hora opcional, duración opcional, recurrencia,
  nivel de aviso, notas adjuntas, etiquetas.
- **Recurrencias** con RRULE completo, pero expresadas al usuario en lenguaje
  natural: «cada martes», «cada domingo durante 2 meses», «el primer lunes del mes»,
  «cada día», «durante 8 veces».
  - Instancias con fin muestran progreso: «domingo 5 de 8».
  - Editar «solo esta» vs «todas las futuras».
  - Si se salta una instancia, la app pregunta sin drama: ¿mover a mañana o dejar pasar?
- **Alarmas**, tres niveles:
  1. Silenciosa — solo aparece en Hoy
  2. Notificación normal
  3. Alarma insistente — sonido tipo despertador, para lo crítico (medicación, salir a una cita)
  - Avisos previos configurables («30 min antes»). Todo con notificaciones locales
    (funcionan sin internet).

## 4. Notas y listas
- Notas rápidas con título opcional; enlazables a fechas, tareas o eventos
  («esta nota es de la reunión del martes»).
- Listas vivas: compra, películas, libros, regalos, deseos. Ítems marcables.
- Sección "Referencia": datos que se buscan 3 veces al año (tallas, matrícula,
  pólizas, wifi). Búsqueda instantánea desde la pestaña Todo.

## 5. Deporte y hábitos
- **Hábitos**: nombre, icono, frecuencia (diario o días concretos), racha con
  **1 comodín semanal** (fallar un día no rompe la racha si queda comodín).
- **Deporte**: rutinas (p. ej. «Torso día 3 de 4»), registro de sesión con
  ejercicios, series, pesos y tiempos; muestra la última marca («última vez:
  press banca 62,5 kg»). El entreno programado aparece como bloque en Hoy.
- Las recurrencias alimentan las rachas automáticamente.

## 6. Pestaña "Tú"
- Rachas activas y récords.
- Progresión deportiva (gráficas simples por ejercicio).
- **Revisión semanal** (domingo): resumen tipo Wrapped en miniatura — tareas
  completadas, entrenos, racha más larga, comparativa con la semana anterior,
  y propuesta de la semana siguiente. Compartible como imagen.
- Índice de consistencia semanal (un %, con tendencia; sin ránkings ni presión).

## 7. Briefing diario (motor local de plantillas)
- Se genera al abrir la app por la mañana, sin conexión ni servicios externos.
- Paso 1 — análisis del día: densidad (tranquilo/normal/cargado), huecos libres,
  pendientes arrastrados, hábito/entreno en riesgo de perder racha, cumpleaños,
  recurrentes de hoy, primera cita del día.
- Paso 2 — composición: banco de plantillas en español (≥6 variantes por
  situación, rotadas para no repetirse) que se rellenan con los datos:
  «Día tranquilo: {n} cosas y tarde libre.» · «Ojo, llevas racha de {r} entrenos
  y hoy tienes hueco de {h1} a {h2}.» · «Hoy es el cumple de {nombre} 🎂».
- Paso 3 — UNA sugerencia accionable como chip, elegida por prioridad:
  racha en riesgo + hueco libre > pendiente arrastrado > preparar la primera cita.
- Tono humano y cercano; nunca culpabiliza. El copy de las plantillas es parte
  del producto: cuidarlo tanto como el diseño (ver docs/03-diseno.md).

## 8. Vuelta sin culpa
- Si el usuario no abre la app en ≥7 días: pantalla de bienvenida que ofrece
  archivar lo vencido de un toque y empezar limpio.

## Backlog (NO en v1 — no implementar, no bloquear)
- Vista mapa mental dinámico de notas/proyectos/tareas relacionadas
- Cierre del día guiado (ánimo + diario 10 segundos)
- Gastos rápidos y suscripciones · Cumpleaños/personas · Metas
- Sincronización nube, Google Calendar, widgets, voz
- Capa IA opcional (solo si algún día se decide, y priorizando opciones
  gratuitas como un modelo pequeño en el propio dispositivo)
