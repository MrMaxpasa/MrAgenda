// Clasificación del tipo de captura por vocabulario (docs/02 §1).
// Prioridad: verbos de tarea claros > cantidades con € (gasto → nota en v1)
// > deporte > evento > tareas genéricas > nota. El orden resuelve conflictos
// reales: «comprar raqueta de pádel» es tarea, «hacer yoga» es entreno,
// «pagar 50€ del gimnasio» es tarea.

import { regexDePalabras } from './texto';
import type { TipoCaptura } from './tipos';

const TAREA_PRIORITARIA = regexDePalabras([
  'comprar',
  'pagar',
  'llamar',
  'reservar',
  'renovar',
  'devolver',
  'pedir',
  'enviar',
  'mandar',
  'recoger',
  'imprimir',
  'revisar',
]);

const DEPORTE = regexDePalabras([
  'gym',
  'gimnasio',
  'pádel',
  'entrenar',
  'entreno',
  'entrenamiento',
  'correr',
  'yoga',
  'pilates',
  'nadar',
  'natación',
  'pesas',
  'bici',
  'ciclismo',
  'fútbol',
  'baloncesto',
  'tenis',
  'crossfit',
  'escalada',
  'spinning',
]);

const EVENTO = regexDePalabras([
  'reunión',
  'cita',
  'médico',
  'médica',
  'dentista',
  'videollamada',
  'llamada',
  'entrevista',
  'clase',
  'curso',
  'concierto',
  'cumpleaños',
  'cumple',
  'fiesta',
  'cena',
  'comida',
  'desayuno',
  'café',
  'boda',
  'viaje',
  'vuelo',
  'tren',
  'cine',
  'teatro',
  'visita',
]);

const TAREA_GENERICA = regexDePalabras([
  'hacer',
  'limpiar',
  'ordenar',
  'colada',
  'llevar',
  'deberes',
  'recado',
  'recados',
  'arreglar',
  'regar',
  'medicación',
]);

const CANTIDAD_EURO = /\d+(?:[.,]\d+)?\s*(?:€|euros?\b)/;

export function clasificarTipo(texto: string): TipoCaptura {
  if (TAREA_PRIORITARIA.test(texto)) return 'tarea';
  if (CANTIDAD_EURO.test(texto)) return 'nota'; // gasto: bloque Dinero en Fase 4+
  if (DEPORTE.test(texto)) return 'entreno';
  if (EVENTO.test(texto)) return 'evento';
  if (TAREA_GENERICA.test(texto)) return 'tarea';
  return 'nota';
}
