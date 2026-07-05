// Listas vivas: «añade pan a la compra», «apunta leche en la lista de la
// compra», «pon pilas en la lista de regalos». La Fase 5 agrupará los
// elementos con `enlaces`; de momento cada elemento se guarda como item
// tipo 'lista' con el nombre de su lista en el cuerpo — nada se pierde.

import type { Fragmento } from './tipos';

export interface ListaDetectada {
  elemento: string;
  lista: string;
  fragmento: Fragmento;
}

const RE_LISTA =
  /\b(?:a[ñn]ade|apunta|pon|mete)\s+(.+?)\s+(?:a|en)\s+(?:la\s+|el\s+)?(?:lista\s+(?:de\s+)?(?:la\s+|los\s+|las\s+)?)?([a-záéíóúñ]+)\b/;

export function extraerLista(texto: string): ListaDetectada | null {
  const m = RE_LISTA.exec(texto);
  if (!m) return null;
  const elemento = m[1]!.trim();
  const lista = m[2]!.trim();
  if (!elemento || !lista) return null;
  return {
    elemento,
    lista,
    fragmento: { campo: 'lista', texto: m[0], indice: m.index },
  };
}
