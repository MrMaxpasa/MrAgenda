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
- **Independiente del orden de las palabras**: cada entidad (fecha, hora,
  recurrencia, tipo, persona) se extrae por separado escaneando toda la frase,
  así «martes gym 19h», «gym el martes a las 19» y «a las 19 el martes, gym»
  dan lo mismo. El título se reconstruye con los tokens de núcleo (sin las
  entidades ni conectores huérfanos): «con Marta cena» → «Cena», «cena con
  Marta» → «Cena con Marta» (la persona nunca se pierde, sigue en su chip).
- **Regla de horas AM/PM (única y coherente)**: una hora de 1 a 6 sin marcador
  se entiende **de la tarde**, se escriba como se escriba («5», «5h», «a las 5»,
  «5:30», «6:00» → 17:00/17:30/18:00); para la madrugada se fuerza con «de la
  mañana» («6h de la mañana» → 06:00). Las 7 a 23 y las 0 van literales.
- **Regla: una nota nunca lleva hora.** Algo que ocurre a una hora concreta es
  otra cosa. Si el parser clasificaría como nota y detecta hora, **cambia el
  tipo** y el chip lo muestra antes de guardar (corregible de un toque):
  - con **día explícito** en el texto (fecha o recurrencia) → **evento**:
    «peli el sábado a las 21», «ensayo cada martes a las 19»;
  - **solo con hora** (el día lo deriva la app: hoy o mañana) → **tarea**:
    «pastilla a las 8» — algo que hacer a esa hora, y una tarea se completa y
    se pospone.
  Con **prefijo explícito** («nota:», «idea:», «ref:») manda el usuario: sigue
  siendo nota (o referencia) y es la **hora la que se descarta**, quedándose
  dentro del título — «idea: llamar a Marta a las 5» → nota «Llamar a Marta a
  las 5». Nunca se pierde nada de lo escrito.

## 2. Vista "Hoy" (pantalla principal)
- Cabecera: fecha + saludo con nombre. Muestra siempre la fecha del día que se
  está viendo; tocarla vuelve al día de hoy.
- **Navegación por swipe horizontal entre días**: rango ±30 días desde hoy
  (páginas perezosas: solo se montan las visibles, y volver a hoy es
  instantáneo tocando la fecha).
- Tarjeta de briefing (ver §7) — solo aparece en el día actual.
- Fila de hábitos del día: círculos tocables con racha 🔥, un toque = completado.
- Cronología vertical del día con TODO mezclado y ordenado por hora:
  eventos, tareas con hora, entrenos, cumpleaños, recordatorios. Las tareas sin
  hora se agrupan al final o en bloque "cuando puedas".
- Marcador "AHORA" cruzando la cronología a la hora actual — solo en el día actual.
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
- **Una nota no lleva hora** (regla del modelo, ver §1): puede tener día —se
  guarda como día completo—, pero no hora. En el editor universal el campo de
  hora no se ofrece cuando el tipo es Nota; cambiar el tipo a Nota limpia la
  hora con la pista «Las notas no llevan hora. Si la necesitas, hazla Evento o
  Tarea». La conversión siempre es un toque explícito del usuario, nunca una
  mutación silenciosa. Las notas con hora del legado se convirtieron en tareas
  (migración v3), conservando día, hora y aviso.
- Listas vivas: compra, películas, libros, regalos, deseos. Ítems marcables.
- Sección "Referencia": datos que se buscan 3 veces al año (tallas, matrícula,
  pólizas, wifi). Búsqueda instantánea desde la pestaña Todo.
- **Estructura de la pestaña Todo**: buscador global arriba (resultados
  agrupados por tipo). Debajo, «Próximos 7 días» — lo pendiente de hoy y los 6
  días siguientes, agrupado por día («Hoy», «Mañana», «jueves 17»; los días sin
  nada no aparecen). Debajo, categorías en chips con contador (Rutinas · 3,
  Tareas · 4, Listas, Notas, Referencia, Historial).
- **Regla anti-ruido de las recurrentes**, por **frecuencia** (no por si tienen
  fin): las series **diarias** («cada día», «cada noche») se omiten de «Próximos
  7 días» —saldrían los 7 días— y viven solo en Rutinas. Las **no diarias**
  («cada jueves», «los lunes y jueves», «cada 2 semanas») sí aparecen, cada una
  en su día, con su hora y su progreso si tienen fin («Pádel · 12:00 · 2 de 3»):
  salen 1-2 veces por semana, y eso no es ruido, es la semana real.
- **«Rutinas»**: todas las series, cada una UNA sola vez, con su patrón en
  español y su próxima ocurrencia («colada · cada martes · próxima: martes 14»);
  las que tienen fin muestran su progreso («5 de 8») y, al agotarse, quedan al
  final marcadas como «completada» en vez de desaparecer en silencio. Tocar una
  abre la edición universal.
- «Tareas» recoge lo pendiente sin fecha y lo vencido —las vencidas arriba, la
  más antigua primero, con su «te esperaba el…»—: ninguna captura queda sin una
  vista que la muestre.

## 5. Deporte y hábitos
- **Hábitos**: nombre, icono, frecuencia (diario o días concretos), racha con
  **1 comodín semanal** (fallar un día no rompe la racha si queda comodín).
- **Deporte**: rutinas (p. ej. «Torso día 3 de 4»), registro de sesión con
  ejercicios, series, pesos y tiempos; muestra la última marca («última vez:
  press banca 62,5 kg»). El entreno programado aparece como bloque en Hoy.
- Las recurrencias alimentan las rachas automáticamente.

## 6. Pestaña "Tú"
- **Selector de periodo arriba (Hoy / Semana / Mes)**: las estadísticas
  —completadas, entrenos, rachas, consistencia— se calculan según el periodo
  elegido.
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
- **Lectura en voz alta**: botón 🔊 en la tarjeta lee el briefing con la voz
  del sistema en español (expo-speech, gratis y 100% local); tocar de nuevo
  detiene la lectura.

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
