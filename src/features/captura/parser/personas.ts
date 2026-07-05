// Personas: «con Marc», «con Marta y Ana», «con Carlos, Laura y Pedro».
// Heurística v1 (documentada en tests): solo cuentan los nombres escritos
// con mayúscula en el texto original — «con el equipo» o «con marc» en
// minúsculas no se toman como personas. El fragmento alimenta el chip 👤
// pero NO se quita del título (el mockup muestra «Pádel con Marc»).

import type { Fragmento } from './tipos';

export interface PersonasDetectadas {
  personas: string[];
  fragmento: Fragmento;
}

const RE_CON =
  /\bcon\s+([a-záéíóúñü]+(?:(?:\s*,\s*|\s+y\s+|\s+e\s+)[a-záéíóúñü]+)*)/;

export function extraerPersonas(
  textoOriginal: string,
  enMinusculas: string,
): PersonasDetectadas | null {
  const m = RE_CON.exec(enMinusculas);
  if (!m) return null;

  const candidatos = m[1]!.split(/\s*,\s*|\s+y\s+|\s+e\s+/).filter(Boolean);

  // posición de cada candidato dentro del match para mirar el original
  const personas: string[] = [];
  let cursor = m.index + m[0].indexOf(m[1]!);
  for (const candidato of candidatos) {
    const inicio = enMinusculas.indexOf(candidato, cursor);
    if (inicio === -1) continue;
    cursor = inicio + candidato.length;
    const original = textoOriginal.slice(inicio, inicio + candidato.length);
    if (original.charAt(0) === original.charAt(0).toUpperCase()) {
      personas.push(original);
    }
  }

  if (personas.length === 0) return null;
  return {
    personas,
    fragmento: { campo: 'personas', texto: m[0], indice: m.index },
  };
}
