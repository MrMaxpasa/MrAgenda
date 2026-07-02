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
- **Notificaciones**: programar localmente las próximas N instancias (p. ej. 30 días)
  y reprogramar al abrir la app y al editar. Alarma insistente = canal Android de
  máxima prioridad con sonido propio / notificación crítica-like en iOS dentro de
  lo que permita Expo (documentar límites reales al implementarlo).
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

## Rendimiento y calidad
- La vista Hoy debe abrir en <1 s en un móvil medio: consultas indexadas por fecha.
- `npx tsc --noEmit` tras cada cambio. Sin `any`.
- Accesibilidad básica desde el inicio: labels, tamaños táctiles ≥44px,
  contraste AA, `reduced motion`.
