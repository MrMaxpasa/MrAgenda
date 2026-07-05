// Cantidades de dinero: «12€», «12,50 euros», «100 €». El gasto real llega
// con el bloque Dinero (backlog); de momento la cantidad se detecta, se
// enseña en un chip 💶 y se conserva en el cuerpo para no perder el dato.

import type { Fragmento } from './tipos';

export interface CantidadDetectada {
  cantidad: number;
  fragmento: Fragmento;
}

const RE_CANTIDAD = /\b(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?\b)/;

export function extraerCantidad(texto: string): CantidadDetectada | null {
  const m = RE_CANTIDAD.exec(texto);
  if (!m) return null;
  const cantidad = parseFloat(m[1]!.replace(',', '.'));
  if (!Number.isFinite(cantidad)) return null;
  return {
    cantidad,
    fragmento: { campo: 'cantidad', texto: m[0], indice: m.index },
  };
}

/** «12,5» → «12,50 €» no; formato simple con coma: «12,5 €». */
export function formatearCantidad(cantidad: number): string {
  return `${String(cantidad).replace('.', ',')} €`;
}
