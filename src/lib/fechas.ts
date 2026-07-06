// Fechas en español, sin depender de Intl (determinista y testeable).

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** «jueves · 2 de julio» — el eyebrow de la cabecera de Hoy. */
export function formatearFechaLarga(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} · ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** «jueves», «sábado»… en minúsculas. */
export function nombreDiaSemana(fecha: Date): string {
  return DIAS[fecha.getDay()]!;
}

/** 'YYYY-MM-DD' en hora local (sin depender de toISOString/UTC). */
export function aFechaISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Nueva fecha desplazada n días (n puede ser negativo). */
export function sumarDias(fecha: Date, n: number): Date {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + n);
  return nueva;
}

/** Saludo según la hora, con el nombre si lo hay: «Buenos días, Max». */
export function saludoSegunHora(fecha: Date, nombre?: string | null): string {
  const hora = fecha.getHours();
  const base =
    hora < 6 ? 'Buenas noches' : hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
  return nombre && nombre.trim() ? `${base}, ${nombre.trim()}` : base;
}
