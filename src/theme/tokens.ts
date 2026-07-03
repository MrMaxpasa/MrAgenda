// Tokens del sistema de diseño — fuente de verdad: docs/03-diseno.md
// y referencia/hoy-mockup.html (mockup aprobado).

export const colores = {
  claro: {
    fog: '#EDF0F3', // fondo de pantalla
    paper: '#FBFCFD', // superficies base
    card: '#FFFFFF', // tarjetas
    ink: '#1B2430', // texto principal, botón primario
    muted: '#78828F', // texto secundario
    line: '#E3E8ED', // bordes y divisores
    evento: '#5B7CC4', // acento eventos (azul sereno)
    deporte: '#3E8E6E', // acento deporte y completado (verde bosque)
    ambar: '#DE9E38', // alarmas, rachas, marcador AHORA
    nota: '#8B7BC4', // acento notas/personas
    done: '#AEB8C2', // texto de ítems completados
  },
  // Modo oscuro: previsto en Fase 5; definir aquí los tokens equivalentes.
} as const;

export type Colores = typeof colores.claro;

// Alias mientras solo existe el modo claro.
export const paleta: Colores = colores.claro;

export const radios = {
  tarjeta: 18,
  habito: 16,
  campo: 14,
  hoja: 26,
  pill: 999,
} as const;

export const espaciado = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 26,
} as const;

// Jerarquía contenida: máximo 3 tamaños por pantalla (docs/03-diseno.md).
export const tipografia = {
  eyebrow: 12.5,
  titulo: 15,
  meta: 12.5,
  saludo: 31,
  nav: 12,
  // letterSpacing en RN es en px: 0.14em sobre 12.5px ≈ 1.75
  trackingEyebrow: 1.75,
} as const;
