// Fila de hábitos del día (mockup): tarjetitas con emoji, nombre y racha 🔥.
// Un toque = hecho/deshecho con háptica; el chip «+» crea un hábito nuevo.

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTiendaToast } from '@/components/toast';
import { actualizarHabito, crearHabito } from '@/db/repositorios/habitos';
import { actualizar, archivar, completar, reabrir } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { fuente } from '@/theme/fonts';
import { radios, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { HojaHabito } from './hoja-habito';
import { useHabitosDeHoy, type HabitoDelDia } from './use-habitos';

interface Props {
  hoyISO: string;
}

export function FilaHabitos({ hoyISO }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  // togglear un hábito (nivel de aviso 0) no afecta a los avisos: solo UI
  const refrescarSoloUI = useTiendaHoy((estado) => estado.refrescarSoloUI);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);
  const habitos = useHabitosDeHoy(hoyISO);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<HabitoDelDia | null>(null);

  const alternar = async ({ habito, hechaHoy }: HabitoDelDia) => {
    if (hechaHoy) {
      await reabrir(db, habito.item.id, hoyISO);
    } else {
      await completar(db, habito.item.id, hoyISO);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refrescarSoloUI();
  };

  const guardarNuevo = async (datos: Parameters<typeof crearHabito>[1]) => {
    await crearHabito(db, datos);
    refrescar();
  };

  const guardarEdicion = async (datos: Parameters<typeof crearHabito>[1]) => {
    if (!editando) return;
    await actualizarHabito(db, editando.habito.item.id, datos);
    setEditando(null);
    refrescar();
    mostrarToast('Hábito actualizado ✓');
  };

  const archivarEditado = async () => {
    if (!editando) return;
    const { item } = editando.habito;
    const estadoPrevio = item.estado;
    await archivar(db, item.id);
    setEditando(null);
    refrescar();
    mostrarToast('Hábito archivado', {
      etiqueta: 'Deshacer',
      onDeshacer: () => {
        actualizar(db, item.id, { estado: estadoPrevio })
          .then(() => refrescar())
          .catch(() => undefined);
      },
    });
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.fila}
        contentContainerStyle={estilos.contenido}
      >
        {habitos.map((h) => (
          <Pressable
            key={h.habito.item.id}
            onPress={() => alternar(h)}
            onLongPress={() => setEditando(h)}
            accessibilityHint="Mantén pulsado para editar"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: h.hechaHoy }}
            accessibilityLabel={`Hábito ${h.habito.item.titulo}, racha de ${h.racha.actual}`}
            style={[estilos.habito, h.hechaHoy && estilos.habitoHecho]}
          >
            <Text style={estilos.icono}>{h.habito.icono}</Text>
            <Text
              style={[estilos.nombre, h.hechaHoy && estilos.nombreHecho]}
              numberOfLines={1}
            >
              {h.habito.item.titulo}
            </Text>
            <Text style={estilos.racha}>
              🔥 {h.racha.actual}
              {h.racha.comodinUsadoEstaSemana ? ' ·🃏' : ''}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => setCreando(true)}
          accessibilityRole="button"
          accessibilityLabel="Crear un hábito"
          style={[estilos.habito, estilos.nuevo]}
        >
          <Text style={estilos.nuevoMas}>+</Text>
          <Text style={estilos.nombre}>Hábito</Text>
        </Pressable>
      </ScrollView>

      <HojaHabito visible={creando} onGuardar={guardarNuevo} onCerrar={() => setCreando(false)} />
      {editando && (
        <HojaHabito
          visible
          habito={editando.habito}
          onGuardar={guardarEdicion}
          onArchivar={archivarEditado}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  fila: {
    marginTop: 18,
    flexGrow: 0,
  },
  contenido: {
    gap: 10,
    paddingHorizontal: 2,
  },
  habito: {
    minWidth: 82,
    maxWidth: 110,
    backgroundColor: paleta.card,
    borderWidth: 1,
    borderColor: paleta.line,
    borderRadius: radios.habito,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  habitoHecho: {
    backgroundColor: paleta.deporteSuave,
    borderColor: paleta.deporteSuaveBorde,
  },
  icono: {
    fontSize: 19,
  },
  nombre: {
    fontSize: 11.5,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    marginTop: 4,
  },
  nombreHecho: {
    color: paleta.deporte,
  },
  racha: {
    fontSize: 11,
    fontFamily: fuente.uiSemi,
    color: paleta.ambar,
    marginTop: 2,
  },
  nuevo: {
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  nuevoMas: {
    fontSize: 19,
    color: paleta.muted,
    lineHeight: 22,
  },
});
