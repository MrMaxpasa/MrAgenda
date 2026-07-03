import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actualizar, completar, posponer, reabrir } from '@/db/repositorios/items';
import type { Item } from '@/db/tipos';
import { MenuPosponer, type OpcionPosponer } from '@/features/hoy/menu-posponer';
import { PaginaDia } from '@/features/hoy/pagina-dia';
import { useTiendaHoy } from '@/features/hoy/tienda';
import {
  aFechaISO,
  formatearFechaLarga,
  nombreDiaSemana,
  saludoSegunHora,
  sumarDias,
} from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

const RANGO_DIAS = 7; // swipe entre hoy ± 7 días
const TOTAL_PAGINAS = RANGO_DIAS * 2 + 1;
const INDICE_HOY = RANGO_DIAS;

function tituloGrande(desplazamiento: number, fecha: Date): string {
  if (desplazamiento === 0) return saludoSegunHora(new Date());
  if (desplazamiento === 1) return 'Mañana';
  if (desplazamiento === -1) return 'Ayer';
  const nombre = nombreDiaSemana(fecha);
  return desplazamiento > 0 ? `El ${nombre}` : `El ${nombre} pasado`;
}

export default function PantallaHoy() {
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // El "hoy" de referencia se fija al montar la pantalla.
  const hoy = useMemo(() => new Date(), []);
  const [indiceVisible, setIndiceVisible] = useState(INDICE_HOY);
  const listaRef = useRef<FlatList<number>>(null);

  const indices = useMemo(() => Array.from({ length: TOTAL_PAGINAS }, (_, i) => i), []);
  const desplazamiento = indiceVisible - INDICE_HOY;
  const fechaVisible = sumarDias(hoy, desplazamiento);

  const alCambiarVisibles = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const primero = viewableItems[0];
    if (primero && typeof primero.index === 'number') {
      setIndiceVisible(primero.index);
    }
  }).current;
  const configVisibilidad = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const volverAHoy = () => {
    listaRef.current?.scrollToIndex({ index: INDICE_HOY, animated: true });
  };

  const alternarItem = async (item: Item) => {
    const fechaInstancia = item.fecha_inicio ? item.fecha_inicio.slice(0, 10) : aFechaISO(hoy);
    if (item.estado === 'hecho') {
      await reabrir(db, item.id, fechaInstancia);
    } else {
      await completar(db, item.id, fechaInstancia);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refrescar();
  };

  const [itemAPosponer, setItemAPosponer] = useState<Item | null>(null);

  const posponerItem = async (opcion: OpcionPosponer) => {
    if (!itemAPosponer) return;
    if (opcion === 'tarde') {
      await actualizar(db, itemAPosponer.id, {
        fecha_inicio: `${aFechaISO(hoy)}T17:00`,
        todo_el_dia: false,
      });
    } else {
      const dias =
        opcion === 'manana' ? 1 : opcion === 'pasado' ? 2 : (1 - hoy.getDay() + 7) % 7 || 7;
      await posponer(db, itemAPosponer.id, aFechaISO(sumarDias(hoy, dias)));
    }
    setItemAPosponer(null);
    refrescar();
  };

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 26 }]}>
      <Pressable
        onPress={volverAHoy}
        disabled={desplazamiento === 0}
        accessibilityRole="button"
        accessibilityLabel="Volver a hoy"
        style={estilos.cabecera}
      >
        <Text style={estilos.eyebrow}>{formatearFechaLarga(fechaVisible)}</Text>
        <Text style={estilos.saludo}>{tituloGrande(desplazamiento, fechaVisible)}</Text>
        {desplazamiento !== 0 && <Text style={estilos.volver}>tocar para volver a hoy</Text>}
      </Pressable>

      <FlatList
        ref={listaRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={indices}
        keyExtractor={(indice) => String(indice)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialScrollIndex={INDICE_HOY}
        onViewableItemsChanged={alCambiarVisibles}
        viewabilityConfig={configVisibilidad}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ item: indice }) => (
          <PaginaDia
            fecha={aFechaISO(sumarDias(hoy, indice - INDICE_HOY))}
            esHoy={indice === INDICE_HOY}
            ancho={width}
            onToggleItem={alternarItem}
            onPosponerItem={setItemAPosponer}
          />
        )}
      />

      <MenuPosponer
        visible={itemAPosponer !== null}
        titulo={itemAPosponer?.titulo ?? null}
        onElegir={posponerItem}
        onCerrar={() => setItemAPosponer(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: paleta.paper,
  },
  cabecera: {
    paddingHorizontal: 22,
    paddingBottom: 6,
    minHeight: 44,
  },
  eyebrow: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  saludo: {
    fontSize: tipografia.saludo,
    fontFamily: fuente.displayItalica,
    color: paleta.ink,
    marginTop: 6,
    lineHeight: 36,
  },
  volver: {
    fontSize: 12,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    marginTop: 2,
  },
});
