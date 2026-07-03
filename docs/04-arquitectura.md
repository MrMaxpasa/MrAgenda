# Arquitectura técnica

## Stack (decidido)
- **React Native + Expo** (managed workflow) · TypeScript estricto
- **expo-router** para navegación (3 pestañas: Hoy / Todo / Tú)
- **expo-sqlite** con una capa fina de repositorios — offline-first total
- **Zustand** para estado en memoria (ligado a los repositorios)
- **rrule** (npm) para recurrencias; **expo-notifications** para alarmas locales
- **Cero servicios externos**: sin APIs, sin cloud, sin analítica de terceros.
  Todo el software y las dependencias deben ser gratuitas y de código abierto.
- Tests: Jest + React Native Testing Library. Testear siempre: parser de
  lenguaje natural, motor de briefing, expansión de recurrencias, rachas.

## Estructura de carpetas
```
src/
├── app/                  # rutas expo-router (tabs: hoy, todo, tu; modales)
├── components/           # UI reutilizable (ItemCard, HabitChip, Timeline, Sheet…)
├── features/
│   ├── captura/          # hoja de captura + parser de lenguaje natural
│   ├── hoy/              # composición de la vista Hoy
│   ├── items/            # CRUD de items, recurrencias, alarmas
│   ├── habitos/          # hábitos, rachas, comodines
│   ├── deporte/          # rutinas y sesiones
│   ├── notas/            # notas, listas, referencia
│   └── briefing/         # análisis del día + banco de plantillas + composición
├── db/                   # esquema SQLite, migraciones, repositorios
├── lib/                  # rrule helpers, fechas, notificaciones
└── theme/                # tokens de docs/03-diseno.md
```

## Modelo de datos (SQLite)
Principio: **una tabla central `items` polimórfica + relaciones**, porque la vista
Hoy mezcla tipos y el futuro mapa mental necesita un grafo.

```sql
items(
  id TEXT PK, tipo TEXT,           -- 'evento'|'tarea'|'nota'|'habito'|'entreno'|'lista'|'referencia'
  titulo TEXT, cuerpo TEXT,
  fecha_inicio TEXT, fecha_fin TEXT,  -- ISO, nullable (notas sin fecha)
  todo_el_dia INTEGER,
  rrule TEXT,                      -- regla de recurrencia, nullable
  rrule_fin TEXT,                  -- 'until' o 'count' serializado para mostrar "5 de 8"
  nivel_aviso INTEGER,             -- 0 silencioso | 1 notificación | 2 alarma insistente
  aviso_offset_min INTEGER,
  estado TEXT,                     -- 'pendiente'|'hecho'|'archivado'
  creado_en TEXT, actualizado_en TEXT
)
item_excepciones(item_id, fecha_original, accion, nueva_fecha)  -- "solo esta" en recurrentes
completados(id PK, item_id, fecha, hecho_en)                    -- log por instancia (rachas)
enlaces(origen_id, destino_id, tipo)   -- grafo: nota↔evento, tarea↔proyecto → futuro mapa mental
habitos_config(item_id PK, icono, dias TEXT, comodines_usados_semana INTEGER)
sesiones_deporte(id PK, item_id, fecha, ejercicios_json)        -- series/pesos/tiempos
ajustes(clave PK, valor)
```

## Decisiones clave
- **Recurrencias**: guardar la RRULE canónica; expandir instancias bajo demanda
  para la ventana visible (hoy ± 60 días). Nunca materializar infinito.
- **Notificaciones**: programar localmente la ventana de próximos 14 días con
  presupuesto ≤60 (iOS corta en 64 pendientes) y reprogramar al abrir la app y
  tras cada escritura (componente `Notificador`, debounce 1,2 s). Alarma
  insistente = canal Android `alarmas` (importancia MAX, sonido propio
  `alarma.wav`, vibración, stream de alarma) + `interruptionLevel:
  timeSensitive` en iOS + ráfaga de recordatorios (+2 y +5 min) que se cancela
  sola al reprogramar. Ver «Notificaciones: límites reales» más abajo.
- **Parser de lenguaje natural**: motor de reglas propio en español (funciones
  puras: `extraerFecha`, `extraerHora`, `extraerRecurrencia`, `clasificarTipo`),
  desarrollado con una suite de tests de frases reales que crece con el uso.
  Es el componente más testeado del proyecto.
- **Briefing**: motor local de plantillas — análisis del día (funciones puras
  sobre los datos) + banco de plantillas rotadas + selector de sugerencia por
  prioridad. Caché diaria en `ajustes`. Ver docs/02-funcionalidades.md §7.
- **Rachas**: se calculan desde `completados` + `habitos_config` (comodín semanal).
  Función pura y testeada.
- **Privacidad total**: los datos nunca salen del dispositivo. No hay red.

## Notificaciones: límites reales (investigado julio 2026, SDK 54)

**Por esto existe la development build** (decisión de Fase 2; se construye con
EAS, que solo compila — la app sigue 100 % local y sin red en runtime):

| Capacidad | Expo Go | Dev build (la nuestra) |
|---|---|---|
| Notificaciones locales programadas | ✅ | ✅ |
| Sonido propio (`alarma.wav`) | ❌ siempre suena el del sistema | ✅ vía config plugin |
| Hora exacta en Android 12+ | ❌ puede retrasarse (Doze) | ✅ permisos `USE_EXACT_ALARM` + `SCHEDULE_EXACT_ALARM` en el manifest |
| iOS `timeSensitive` (rompe modos de concentración) | ❌ se degrada a normal | ✅ con el entitlement (cuando haya build de iOS) |
| iOS critical alerts (saltarse silencio/DND) | ❌ | ❌ entitlement restringido que Apple concede bajo solicitud — descartado |

Otras reglas duras del sistema:
- Android 8+: sin canal de notificación creado, las notificaciones se
  descartan **en silencio**. Los canales (`avisos`, `alarmas`) se crean al
  arrancar, antes de programar nada.
- Ni Android ni iOS repiten el sonido de una notificación ya mostrada: la
  «insistencia» se aproxima con la ráfaga (+2 y +5 min tras la hora), que
  desaparece al completar el ítem o abrir la app (reprogramación total).
- iOS: máximo 64 notificaciones locales pendientes por app (presupuesto 60).
- La build de iOS requiere cuenta de Apple Developer (de pago): pendiente
  hasta Fase 6; los entitlements necesarios quedan documentados aquí.

## Rendimiento y calidad
- La vista Hoy debe abrir en <1 s en un móvil medio: consultas indexadas por fecha.
- `npx tsc --noEmit` tras cada cambio. Sin `any`.
- Accesibilidad básica desde el inicio: labels, tamaños táctiles ≥44px,
  contraste AA, `reduced motion`.
