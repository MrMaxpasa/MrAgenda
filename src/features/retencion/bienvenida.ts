// Vuelta sin culpa (docs/02 §8): tras ≥7 días fuera, si hay pendientes
// vencidos se ofrece archivar de un toque y empezar limpio. Lógica pura.

export const CLAVE_ULTIMA_APERTURA = 'ultima-apertura';
const DIAS_FUERA = 7;

export function decidirBienvenida(
  ultimaApertura: string | null,
  vencidos: number,
  hoyISO: string,
): boolean {
  if (!ultimaApertura || vencidos === 0) return false;
  const dias = Math.floor(
    (new Date(`${hoyISO}T00:00`).getTime() - new Date(`${ultimaApertura}T00:00`).getTime()) /
      86_400_000,
  );
  return dias >= DIAS_FUERA;
}
