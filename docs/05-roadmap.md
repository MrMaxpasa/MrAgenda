# Roadmap

Instrucciones: trabajar por fases y en orden. Marcar cada checkbox al completar.
Al final de cada fase: `npx tsc --noEmit` limpio, tests pasando, y probar en Expo Go.
No empezar una fase sin cerrar la anterior (o anotar explícitamente qué queda y por qué).

## Fase 0 — Esqueleto (1 sesión)
- [x] Crear proyecto Expo con TypeScript estricto y expo-router
- [x] Estructura de carpetas según docs/04-arquitectura.md
- [x] Tema con tokens de docs/03-diseno.md (colores, tipografías Fraunces/Outfit, espaciado)
- [x] Navegación de 4 destinos (Hoy / Todo / Tú / Ajustes) + FAB central (decisión: como el mockup)
- [x] Esquema SQLite inicial + capa de repositorios + migraciones

## Fase 1 — El corazón: Hoy + captura (el MVP usable)
- [x] CRUD de items (evento/tarea/nota) en repositorios, con tests
- [x] Vista Hoy: cronología del día mezclando tipos, marcador AHORA, contador de pendientes
- [x] Swipe horizontal entre días (±30 desde hoy; ampliado desde ±7 el 4/7/2026):
      cabecera con la fecha del día visible, tocarla vuelve a hoy; AHORA solo
      en el día actual (el briefing, también solo-hoy, llega en Fase 4)
- [x] Completar ítem con animación + háptica; deslizar para posponer
- [x] Hoja de captura con campo único
- [x] Parser LOCAL de lenguaje natural en español (fechas, horas, tipo) + tests exhaustivos
- [x] Interpretación en vivo con chips editables antes de guardar
- [x] Probar el flujo completo: capturar → aparece en Hoy → completar
      (verificado por el usuario en la dev build durante las pruebas de Fase 2)

## Fase 2 — Recurrencias y alarmas
- [x] Integrar rrule: parser local entiende «cada martes», «cada domingo durante 2 meses», etc.
- [x] Expansión de instancias por ventana + excepciones («solo esta» / «todas las futuras»)
- [x] Progreso en recurrentes con fin («5 de 8»)
- [x] Notificaciones locales: 3 niveles de aviso + avisos previos + reprogramación al abrir/editar
      (alarma insistente completa vía development build de Android; límites en docs/04)
- [x] Flujo «te saltaste una instancia»: mover o dejar pasar, sin drama
- [x] Tests de expansión de recurrencias y programación de avisos
- [x] Prueba manual en la dev build del usuario: los 3 casos de recurrencia
      verificados en el dispositivo (4/7/2026) tras limpiar la caché de Metro

## Fase 3 — Hábitos y deporte
- [x] Hábitos: creación, días activos, fila en Hoy, toggle con háptica
- [x] Rachas con comodín semanal (función pura testeada; la racha se deriva del
      historial de completados — comodines_usados_semana queda sin uso)
- [x] Rutinas de deporte y registro de sesiones (ejercicios, series, pesos)
- [x] «Última marca» visible en el bloque de entreno de Hoy
- [x] Pestaña Tú v1: selector de periodo Hoy/Semana/Mes arriba; rachas activas,
      récords, completadas y entrenos calculados según el periodo
- [x] Prueba manual del usuario en la dev build (5/7/2026): rachas con comodín,
      sesión con última marca y periodos de Tú verificados

## Fase 4 — Inteligencia local (briefing + parser avanzado)
- [x] Análisis del día: densidad, huecos libres, pendientes arrastrados, rachas
      en riesgo, cumpleaños (funciones puras testeadas; cumpleaños por
      heurística del título hasta el bloque Personas)
- [x] Banco de plantillas de briefing en español (≥6 variantes por situación,
      rotación para no repetir) + composición final (copy aprobado 5/7/2026)
- [x] Selector de sugerencia accionable por prioridad + chip en la tarjeta
      (con acciones reales: reservar hueco / traer arrastrados / preparar cita)
- [x] Tarjeta de briefing en Hoy con caché diaria (texto cacheado en ajustes;
      la sugerencia se revalida y desaparece al usarse)
- [x] Ampliar el parser: personas («con Marc»), cantidades («12€»), listas
      («añade pan a la compra») + 50 frases nuevas en la suite de tests
- [x] Prueba manual del usuario en la dev build (5/7/2026): briefing coherente,
      chip con acción real que se retira, chips nuevos del parser y caché
      del texto al reabrir — todo verificado

## Fase 5 — Notas, Todo y retención
- [x] Notas y listas vivas; enlaces nota↔evento/tarea (tabla `enlaces`; las
      listas se agrupan con contenedora + elementos, migración v2 del legado)
- [x] Pestaña Todo completa: sección superior «Próximos 7 días» (pendientes con
      fecha agrupados por día), buscador global y categorías (Tareas —sin fecha
      y vencidas—, Notas, Listas, Referencia, Historial); alta de referencias
      con hoja y prefijo «ref:»
- [x] Archivar desde la interfaz: swipe del ítem (junto a Posponer), long-press
      en hábito, botón en el detalle de nota y × en elementos de lista
- [x] Revisión semanal en Tú (resumen + comparativa + compartible como imagen
      con view-shot + expo-sharing)
- [x] Vuelta sin culpa (≥7 días fuera → archivar de un toque)
- [x] Celebración al completar el día · índice de consistencia según periodo (Hoy/Semana/Mes)
- [x] Modo oscuro (sistema + selector Automático/Claro/Oscuro en Ajustes)
- [x] Briefing en voz alta: botón 🔊 con expo-speech (voz del sistema en
      español, local y gratuita); tocar de nuevo detiene
- [x] Prueba manual del usuario en la nueva dev build (6/7/2026): Tareas en
      Todo, archivado desde Hoy y hábitos, buscador, lista de la compra
      agrupada, 🔊, modo oscuro y Próximos 7 días — todo verificado

## Fase 6 — Pulido y salida
- [x] Onboarding de 3 pantallas (nombre, primer hábito, primera captura)
- [x] Edición completa de un ítem guardado (título/fecha/hora/aviso; en series
      solo título/aviso — la fecha/hora las gobierna la RRULE)
- [x] Edición universal (evolución de la anterior): tocar cualquier ítem en Hoy,
      Todo o el panel de Tú abre una única pieza de edición (tienda-editor +
      CapaEditor). Añade recurrencia editable (chips + selector de días) y botón
      «Eliminar» que archiva con toast + deshacer. En series, editar
      fecha/hora/recurrencia reutiliza dividirSerie/crearExcepcion/MenuAlcance
      (solo esta vs todas; cambiar la regla divide desde hoy conservando el
      historial). Long-press en un hábito edita nombre/icono/días y archiva
      conservando récord. Tests en items/__tests__/edicion.test.ts
- [x] Revisión de accesibilidad y rendimiento (Hoy <1 s medido: ~90 ms la
      consulta con histórico grande; ver docs/04)
- [x] Iconos y splash propios «sol sobre línea» (generados por script Node)
- [x] Build de salida con EAS: perfil `production` (APK directo)
- [x] Reorganización de la pestaña Todo (13/7/2026): sección «Rutinas» (cada
      serie una sola vez, con patrón, próxima ocurrencia y progreso «5 de 8»;
      las recurrentes se omiten de «Próximos 7 días»), ventana hoy→+6 con
      etiquetas «Hoy»/«Mañana», chips con contador, vencidas arriba en Tareas,
      buscador arriba con resultados agrupados por tipo. Funciones puras en
      features/todo/rutinas.ts (tests) y una sola consulta para los próximos
      días (antes 7 × listarInstanciasPorFecha)
- [ ] Prueba manual del usuario en el APK production: onboarding con nombre,
      editar un ítem, icono/splash nuevos, Hoy abre al instante

## Futuro (no tocar sin decisión explícita del usuario)
- Vista mapa mental (el modelo `enlaces` ya lo prepara) · cierre del día ·
  gastos y suscripciones · personas/cumpleaños · metas · sync nube · widgets · voz
- Capa IA opcional solo con soluciones gratuitas (p. ej. modelo pequeño en el
  propio dispositivo); nunca introducir servicios de pago
