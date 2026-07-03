# Diaria — agenda inteligente todo-en-uno (nombre provisional)

App móvil (iOS + Android) que sustituye a agenda, tareas, notas, hábitos y deporte
con una sola vista "Hoy" y captura en lenguaje natural interpretada por IA.

## Documentación (leer bajo demanda, no duplicar aquí)
- @docs/01-vision.md — qué es el producto, principios y bloques funcionales
- @docs/02-funcionalidades.md — especificación detallada de la v1 y backlog futuro
- @docs/03-diseno.md — sistema de diseño (tokens, tipografía, UX, tono de textos)
- @docs/04-arquitectura.md — stack, estructura de carpetas, modelo de datos, decisiones técnicas
- @docs/05-roadmap.md — fases con checkboxes; marcar al completar cada tarea
- referencia/hoy-mockup.html — mockup aprobado de la pantalla Hoy (fuente de verdad visual)

## Stack
- React Native + Expo (managed workflow, TypeScript estricto)
- **Expo SDK 54 fijado**: es la versión máxima que soporta el Expo Go del
  dispositivo del usuario (Play Store no ofrece la nueva). No subir de SDK
  hasta antes de publicar (Fase 6), cuando se actualizará a la última versión.
- SQLite local (expo-sqlite) — offline-first, los datos viven en el dispositivo
- expo-notifications para alarmas locales; RRULE (lib `rrule`) para recurrencias
- Zustand para estado; sin backend
- REGLA: la app es 100% gratuita y local. PROHIBIDO añadir APIs de pago,
  servicios cloud o dependencias con coste. La inteligencia de la v1 es un
  parser de reglas + briefing por plantillas, todo en el dispositivo.

## Reglas de trabajo
- IMPORTANTE: ejecutar `npx tsc --noEmit` tras cada cambio de código
- Cambios mínimos: no refactorizar código no relacionado con la tarea
- Un commit por cambio lógico, con mensaje en español descriptivo
- Ante dos enfoques posibles, explicar ambos y dejar que el usuario elija
- No instalar dependencias nuevas sin justificarlo primero
- Textos de la interfaz en español, tono cercano y sin culpa (ver docs/03-diseno.md)
- Toda funcionalidad debe funcionar sin conexión y sin ningún servicio externo
- Al terminar una tarea del roadmap, marcar su checkbox en docs/05-roadmap.md

## Comandos
- `npx expo start --dev-client` — desarrollo con la development build (Android)
- `npx expo start` — desarrollo con Expo Go (sin sonido propio ni hora exacta)
- `npx tsc --noEmit` — comprobación de tipos
- `npm test` — tests (Jest)
- `npx eas-cli build --profile development --platform android` — rehacer la
  dev build (solo hace falta si cambian módulos nativos o app.json). EAS solo
  compila en la nube: la app sigue 100% local y sin red en runtime.
