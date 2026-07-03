// interpretar(): la entrada única del parser. Nunca lanza ni devuelve error —
// lo que no se entiende se guarda como nota (regla «nunca se pierde una captura»).

import { aFechaISO, sumarDias } from '@/lib/fechas';

import { extraerFecha } from './fechas';
import { extraerHora } from './horas';
import { clasificarTipo } from './tipo';
import type { Fragmento, InterpretacionCaptura } from './tipos';

// «idea: …», «nota: …» fuerzan tipo nota y salen del título
const RE_PREFIJO_NOTA = /^(?:idea|nota|apunte)\s*:\s*/i;

const RE_CONECTOR_INICIO = /^(?:de|del|el|la|los|las|a|al|y|en|para|por|con|que)\s+/i;
const RE_CONECTOR_FIN = /\s+(?:de|del|el|la|los|las|a|al|y|en|para|por|este|esta|cada|antes)$/i;

function limpiarTitulo(texto: string, fragmentos: Fragmento[]): string {
  // eliminar los trozos detectados (de atrás hacia delante para no mover índices)
  let resultado = texto;
  const ordenados = [...fragmentos].sort((a, b) => b.indice - a.indice);
  for (const f of ordenados) {
    resultado = resultado.slice(0, f.indice) + ' ' + resultado.slice(f.indice + f.texto.length);
  }
  resultado = resultado.replace(/\s+/g, ' ').trim();
  resultado = resultado.replace(/^[,.;:\-–]+\s*/, '').replace(/\s*[,.;:\-–]+$/, '');

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
    return { tipo: 'nota', titulo: '', fecha: null, hora: null, textoOriginal, fragmentos: [] };
  }

  const prefijoNota = RE_PREFIJO_NOTA.exec(texto);
  const enMinusculas = texto.toLowerCase();

  const fechaDetectada = extraerFecha(enMinusculas, ahora);
  const horaExtraida = extraerHora(enMinusculas);
  const tipo = prefijoNota ? 'nota' : clasificarTipo(enMinusculas);

  let fecha = fechaDetectada?.fecha ?? null;
  if (!fecha && horaExtraida) {
    // hora sin fecha: hoy si aún no ha pasado, mañana si ya pasó
    const candidata = new Date(ahora);
    candidata.setHours(horaExtraida.hora.hora, horaExtraida.hora.minuto, 0, 0);
    fecha = aFechaISO(candidata >= ahora ? ahora : sumarDias(ahora, 1));
  }

  const fragmentos: Fragmento[] = [];
  if (fechaDetectada) fragmentos.push(fechaDetectada.fragmento);
  if (horaExtraida) fragmentos.push(horaExtraida.fragmento);

  const paraTitulo: Fragmento[] = [...fragmentos];
  if (prefijoNota) {
    paraTitulo.push({ campo: 'fecha', texto: prefijoNota[0], indice: 0 });
  }
  const titulo = capitalizar(limpiarTitulo(texto, paraTitulo)) || capitalizar(texto);

  return {
    tipo,
    titulo,
    fecha,
    hora: horaExtraida?.hora ?? null,
    textoOriginal,
    fragmentos,
  };
}

export type { Fragmento, HoraDetectada, InterpretacionCaptura, TipoCaptura } from './tipos';
