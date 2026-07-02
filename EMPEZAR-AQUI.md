# Cómo usar este kit con Claude Code

## 1. Prepara la carpeta del proyecto
```bash
mkdir mi-agenda && cd mi-agenda
# copia aquí el contenido de este kit:
#   CLAUDE.md  docs/  referencia/
git init
claude
```

## 2. Primer prompt (cópialo tal cual en Claude Code)
```
Lee CLAUDE.md y toda la carpeta docs/ (01 a 05) y el mockup referencia/hoy-mockup.html.
Es la especificación completa de la app que vamos a construir.

Cuando lo tengas claro:
1. Resúmeme en 5 líneas qué vamos a construir, para confirmar que lo has entendido.
2. Dime si ves alguna contradicción o decisión que falte por tomar.
3. Entra en modo plan y propón el plan detallado de la Fase 0 del roadmap.

No escribas código todavía: primero el plan, yo lo apruebo y luego ejecutas.
```

## 3. Ritmo de trabajo recomendado
- **Una fase (o media) por sesión.** Al acabar cada bloque: pide que ejecute
  `npx tsc --noEmit`, corra los tests, marque los checkboxes en docs/05-roadmap.md
  y haga commit.
- **Plan mode para lo gordo** (Shift+Tab en Claude Code): cualquier cosa que toque
  el modelo de datos o muchas pantallas, primero plan, luego código.
- **`/clear` entre tareas distintas** para no arrastrar contexto viejo; el CLAUDE.md
  y los docs se recargan solos.
- Si Claude Code propone desviarse de la spec, que lo justifique y decide tú:
  los docs son la fuente de verdad, pero se pueden actualizar (pídele que edite
  el doc correspondiente cuando cambiéis algo, así nunca quedan desfasados).
- Prueba en tu móvil con **Expo Go** desde la Fase 0: `npx expo start` y escanea el QR.

## 4. Qué hay en cada archivo
- `CLAUDE.md` — memoria permanente: reglas, stack y comandos. Corto a propósito.
- `docs/01-vision.md` — el porqué y los principios del producto
- `docs/02-funcionalidades.md` — la spec detallada de la v1 y el backlog
- `docs/03-diseno.md` — colores, tipografía, componentes y tono de textos
- `docs/04-arquitectura.md` — stack, carpetas, modelo de datos y decisiones
- `docs/05-roadmap.md` — las fases con checkboxes que Claude Code irá marcando
- `referencia/hoy-mockup.html` — el mockup aprobado (fuente de verdad visual)

## 5. Coste del proyecto: cero
La app es 100% local y gratuita: sin APIs de pago, sin servicios cloud, sin
suscripciones. Todo el stack (Expo, SQLite, rrule, notificaciones) es open
source. La "inteligencia" (parser de lenguaje natural y briefing diario) se
ejecuta en el propio móvil con motores de reglas y plantillas.
