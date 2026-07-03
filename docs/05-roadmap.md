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
- [x] Swipe horizontal entre días (±7 desde hoy): cabecera con la fecha del día
      visible, tocarla vuelve a hoy; AHORA solo en el día actual (el briefing,
      también solo-hoy, llega en Fase 4)
- [x] Completar ítem con animación + háptica; deslizar para posponer
- [x] Hoja de captura con campo único
- [x] Parser LOCAL de lenguaje natural en español (fechas, horas, tipo) + tests exhaustivos
- [x] Interpretación en vivo con chips editables antes de guardar
- [ ] Probar el flujo completo: capturar → aparece en Hoy → completar
      (pendiente de prueba del usuario en Expo Go en dispositivo físico)

## Fase 2 — Recurrencias y alarmas
- [ ] Integrar rrule: parser local entiende «cada martes», «cada domingo durante 2 meses», etc.
- [ ] Expansión de instancias por ventana + excepciones («solo esta» / «todas las futuras»)
- [ ] Progreso en recurrentes con fin («5 de 8»)
- [ ] Notificaciones locales: 3 niveles de aviso + avisos previos + reprogramación al abrir/editar
- [ ] Flujo «te saltaste una instancia»: mover o dejar pasar, sin drama
- [ ] Tests de expansión de recurrencias y programación de avisos

## Fase 3 — Hábitos y deporte
- [ ] Hábitos: creación, días activos, fila en Hoy, toggle con háptica
- [ ] Rachas con comodín semanal (función pura testeada)
- [ ] Rutinas de deporte y registro de sesiones (ejercicios, series, pesos)
- [ ] «Última marca» visible en el bloque de entreno de Hoy
- [ ] Pestaña Tú v1: selector de periodo Hoy/Semana/Mes arriba; rachas activas,
      récords, completadas y entrenos calculados según el periodo

## Fase 4 — Inteligencia local (briefing + parser avanzado)
- [ ] Análisis del día: densidad, huecos libres, pendientes arrastrados, rachas
      en riesgo, cumpleaños (funciones puras testeadas)
- [ ] Banco de plantillas de briefing en español (≥6 variantes por situación,
      rotación para no repetir) + composición final
- [ ] Selector de sugerencia accionable por prioridad + chip en la tarjeta
- [ ] Tarjeta de briefing en Hoy con caché diaria
- [ ] Ampliar el parser: personas («con Marc»), cantidades («12€»), listas
      («añade pan a la compra») + 50 frases nuevas en la suite de tests

## Fase 5 — Notas, Todo y retención
- [ ] Notas y listas vivas; enlaces nota↔evento/tarea (tabla `enlaces`)
- [ ] Pestaña Todo completa: sección superior «Próximos 7 días» (pendientes con
      fecha agrupados por día), buscador global y categorías (Notas, Listas,
      Referencia, Historial)
- [ ] Revisión semanal en Tú (resumen + comparativa + compartible)
- [ ] Vuelta sin culpa (≥7 días fuera → archivar de un toque)
- [ ] Celebración al completar el día · índice de consistencia según periodo (Hoy/Semana/Mes)
- [ ] Modo oscuro

## Fase 6 — Pulido y salida
- [ ] Onboarding de 3 pantallas (nombre, primer hábito, primera captura)
- [ ] Revisión de accesibilidad y rendimiento (Hoy <1 s)
- [ ] Iconos, splash, build con EAS para TestFlight / Play interno

## Futuro (no tocar sin decisión explícita del usuario)
- Vista mapa mental (el modelo `enlaces` ya lo prepara) · cierre del día ·
  gastos y suscripciones · personas/cumpleaños · metas · sync nube · widgets · voz
- Capa IA opcional solo con soluciones gratuitas (p. ej. modelo pequeño en el
  propio dispositivo); nunca introducir servicios de pago
