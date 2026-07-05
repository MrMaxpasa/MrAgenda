// Tipos del parser de lenguaje natural.
// Alcance Fase 1: fecha, hora y tipo. Recurrencias (Fase 2) y
// personas/cantidades (Fase 4) ampliarán InterpretacionCaptura sin romperla.

import type { TipoItem } from '@/db/tipos';

export type TipoCaptura = Extract<TipoItem, 'evento' | 'tarea' | 'nota' | 'entreno' | 'referencia'>;

export interface HoraDetectada {
  hora: number; // 0-23
  minuto: number; // 0-59
}

// Trozo del texto que produjo una detección; alimenta los chips editables
// (quitar un chip = descartar el fragmento) y la limpieza del título.
export interface Fragmento {
  campo: 'fecha' | 'hora' | 'recurrencia' | 'personas' | 'cantidad' | 'lista';
  texto: string;
  indice: number; // posición en el texto original
}

export interface RecurrenciaInterpretada {
  rrule: string; // canónica, sin DTSTART y con fines normalizados a COUNT
  fin: string | null; // JSON: {"tipo":"count","n":8} | {"tipo":"until","fecha":"…","texto":"durante 2 meses"}
  descripcion: string; // «cada martes», «los lunes y jueves»…
}

export interface InterpretacionCaptura {
  tipo: TipoCaptura;
  titulo: string;
  fecha: string | null; // YYYY-MM-DD
  hora: HoraDetectada | null;
  recurrencia: RecurrenciaInterpretada | null;
  personas: string[]; // «con Marc y Ana» → ['Marc', 'Ana']
  cantidad: number | null; // «12,50€» → 12.5
  lista: { elemento: string; lista: string } | null; // «añade pan a la compra»
  textoOriginal: string;
  fragmentos: Fragmento[];
}
