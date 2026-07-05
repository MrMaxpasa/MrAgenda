// Hoja de bienvenida tras una ausencia larga. Tono docs/03: sin culpa,
// qué pasó y qué hacer. Se decide una vez al arrancar.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { guardarAjuste, obtenerAjuste } from '@/db/repositorios/ajustes';
import { archivar, listarPendientesAnteriores } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { aFechaISO } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { CLAVE_ULTIMA_APERTURA, decidirBienvenida } from './bienvenida';

export function Bienvenida() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);
  const [vencidos, setVencidos] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivo = true;
    const hoyISO = aFechaISO(new Date());
    (async () => {
      const [ultima, pendientes] = await Promise.all([
        obtenerAjuste(db, CLAVE_ULTIMA_APERTURA),
        listarPendientesAnteriores(db, hoyISO),
      ]);
      await guardarAjuste(db, CLAVE_ULTIMA_APERTURA, hoyISO);
      if (!vivo) return;
      if (decidirBienvenida(ultima, pendientes.length, hoyISO)) {
        setVencidos(pendientes.length);
        setVisible(true);
      }
    })().catch((error) => console.error('[bienvenida] error:', error));
    return () => {
      vivo = false;
    };
  }, [db]);

  const archivarVencidos = async () => {
    const hoyISO = aFechaISO(new Date());
    const pendientes = await listarPendientesAnteriores(db, hoyISO);
    for (const item of pendientes) {
      await archivar(db, item.id);
    }
    setVisible(false);
    refrescar();
    mostrarToast('Todo limpio. Empezamos hoy ✓');
  };

  if (!visible) return null;

  return (
    <HojaInferior visible onCerrar={() => setVisible(false)}>
      <Text style={estilos.saludo}>Cuánto tiempo 👋</Text>
      <Text style={estilos.texto}>
        Se te acumularon {vencidos} {vencidos === 1 ? 'cosa' : 'cosas'} de días pasados. No pasa
        nada: ¿las archivamos y empezamos de nuevo?
      </Text>
      <Pressable onPress={archivarVencidos} accessibilityRole="button" style={estilos.primario}>
        <Text style={estilos.primarioTexto}>Archivar lo vencido y empezar limpio</Text>
      </Pressable>
      <Pressable
        onPress={() => setVisible(false)}
        accessibilityRole="button"
        style={estilos.secundario}
      >
        <Text style={estilos.secundarioTexto}>Déjalo como está — lo reviso yo</Text>
      </Pressable>
    </HojaInferior>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  saludo: {
    fontSize: 24,
    fontFamily: fuente.displayItalica,
    color: paleta.ink,
  },
  texto: {
    marginTop: 8,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    lineHeight: 21,
  },
  primario: {
    marginTop: 16,
    borderRadius: radios.campo,
    backgroundColor: paleta.ink,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primarioTexto: {
    color: paleta.sobreInk,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
  secundario: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  secundarioTexto: {
    color: paleta.muted,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
  },
});
