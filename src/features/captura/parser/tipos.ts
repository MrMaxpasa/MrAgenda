// Tipos del parser de lenguaje natural.
// Alcance Fase 1: fecha, hora y tipo. Recurrencias (Fase 2) y
// personas/cantidades (Fase 4) ampliarán InterpretacionCaptura sin romperla.

import type { TipoItem } from '@/db/tipos';

export type TipoCaptura = Extract<TipoItem, 'evento' | 'tarea' | 'nota' | 'entreno'>;

export interface HoraDetectada {
  hora: number; // 0-23
  minuto: number; // 0-59
}

// Trozo del texto que produjo una detección; alimenta los chips editables
// (quitar un chip = descartar el fragmento) y la limpieza del título.
export interface Fragmento {
  campo: 'fecha' | 'hora';
  texto: string;
  indice: number; // posición en el texto original
}

export interface InterpretacionCaptura {
  tipo: TipoCaptura;
  titulo: string;
  fecha: string | null; // YYYY-MM-DD
  hora: HoraDetectada | null;
  textoOriginal: string;
  fragmentos: Fragmento[];
}
