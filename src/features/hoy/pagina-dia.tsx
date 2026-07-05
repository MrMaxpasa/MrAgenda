// Una página del pager de Hoy: la cronología completa de un día, sobre
// instancias (simples + series recurrentes expandidas). El marcador AHORA
// y la tarjeta «te saltaste» solo aparecen en el día actual.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactElement, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { ItemCard } from '@/components/item-card';
import { crearExcepcion } from '@/db/repositorios/excepciones';
import { TarjetaBriefing } from '@/features/briefing/tarjeta-briefing';
import { FilaHabitos } from '@/features/habitos/fila-habitos';
import type { Instancia } from '@/features/items/instancias';
import { fuente } from '@/theme/fonts';
import { tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { Celebracion } from './celebracion';
import { TarjetaSaltada } from './tarjeta-saltada';
import { useTiendaHoy } from './tienda';
import { useInstanciaSaltada } from './use-instancia-saltada';
import { useInstanciasDelDia } from './use-instancias-del-dia';

interface Props {
  fecha: string; // YYYY-MM-DD
  esHoy: boolean;
  ancho: number;
  onToggleInstancia: (instancia: Instancia) => void;
  onPosponerInstancia: (instancia: Instancia) => void;
  onAbrirSesion: (instancia: Instancia) => void;
}

function MarcadorAhora({ etiqueta }: { etiqueta: string }) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  return (
    <View style={estilos.ahora}>
      <View style={estilos.ahoraPill}>
        <Text style={estilos.ahoraTexto}>{etiqueta}</Text>
      </View>
      <View style={estilos.ahoraLinea} />
    </View>
  );
}

/** Hora actual re-evaluada cada minuto para mover el marcador AHORA. */
function useMinutoActual(activo: boolean): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    if (!activo) return;
    const temporizador = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(temporizador);
  }, [activo]);
  return ahora;
}

export function PaginaDia({
  fecha,
  esHoy,
  ancho,
  onToggleInstancia,
  onPosponerInstancia,
  onAbrirSesion,
}: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const instancias = useInstanciasDelDia(fecha);
  const saltada = useInstanciaSaltada(esHoy, fecha);
  const ahora = useMinutoActual(esHoy);

  const conHora = instancias.filter((i) => !i.item.todo_el_dia);
  const sinHora = instancias.filter((i) => i.item.todo_el_dia);
  const pendientes = instancias.filter((i) => !i.hecha).length;

  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(
    ahora.getMinutes(),
  ).padStart(2, '0')}`;

  const clave = (i: Instancia) => `${i.item.id}|${i.fechaOriginal}`;

  const filas: ReactElement[] = [];
  let marcadorPuesto = !esHoy;
  for (const instancia of conHora) {
    const horaItem = instancia.item.fecha_inicio!.slice(11, 16);
    if (!marcadorPuesto && horaItem > horaActual) {
      filas.push(<MarcadorAhora key="ahora" etiqueta={`AHORA · ${horaActual}`} />);
      marcadorPuesto = true;
    }
    filas.push(
      <ItemCard
        key={clave(instancia)}
        instancia={instancia}
        onPressCheck={() => onToggleInstancia(instancia)}
        onPosponer={() => onPosponerInstancia(instancia)}
        onPressCuerpo={
          instancia.item.tipo === 'entreno' ? () => onAbrirSesion(instancia) : undefined
        }
      />,
    );
  }
  if (!marcadorPuesto && conHora.length > 0) {
    filas.push(<MarcadorAhora key="ahora" etiqueta={`AHORA · ${horaActual}`} />);
  }

  const moverSaltadaAHoy = async () => {
    if (!saltada) return;
    await crearExcepcion(db, saltada.item.id, saltada.fechaOriginal, 'mover', fecha);
    refrescar();
  };

  const dejarPasarSaltada = async () => {
    if (!saltada) return;
    await crearExcepcion(db, saltada.item.id, saltada.fechaOriginal, 'saltar');
    refrescar();
  };

  return (
    <ScrollView
      style={{ width: ancho }}
      contentContainerStyle={estilos.contenido}
      showsVerticalScrollIndicator={false}
    >
      {esHoy && (
        <Celebracion fecha={fecha} pendientes={pendientes} totalDelDia={instancias.length} />
      )}
      {saltada && (
        <TarjetaSaltada
          instancia={saltada}
          onMoverAHoy={moverSaltadaAHoy}
          onDejarPasar={dejarPasarSaltada}
        />
      )}

      {esHoy && <TarjetaBriefing hoyISO={fecha} />}
      {esHoy && <FilaHabitos hoyISO={fecha} />}

      {instancias.length === 0 ? (
        <EstadoVacio
          mensaje={
            esHoy
              ? 'Toca + y escribe lo primero que tengas en la cabeza.'
              : 'Nada anotado para este día. Toca + si quieres añadir algo.'
          }
        />
      ) : (
        <>
          <View style={estilos.tituloSeccion}>
            <Text style={estilos.tituloSeccionTexto}>Tu día</Text>
            <Text style={estilos.contador}>
              {pendientes > 0
                ? `${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`
                : '¡día completado! 🎉'}
            </Text>
          </View>

          {conHora.length > 0 && (
            <View style={estilos.cronologia}>
              <View style={estilos.linea} />
              {filas}
            </View>
          )}

          {sinHora.length > 0 && (
            <>
              <View style={estilos.tituloSeccion}>
                <Text style={estilos.tituloSeccionTexto}>Cuando puedas</Text>
              </View>
              <View style={estilos.cronologia}>
                <View style={estilos.linea} />
                {sinHora.map((instancia) => (
                  <ItemCard
                    key={clave(instancia)}
                    instancia={instancia}
                    onPressCheck={() => onToggleInstancia(instancia)}
                    onPosponer={() => onPosponerInstancia(instancia)}
                    onPressCuerpo={
                      instancia.item.tipo === 'entreno'
                        ? () => onAbrirSesion(instancia)
                        : undefined
                    }
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
  contenido: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    flexGrow: 1,
  },
  tituloSeccion: {
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  tituloSeccionTexto: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  contador: {
    fontSize: 12,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
  },
  cronologia: {
    position: 'relative',
    paddingLeft: 24,
  },
  linea: {
    position: 'absolute',
    left: 7,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 2,
    backgroundColor: paleta.line,
  },
  ahora: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    marginLeft: -24,
  },
  ahoraPill: {
    backgroundColor: paleta.ambar,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 9,
    zIndex: 1,
  },
  ahoraTexto: {
    color: paleta.sobreInk,
    fontSize: 10.5,
    fontFamily: fuente.uiSemi,
    letterSpacing: 0.6,
  },
  ahoraLinea: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: paleta.ambar,
  },
});
