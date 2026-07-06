// Listas vivas: «añade pan a la compra», «apunta leche en la lista de la
// compra», «pon pilas en la lista de regalos». Cada elemento se guarda como
// item tipo 'lista' enlazado a su contenedora (Fase 5) — nada se pierde.
//
// Solo se crea lista con formas EXPLÍCITAS, para no misfilar frases normales
// («pon el coche en el garaje» NO es una lista):
//  (a) contiene la palabra «lista»: «… a/en la lista de X», o
//  (b) el destino es un nombre de lista conocido (LISTAS_CONOCIDAS).

import type { Fragmento } from './tipos';

export interface ListaDetectada {
  elemento: string;
  lista: string;
  fragmento: Fragmento;
}

const VERBOS = '(?:a[ñn]ade|apunta|pon|mete)';

// (a) destino explícito con la palabra «lista»: «… a/en (la) lista (de) (la/los/las) X»
const RE_LISTA_EXPLICITA = new RegExp(
  `\\b${VERBOS}\\s+(.+?)\\s+(?:a|en)\\s+(?:la\\s+)?lista\\s+(?:de\\s+)?(?:la\\s+|los\\s+|las\\s+)?([a-záéíóúñ]+)\\b`,
);

// (b) nombre de lista conocido tras «a/en (la/el/los/las) …»
const LISTAS_CONOCIDAS = 'compra|regalos?|pel[ií]culas|pelis|libros|deseos|series|recados';
const RE_LISTA_CONOCIDA = new RegExp(
  `\\b${VERBOS}\\s+(.+?)\\s+(?:a|en)\\s+(?:la\\s+|el\\s+|los\\s+|las\\s+)?(${LISTAS_CONOCIDAS})\\b`,
);

function construir(m: RegExpExecArray): ListaDetectada | null {
  const elemento = m[1]!.trim();
  const lista = m[2]!.trim();
  if (!elemento || !lista) return null;
  return {
    elemento,
    lista,
    fragmento: { campo: 'lista', texto: m[0], indice: m.index },
  };
}

export function extraerLista(texto: string): ListaDetectada | null {
  const explicita = RE_LISTA_EXPLICITA.exec(texto);
  if (explicita) return construir(explicita);
  const conocida = RE_LISTA_CONOCIDA.exec(texto);
  if (conocida) return construir(conocida);
  return null;
}
