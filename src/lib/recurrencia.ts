// Helpers de rrule. Técnica de «hora flotante»: las fechas locales se
// representan como UTC con los mismos componentes (Date.UTC), se expande
// en UTC y se leen con getUTC*. Así la expansión es inmune a cambios de
// hora y zonas. Las RRULE almacenadas nunca llevan DTSTART ni UNTIL:
// el inicio vive en items.fecha_inicio y los fines se normalizan a COUNT.

import { RRule, type Options, type Weekday } from 'rrule';

/** 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm' → Date UTC flotante. */
export function fechaFlotante(fechaISO: string): Date {
  const [fecha, hora] = fechaISO.split('T');
  const [anio, mes, dia] = fecha!.split('-').map(Number);
  let horas = 0;
  let minutos = 0;
  if (hora) {
    const partes = hora.split(':').map(Number);
    horas = partes[0] ?? 0;
    minutos = partes[1] ?? 0;
  }
  return new Date(Date.UTC(anio!, mes! - 1, dia!, horas, minutos));
}

/** Date UTC flotante → 'YYYY-MM-DD'. */
export function fechaFlotanteAISO(d: Date): string {
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

function reglaCon(rrule: string, fechaInicio: string): RRule {
  const opciones = RRule.parseString(rrule);
  opciones.dtstart = fechaFlotante(fechaInicio);
  return new RRule(opciones);
}

/**
 * Fechas (YYYY-MM-DD) de las instancias entre dos días, ambos incluidos.
 * Nunca materializa infinito: siempre acotado a la ventana.
 */
export function expandirEntre(
  rrule: string,
  fechaInicio: string,
  desde: string,
  hasta: string,
): string[] {
  const regla = reglaCon(rrule, fechaInicio);
  return regla
    .between(fechaFlotante(desde), fechaFlotante(`${hasta}T23:59`), true)
    .map(fechaFlotanteAISO);
}

/** Nº de instancias desde el inicio hasta la fecha dada, ambas incluidas. */
export function contarInstanciasHasta(
  rrule: string,
  fechaInicio: string,
  hasta: string,
): number {
  return expandirEntre(rrule, fechaInicio, fechaInicio.slice(0, 10), hasta).length;
}

/** Total de instancias de una serie con fin (COUNT); null si es infinita. */
export function totalInstancias(rrule: string): number | null {
  const opciones = RRule.parseString(rrule);
  return opciones.count ?? null;
}

/** Normaliza byweekday de rrule (números 0=lunes o Weekday) a números 0-6 (0=lunes). */
export function diasDeRegla(rrule: string): number[] {
  const opciones = RRule.parseString(rrule);
  const crudo = opciones.byweekday;
  if (crudo == null) return [];
  const lista = Array.isArray(crudo) ? crudo : [crudo];
  return lista.map((d) => (typeof d === 'number' ? d : (d as Weekday).weekday)).sort((a, b) => a - b);
}

export function opcionesARrule(opciones: Partial<Options>): string {
  return RRule.optionsToString(opciones).replace(/^RRULE:/, '');
}

/** La misma regla con COUNT=n (para truncar o continuar series). */
export function conCount(rrule: string, n: number): string {
  const opciones = RRule.parseString(rrule);
  opciones.count = n;
  return opcionesARrule(opciones);
}

/**
 * Si la regla es semanal con un único día, lo cambia al día de la fecha
 * dada (posponer «todas las futuras» de un jueves a un viernes convierte
 * la serie en «cada viernes»). Otras reglas vuelven intactas.
 */
export function conDiaDe(rrule: string, fechaISO: string): string {
  const opciones = RRule.parseString(rrule);
  if (opciones.freq !== RRule.WEEKLY || diasDeRegla(rrule).length !== 1) return rrule;
  const diaJS = fechaFlotante(fechaISO).getUTCDay(); // 0=domingo…6=sábado
  const A_RRULE = [6, 0, 1, 2, 3, 4, 5]; // JS → rrule (0=lunes)
  opciones.byweekday = [A_RRULE[diaJS]!];
  return opcionesARrule(opciones);
}

// días JS (0=domingo … 6=sábado) → constantes de día de rrule
const DIA_JS_A_RRULE = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];
// índice de día de rrule (0=lunes … 6=domingo) → día JS (0=domingo)
const RRULE_A_DIA_JS = [1, 2, 3, 4, 5, 6, 0];

export type FrecuenciaSel = 'ninguna' | 'diaria' | 'semanal' | 'mensual';

export interface SeleccionRecurrencia {
  frecuencia: FrecuenciaSel;
  dias: number[]; // días JS (0=domingo … 6=sábado); solo aplica a 'semanal'
  intervalo: number; // cada N (días/semanas/meses); ≥1
  cuenta: number | null; // fin «durante N veces» (COUNT); null = sin fin
}

/** Selección vacía (ítem sin recurrencia). */
export const SIN_RECURRENCIA: SeleccionRecurrencia = {
  frecuencia: 'ninguna',
  dias: [],
  intervalo: 1,
  cuenta: null,
};

/**
 * RRULE + fin serializado desde la selección de chips del editor.
 * `{ rrule: null }` si la frecuencia es 'ninguna'. Semanal sin días marcados
 * usa el día de la semana de `fechaInicioISO`. El fin se normaliza a COUNT
 * («durante N veces»), coherente con el resto del proyecto.
 */
export function rruleDesdeSeleccion(
  sel: SeleccionRecurrencia,
  fechaInicioISO: string,
): { rrule: string | null; fin: string | null } {
  if (sel.frecuencia === 'ninguna') return { rrule: null, fin: null };
  const opciones: Partial<Options> = {};
  if (sel.frecuencia === 'diaria') {
    opciones.freq = RRule.DAILY;
  } else if (sel.frecuencia === 'mensual') {
    opciones.freq = RRule.MONTHLY;
  } else {
    opciones.freq = RRule.WEEKLY;
    const dias = sel.dias.length > 0 ? sel.dias : [fechaFlotante(fechaInicioISO).getUTCDay()];
    opciones.byweekday = [...new Set(dias)]
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // lunes primero
      .map((d) => DIA_JS_A_RRULE[d]!);
  }
  if (sel.intervalo > 1) opciones.interval = sel.intervalo;

  let fin: string | null = null;
  if (sel.cuenta && sel.cuenta > 0) {
    opciones.count = sel.cuenta;
    fin = JSON.stringify({ tipo: 'count', n: sel.cuenta });
  }
  return { rrule: opcionesARrule(opciones), fin };
}

/** Selección de chips que representa una RRULE existente (para precargar el editor). */
export function seleccionDeRrule(rrule: string | null): SeleccionRecurrencia {
  if (!rrule) return { ...SIN_RECURRENCIA };
  const opciones = RRule.parseString(rrule);
  const intervalo = opciones.interval ?? 1;
  const cuenta = opciones.count ?? null;
  if (opciones.freq === RRule.DAILY) return { frecuencia: 'diaria', dias: [], intervalo, cuenta };
  if (opciones.freq === RRule.MONTHLY) return { frecuencia: 'mensual', dias: [], intervalo, cuenta };
  return {
    frecuencia: 'semanal',
    dias: diasDeRegla(rrule).map((d) => RRULE_A_DIA_JS[d]!),
    intervalo,
    cuenta,
  };
}

// nombres en el orden de rrule: 0 = lunes … 6 = domingo
const NOMBRE_DIA_RRULE = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const NOMBRE_MES = [
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

export interface FinSerializado {
  tipo: 'count' | 'until';
  n?: number;
  fecha?: string;
  texto?: string;
}

export function parsearFin(finJson: string | null): FinSerializado | null {
  if (!finJson) return null;
  try {
    return JSON.parse(finJson) as FinSerializado;
  } catch {
    return null;
  }
}

/**
 * La RRULE de vuelta al español: «cada martes», «los lunes y jueves»,
 * «cada domingo durante 2 meses», «cada martes durante 8 veces».
 * Con `conFin: false` se omite el «durante N veces» (cuando ya se muestra
 * el progreso «5 de 8» al lado).
 */
export function descripcionRecurrencia(
  rrule: string,
  finJson: string | null,
  { conFin = true }: { conFin?: boolean } = {},
): string {
  const opciones = RRule.parseString(rrule);
  const intervalo = opciones.interval ?? 1;
  const dias = diasDeRegla(rrule);

  let base: string;
  if (dias.length > 0) {
    const nombres = dias.map((d) => NOMBRE_DIA_RRULE[d]!);
    base =
      nombres.length === 1
        ? `cada ${nombres[0]}`
        : `los ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
    if (intervalo > 1) base = `${base} cada ${intervalo} semanas`;
  } else if (opciones.freq === RRule.DAILY) {
    base = intervalo === 1 ? 'cada día' : `cada ${intervalo} días`;
  } else if (opciones.freq === RRule.WEEKLY) {
    base = intervalo === 1 ? 'cada semana' : `cada ${intervalo} semanas`;
  } else if (opciones.freq === RRule.MONTHLY) {
    base = intervalo === 1 ? 'cada mes' : `cada ${intervalo} meses`;
  } else {
    base = 'recurrente';
  }

  const fin = parsearFin(finJson);
  if (!fin) return base;
  if (fin.tipo === 'until') {
    if (fin.texto) return `${base} ${fin.texto}`;
    if (fin.fecha) {
      const [, mes, dia] = fin.fecha.split('-').map(Number);
      return `${base} hasta el ${dia} de ${NOMBRE_MES[(mes ?? 1) - 1]}`;
    }
    return base;
  }
  return conFin && fin.n ? `${base} durante ${fin.n} veces` : base;
}

export { RRule };
