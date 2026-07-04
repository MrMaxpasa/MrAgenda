// Fila de hábitos del día (mockup): tarjetitas con emoji, nombre y racha 🔥.
// Un toque = hecho/deshecho con háptica; el chip «+» crea un hábito nuevo.

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { crearHabito } from '@/db/repositorios/habitos';
import { completar, reabrir } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { fuente } from '@/theme/fonts';
import { paleta, radios } from '@/theme/tokens';

import { HojaHabito } from './hoja-habito';
import { useHabitosDeHoy, type HabitoDelDia } from './use-habitos';

interface Props {
  hoyISO: string;
}

export function FilaHabitos({ hoyISO }: Props) {
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const habitos = useHabitosDeHoy(hoyISO);
  const [creando, setCreando] = useState(false);

  const alternar = async ({ habito, hechaHoy }: HabitoDelDia) => {
    if (hechaHoy) {
      await reabrir(db, habito.item.id, hoyISO);
    } else {
      await completar(db, habito.item.id, hoyISO);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refrescar();
  };

  const guardarNuevo = async (datos: Parameters<typeof crearHabito>[1]) => {
    await crearHabito(db, datos);
    refrescar();
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
    </>
  );
}

const estilos = StyleSheet.create({
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
    backgroundColor: '#EFF6F2',
    borderColor: '#BDDCCB',
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
