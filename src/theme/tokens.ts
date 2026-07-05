// Tokens del sistema de diseño — fuente de verdad: docs/03-diseno.md
// y referencia/hoy-mockup.html (mockup aprobado).

export const colores = {
  claro: {
    fog: '#EDF0F3', // fondo de pantalla
    paper: '#FBFCFD', // superficies base
    card: '#FFFFFF', // tarjetas
    ink: '#1B2430', // texto principal, botón primario
    sobreInk: '#FFFFFF', // texto sobre superficies de tinta
    muted: '#78828F', // texto secundario
    line: '#E3E8ED', // bordes y divisores
    evento: '#5B7CC4', // acento eventos (azul sereno)
    deporte: '#3E8E6E', // acento deporte y completado (verde bosque)
    deporteSuave: '#EFF6F2', // fondo de hábito activo
    deporteSuaveBorde: '#BDDCCB',
    ambar: '#DE9E38', // alarmas, rachas, marcador AHORA
    nota: '#8B7BC4', // acento notas/personas
    done: '#AEB8C2', // texto de ítems completados
    panelSuave: '#F2F6FA', // panel de interpretación de la captura
    chipSuave: '#E7EEF7', // chips de interpretación
  },
  oscuro: {
    fog: '#10151C',
    paper: '#151B23',
    card: '#1C242E',
    ink: '#E8EDF2',
    sobreInk: '#10151C',
    muted: '#8C97A5',
    line: '#2A3440',
    evento: '#7B95D6',
    deporte: '#5BA98A',
    deporteSuave: '#1B2B24',
    deporteSuaveBorde: '#2E4A3C',
    ambar: '#E5AE55',
    nota: '#A392D8',
    done: '#5A6470',
    panelSuave: '#1B2530',
    chipSuave: '#223041',
  },
} as const;

export type Colores = (typeof colores)['claro'] | (typeof colores)['oscuro'];

// Paleta estática de arranque (splash y valores por defecto): el resto de
// la app usa usePaleta() de theme/use-tema.ts, que sigue tema y ajuste.
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
