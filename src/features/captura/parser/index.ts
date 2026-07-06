// interpretar(): la entrada única del parser. Nunca lanza ni devuelve error —
// lo que no se entiende se guarda como nota (regla «nunca se pierde una captura»).

import { aFechaISO, sumarDias } from '@/lib/fechas';

import { extraerCantidad } from './cantidades';
import { extraerFecha } from './fechas';
import { extraerHora } from './horas';
import { extraerLista } from './listas';
import { extraerPersonas } from './personas';
import { construirRecurrencia, extraerRecurrencia, primeraInstancia } from './recurrencias';
import { clasificarTipo } from './tipo';
import type { Fragmento, InterpretacionCaptura } from './tipos';

// «idea: …», «nota: …» fuerzan tipo nota; «ref: …» fuerza referencia.
// El prefijo sale del título.
const RE_PREFIJO_NOTA = /^(?:idea|nota|apunte)\s*:\s*/i;
const RE_PREFIJO_REF = /^ref\s*:\s*/i;

const RE_CONECTOR_INICIO = /^(?:de|del|el|la|los|las|a|al|y|en|para|por|con|que)\s+/i;
const RE_CONECTOR_FIN = /\s+(?:de|del|el|la|los|las|a|al|y|en|para|por|este|esta|cada|antes)$/i;

// conectores puros: un token así al inicio del título no tiene núcleo al
// que pegarse (p. ej. «con» de un «con Marta» que quedó de arranque).
const CONECTORES = new Set([
  'de', 'del', 'el', 'la', 'los', 'las', 'a', 'al', 'y', 'e', 'en', 'para', 'por', 'con', 'que',
]);

interface Token {
  texto: string;
  inicio: number;
  fin: number;
}

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    tokens.push({ texto: m[0], inicio: m.index, fin: m.index + m[0].length });
  }
  return tokens;
}

/** ¿El centro del token cae dentro de algún fragmento (por índice)? */
function dentroDe(token: Token, fragmentos: Fragmento[]): boolean {
  const centro = (token.inicio + token.fin) / 2;
  return fragmentos.some((f) => centro >= f.indice && centro < f.indice + f.texto.length);
}

/**
 * Construye el título a partir de los tokens que NO son entidades removidas
 * (fecha/hora/recurrencia/prefijo), soltando la racha inicial de persona o
 * conectores huérfanos hasta el primer núcleo real. Así el título es
 * independiente del orden y sin conectores colgando:
 *   «con Marta cena» → «Cena» · «cena con Marta» → «Cena con Marta».
 */
function construirTitulo(
  texto: string,
  removibles: Fragmento[],
  personas: Fragmento[],
): string {
  const tokens = tokenizar(texto).filter((t) => !dentroDe(t, removibles));

  // soltar el arranque huérfano: personas o conectores puros hasta el núcleo
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    const esPersona = dentroDe(t, personas);
    const esConector = CONECTORES.has(t.texto.toLowerCase().replace(/[.,;:]+$/, ''));
    if (esPersona || esConector) i++;
    else break;
  }

  let resultado = tokens
    .slice(i)
    .map((t) => t.texto)
    .join(' ');
  resultado = resultado.replace(/\s+/g, ' ').trim();
  resultado = resultado.replace(/^[,.;:\-–]+\s*/, '').replace(/\s*[,.;:\-–]+$/, '');

  // pulido de bordes (conectores sueltos al inicio/fin), como antes
  let anterior = '';
  while (anterior !== resultado) {
    anterior = resultado;
    resultado = resultado.replace(RE_CONECTOR_INICIO, '').replace(RE_CONECTOR_FIN, '');
  }
  return resultado.trim();
}

function capitalizar(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export function interpretar(textoOriginal: string, ahora: Date): InterpretacionCaptura {
  const texto = textoOriginal.trim();
  if (!texto) {
    return {
      tipo: 'nota',
      titulo: '',
      fecha: null,
      hora: null,
      recurrencia: null,
      personas: [],
      cantidad: null,
      lista: null,
      textoOriginal,
      fragmentos: [],
    };
  }

  const prefijoRef = RE_PREFIJO_REF.exec(texto);
  const prefijoNota = prefijoRef ? null : RE_PREFIJO_NOTA.exec(texto);
  const prefijo = prefijoRef ?? prefijoNota;
  const enMinusculas = texto.toLowerCase();

  // la recurrencia se extrae primero y su texto se blanquea (conservando
  // índices) para que «cada jueves» no se lea también como fecha suelta
  const recurrenciaDetectada = extraerRecurrencia(enMinusculas);
  let textoParaFechas = enMinusculas;
  if (recurrenciaDetectada) {
    for (const f of recurrenciaDetectada.fragmentos) {
      textoParaFechas =
        textoParaFechas.slice(0, f.indice) +
        ' '.repeat(f.texto.length) +
        textoParaFechas.slice(f.indice + f.texto.length);
    }
  }

  const fechaDetectada = extraerFecha(textoParaFechas, ahora);
  const horaExtraida = extraerHora(textoParaFechas);
  const tipo = prefijoRef ? 'referencia' : prefijoNota ? 'nota' : clasificarTipo(enMinusculas);

  let fecha = fechaDetectada?.fecha ?? null;
  let recurrencia = null;
  if (recurrenciaDetectada) {
    // la fecha explícita manda como primera instancia; si no, se calcula
    if (!fecha) fecha = primeraInstancia(recurrenciaDetectada, ahora, horaExtraida?.hora ?? null);
    recurrencia = construirRecurrencia(recurrenciaDetectada, fecha);
  } else if (!fecha && horaExtraida) {
    // hora sin fecha: hoy si aún no ha pasado, mañana si ya pasó
    const candidata = new Date(ahora);
    candidata.setHours(horaExtraida.hora.hora, horaExtraida.hora.minuto, 0, 0);
    fecha = aFechaISO(candidata >= ahora ? ahora : sumarDias(ahora, 1));
  }

  // personas, cantidades y listas: informativas — no alteran el título
  // (el mockup muestra «Pádel con Marc»; el € y la lista van a chips/cuerpo)
  const personasDetectadas = extraerPersonas(texto, enMinusculas);
  const cantidadDetectada = extraerCantidad(enMinusculas);
  const listaDetectada = extraerLista(enMinusculas);

  // se quitan fecha, hora, recurrencia y prefijo; la persona se conserva si
  // va tras el núcleo, y se suelta si queda de arranque (construirTitulo)
  const removibles: Fragmento[] = [];
  if (fechaDetectada) removibles.push(fechaDetectada.fragmento);
  if (horaExtraida) removibles.push(horaExtraida.fragmento);
  if (recurrenciaDetectada) removibles.push(...recurrenciaDetectada.fragmentos);
  if (prefijo) {
    removibles.push({ campo: 'fecha', texto: prefijo[0], indice: 0 });
  }
  const fragmentosPersona = personasDetectadas ? [personasDetectadas.fragmento] : [];
  const titulo = capitalizar(construirTitulo(texto, removibles, fragmentosPersona)) || capitalizar(texto);

  const fragmentos: Fragmento[] = [];
  if (fechaDetectada) fragmentos.push(fechaDetectada.fragmento);
  if (horaExtraida) fragmentos.push(horaExtraida.fragmento);
  if (recurrenciaDetectada) fragmentos.push(...recurrenciaDetectada.fragmentos);
  if (personasDetectadas) fragmentos.push(personasDetectadas.fragmento);
  if (cantidadDetectada) fragmentos.push(cantidadDetectada.fragmento);
  if (listaDetectada) fragmentos.push(listaDetectada.fragmento);

  return {
    tipo,
    titulo,
    fecha,
    hora: horaExtraida?.hora ?? null,
    recurrencia,
    personas: personasDetectadas?.personas ?? [],
    cantidad: cantidadDetectada?.cantidad ?? null,
    lista: listaDetectada ? { elemento: listaDetectada.elemento, lista: listaDetectada.lista } : null,
    textoOriginal,
    fragmentos,
  };
}

export type {
  Fragmento,
  HoraDetectada,
  InterpretacionCaptura,
  RecurrenciaInterpretada,
  TipoCaptura,
} from './tipos';
