// Banco de plantillas del briefing (docs/02 §7, paso 2). El copy es parte
// del producto (docs/03): cercano, frases cortas, sin culpa. Aprobado por
// el usuario el 5/7/2026. Los *asteriscos* marcan el destacado ámbar.

export type Situacion =
  | 'apertura_vacio'
  | 'apertura_tranquilo'
  | 'apertura_normal'
  | 'apertura_cargado'
  | 'primera_cita'
  | 'hueco'
  | 'racha'
  | 'cumple'
  | 'arrastrados';

export const PLANTILLAS: Record<Situacion, string[]> = {
  apertura_vacio: [
    'Hoy está despejado. Tuyo entero.',
    'Nada en el calendario: día en blanco para lo que quieras.',
    'Cero citas hoy. Respira.',
    'Agenda vacía — buen día para lo importante sin prisa.',
    'Hoy no hay nada fijado. Si te apetece, inventa.',
    'Día limpio, sin compromisos a la vista.',
  ],
  apertura_tranquilo: [
    'Día tranquilo: {cosas} y poco más.',
    'Hoy va suave: {cosas} en el calendario.',
    'Día ligero — {cosas}, nada más.',
    'Poca cosa hoy: {cosas}. El resto, aire.',
    'Un día de los fáciles: {cosas} y ya.',
    'Hoy pinta tranquilo: {cosas}.',
  ],
  apertura_normal: [
    'Día con ritmo: {cosas}.',
    'Hoy hay tema: {cosas} repartidas por el día.',
    '{cosas} hoy — llevadero si vas una a una.',
    'Día normal tirando a lleno: {cosas}.',
    'Agenda con {cosas}; quedan huecos para respirar.',
    'Hoy toca moverse: {cosas}.',
  ],
  apertura_cargado: [
    'Día cargado: {cosas}. Una a una, sin agobio.',
    'Hoy viene denso ({cosas}). Prioriza y suelta lo que sobre.',
    'Agenda llena: {cosas}. Ve al grano y protege algún hueco.',
    '{cosas} hoy — día de los serios. Se puede.',
    'Mucho hoy ({cosas}). Si algo se cae, no pasa nada.',
    'Día intenso: {cosas}. Respira entre una y otra.',
  ],
  primera_cita: [
    'Empiezas a las *{hora}* con «{titulo}».',
    'Lo primero: «{titulo}» a las *{hora}*.',
    'A las *{hora}* llega «{titulo}»; hasta entonces, margen.',
    'Tu día arranca con «{titulo}» (*{hora}*).',
    'Primera parada: «{titulo}», *{hora}*.',
    'Hasta las *{hora}* («{titulo}») tienes pista libre.',
  ],
  hueco: [
    'Tienes hueco de *{h1} a {h2}*.',
    'Entre *{h1} y {h2}* no hay nada — es tuyo.',
    'Queda un buen hueco: *{h1}–{h2}*.',
    'De *{h1} a {h2}*, aire.',
    'La franja *{h1}–{h2}* está libre, por si quieres usarla con cabeza.',
    '*{h1}–{h2}* sin nada: buen sitio para lo tuyo.',
  ],
  racha: [
    'Llevas *racha de {racha}* con {habito} y hoy aún no ha caído.',
    'Tu racha de *{racha}* en {habito} sigue viva — no la dejes sola hoy.',
    '{habito}: *{racha} seguidos*. Hoy puede ser el {racha}+1.',
    'Ojo, la racha de {habito} (*{racha}*) se juega hoy.',
    '*{racha} días* de {habito}. Hoy solo hay que no romperla.',
    '{habito} lleva *{racha}*; un toque hoy y sigue.',
  ],
  cumple: [
    'Hoy es el cumple de *{nombre}* 🎂',
    'Que no se pase: *{nombre}* cumple años hoy 🎂',
    'Día de tarta: *{nombre}* está de cumpleaños 🎂',
    'Apunta una felicitación: hoy es el cumple de *{nombre}* 🎂',
    '*{nombre}* sopla velas hoy 🎂',
    'Un hueco para felicitar a *{nombre}* hoy 🎂',
  ],
  arrastrados: [
    'Arrastras *{n} pendientes* de días anteriores — hoy caben.',
    'Hay *{n} cosas* esperando de otros días. ¿Les hacemos hueco?',
    '*{n} pendientes* vienen contigo; despacharlos hoy deja la mesa limpia.',
    'Te siguen *{n} pendientes* antiguos. Sin culpa: hoy es buen día.',
    'Quedan *{n}* de días pasados. Uno menos ya sería victoria.',
    '*{n} pendientes* en la mochila. Hoy puedes soltar alguno.',
  ],
};

/** Hash simple y estable (djb2) para la rotación determinista. */
function hash(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 33) ^ texto.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * Variante del día: el mismo día siempre toca la misma (estable con la
 * caché) y días distintos rotan por el banco sin repetirse en seguida.
 */
export function elegirVariante(situacion: Situacion, fechaISO: string): string {
  const variantes = PLANTILLAS[situacion];
  return variantes[hash(`${fechaISO}|${situacion}`) % variantes.length]!;
}

export function rellenar(plantilla: string, valores: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (todo, clave: string) =>
    clave in valores ? String(valores[clave]) : todo,
  );
}
