// Hook del briefing: carga atómica de datos → análisis → texto (con caché
// diaria en `ajustes`: el saludo de la mañana no cambia durante el día)
// → sugerencia (esta SÍ se revalida en cada recarga, y desaparece al
// usarse o dejar de aplicar).

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { useTiendaToast } from '@/components/toast';
import { guardarAjuste, obtenerAjuste } from '@/db/repositorios/ajustes';
import { listarHabitos } from '@/db/repositorios/habitos';
import { listarCompletados, listarPendientesAnteriores } from '@/db/repositorios/items';
import { construirHabitosDeHoy } from '@/features/habitos/del-dia';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { listarInstanciasPorFecha } from '@/features/items/consultas';

import { analizarDia } from './analisis';
import { componerBriefing, parsearDestacados, type Segmento } from './componer';
import { ejecutarSugerencia, elegirSugerencia, type Sugerencia } from './sugerencias';

export interface Briefing {
  segmentos: Segmento[];
  sugerencia: Sugerencia | null;
  usarSugerencia: () => Promise<void>;
}

const claveTexto = (fecha: string) => `briefing:${fecha}`;
const claveUsada = (fecha: string) => `briefing:sugerencia-usada:${fecha}`;

export function useBriefing(hoyISO: string): Briefing | null {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const [briefing, setBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [instancias, habitos, completados, arrastrados, textoCache, usada] =
        await Promise.all([
          listarInstanciasPorFecha(db, hoyISO),
          listarHabitos(db),
          listarCompletados(db),
          listarPendientesAnteriores(db, hoyISO),
          obtenerAjuste(db, claveTexto(hoyISO)),
          obtenerAjuste(db, claveUsada(hoyISO)),
        ]);
      if (!vivo) return;

      const habitosDeHoy = construirHabitosDeHoy(habitos, completados, hoyISO);
      const analisis = analizarDia(instancias, habitosDeHoy, arrastrados.length, new Date());

      let texto = textoCache;
      if (!texto) {
        texto = componerBriefing(analisis, hoyISO).texto;
        await guardarAjuste(db, claveTexto(hoyISO), texto);
      }

      const sugerencia = usada ? null : elegirSugerencia(analisis);

      setBriefing({
        segmentos: parsearDestacados(texto),
        sugerencia,
        usarSugerencia: async () => {
          if (!sugerencia) return;
          const mensaje = await ejecutarSugerencia(db, sugerencia, hoyISO);
          await guardarAjuste(db, claveUsada(hoyISO), '1');
          mostrarToast(mensaje);
          refrescar();
        },
      });
    })().catch((error) => {
      console.error('[briefing] error generando el briefing:', error);
    });
    return () => {
      vivo = false;
    };
  }, [db, hoyISO, version, mostrarToast, refrescar]);

  return briefing;
}
