// «Última marca» (docs/02 §5): resumen en una línea de la última sesión,
// p. ej. «press banca 62,5 kg». Función pura.

import type { Sesion } from '@/db/repositorios/sesiones';

function formatearPeso(peso: number): string {
  return String(peso).replace('.', ',');
}

export function resumenUltimaMarca(sesion: Sesion): string | null {
  let mejorNombre: string | null = null;
  let mejorPeso: number | null = null;

  for (const ejercicio of sesion.ejercicios) {
    for (const serie of ejercicio.series) {
      if (serie.peso !== null && (mejorPeso === null || serie.peso > mejorPeso)) {
        mejorPeso = serie.peso;
        mejorNombre = ejercicio.nombre;
      }
    }
  }

  if (mejorNombre && mejorPeso !== null) {
    return `${mejorNombre} ${formatearPeso(mejorPeso)} kg`;
  }

  // sin pesos: al menos el primer ejercicio con sus series
  const primero = sesion.ejercicios[0];
  if (!primero) return null;
  return primero.series.length > 0 ? `${primero.nombre} ×${primero.series.length}` : primero.nombre;
}
