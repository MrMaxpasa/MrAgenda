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

import { crearExcepcion } from '@/db/repositorios/excepciones';
import { useTiendaToast } from '@/components/toast';
import {
  actualizar,
  archivar,
  completar,
  dividirSerie,
  posponer,
  reabrir,
} from '@/db/repositorios/items';
import { HojaSesion } from '@/features/deporte/hoja-sesion';
import {
  MenuAlcance,
  MenuPosponer,
  type AlcancePosponer,
  type OpcionPosponer,
} from '@/features/hoy/menu-posponer';
import { PaginaDia } from '@/features/hoy/pagina-dia';
import { useTiendaHoy } from '@/features/hoy/tienda';
import type { Instancia } from '@/features/items/instancias';
import {
  aFechaISO,
  formatearFechaLarga,
  nombreDiaSemana,
  saludoSegunHora,
  sumarDias,
} from '@/lib/fechas';
import { conDiaDe } from '@/lib/recurrencia';
import { fuente } from '@/theme/fonts';
import { tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

// Rango del swipe: hoy ± 30 días. Las páginas son perezosas (windowSize 3:
// solo se montan ~3 a la vez y cada una consulta su día al montarse), y
// getItemLayout mantiene el scrollToIndex de «volver a hoy» instantáneo.
const RANGO_DIAS = 30;
const TOTAL_PAGINAS = RANGO_DIAS * 2 + 1;
const INDICE_HOY = RANGO_DIAS;

function tituloGrande(desplazamiento: number, fecha: Date): string {
  if (desplazamiento === 0) return saludoSegunHora(new Date());
  if (desplazamiento === 1) return 'Mañana';
  if (desplazamiento === -1) return 'Ayer';
  const nombre = nombreDiaSemana(fecha);
  if (Math.abs(desplazamiento) <= 6) {
    return desplazamiento > 0 ? `El ${nombre}` : `El ${nombre} pasado`;
  }
  // a más de una semana, «El jueves» despista: se añade el día del mes
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${fecha.getDate()}`;
}

export default function PantallaHoy() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

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

  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const archivarInstancia = async (instancia: Instancia) => {
    await archivar(db, instancia.item.id);
    mostrarToast(instancia.item.rrule ? 'Serie archivada ✓' : 'Archivado ✓');
    refrescar();
  };

  const alternarInstancia = async (instancia: Instancia) => {
    if (instancia.hecha) {
      await reabrir(db, instancia.item.id, instancia.fechaOriginal);
    } else {
      await completar(db, instancia.item.id, instancia.fechaOriginal);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refrescar();
  };

  const [sesionDe, setSesionDe] = useState<Instancia | null>(null);

  // posponer: para series, primero el alcance (solo esta / todas las futuras)
  const [aPosponer, setAPosponer] = useState<Instancia | null>(null);
  const [alcance, setAlcance] = useState<AlcancePosponer | null>(null);

  const iniciarPosponer = (instancia: Instancia) => {
    setAPosponer(instancia);
    setAlcance(instancia.item.rrule ? null : 'una');
  };

  const cerrarPosponer = () => {
    setAPosponer(null);
    setAlcance(null);
  };

  const aplicarPosponer = async (opcion: OpcionPosponer) => {
    const instancia = aPosponer;
    if (!instancia) return;
    const { item } = instancia;

    if (opcion === 'tarde') {
      // solo para no recurrentes: hoy a las 17:00
      await actualizar(db, item.id, {
        fecha_inicio: `${aFechaISO(hoy)}T17:00`,
        todo_el_dia: false,
      });
    } else {
      const dias =
        opcion === 'manana' ? 1 : opcion === 'pasado' ? 2 : (1 - hoy.getDay() + 7) % 7 || 7;
      const destino = aFechaISO(sumarDias(hoy, dias));

      if (!item.rrule) {
        await posponer(db, item.id, destino);
      } else if (alcance === 'una') {
        await crearExcepcion(db, item.id, instancia.fechaOriginal, 'mover', destino);
      } else {
        const hora = item.fecha_inicio && item.fecha_inicio.length > 10 ? item.fecha_inicio.slice(10) : '';
        const nueva = await dividirSerie(db, item.id, instancia.fechaOriginal, {
          fecha_inicio: `${destino}${hora}`,
        });
        if (nueva?.rrule) {
          // una semanal de un solo día pasa al día de destino
          await actualizar(db, nueva.id, { rrule: conDiaDe(nueva.rrule, destino) });
        }
      }
    }
    cerrarPosponer();
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
            onToggleInstancia={alternarInstancia}
            onPosponerInstancia={iniciarPosponer}
            onArchivarInstancia={archivarInstancia}
            onAbrirSesion={setSesionDe}
          />
        )}
      />

      {sesionDe && <HojaSesion instancia={sesionDe} onCerrar={() => setSesionDe(null)} />}

      <MenuAlcance
        visible={aPosponer !== null && aPosponer.item.rrule !== null && alcance === null}
        titulo={aPosponer?.item.titulo ?? null}
        onElegir={setAlcance}
        onCerrar={cerrarPosponer}
      />
      <MenuPosponer
        visible={aPosponer !== null && alcance !== null}
        titulo={aPosponer?.item.titulo ?? null}
        sinTarde={aPosponer?.item.rrule !== null && aPosponer !== null}
        onElegir={aplicarPosponer}
        onCerrar={cerrarPosponer}
      />
    </View>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
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
