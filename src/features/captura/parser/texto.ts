// Utilidades de texto para el parser: los usuarios escriben con o sin tildes.

/**
 * Convierte una palabra en un patrón que acepta escribirla con o sin tildes
 * («pádel» y «padel», «miércoles» y «miercoles»).
 */
export function conAcentosOpcionales(palabra: string): string {
  const base = palabra
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
  return base
    .replace(/a/g, '[aá]')
    .replace(/e/g, '[eé]')
    .replace(/i/g, '[ií]')
    .replace(/o/g, '[oó]')
    .replace(/u/g, '[uú]')
    .replace(/ñ/g, '[nñ]');
}

/** Regex que encuentra cualquiera de las palabras, como palabra completa. */
export function regexDePalabras(palabras: string[]): RegExp {
  const alternativas = palabras.map(conAcentosOpcionales).join('|');
  return new RegExp(`(?:^|[^a-záéíóúñ])(${alternativas})(?=$|[^a-záéíóúñ])`, 'i');
}
