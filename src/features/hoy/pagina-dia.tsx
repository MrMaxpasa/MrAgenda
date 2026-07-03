// Una página del pager de Hoy: la cronología completa de un día.
// El marcador AHORA solo se muestra si la página es el día actual.

import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EstadoVacio } from '@/components/estado-vacio';
import { ItemCard } from '@/components/item-card';
import type { Item } from '@/db/tipos';
import { fuente } from '@/theme/fonts';
import { paleta, tipografia } from '@/theme/tokens';

import { useItemsDelDia } from './use-items-del-dia';

interface Props {
  fecha: string; // YYYY-MM-DD
  esHoy: boolean;
  ancho: number;
  onToggleItem: (item: Item) => void;
}

function MarcadorAhora({ etiqueta }: { etiqueta: string }) {
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

export function PaginaDia({ fecha, esHoy, ancho, onToggleItem }: Props) {
  const items = useItemsDelDia(fecha);
  const ahora = useMinutoActual(esHoy);

  const conHora = items.filter((i) => !i.todo_el_dia);
  const sinHora = items.filter((i) => i.todo_el_dia);
  const pendientes = items.filter((i) => i.estado === 'pendiente').length;

  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(
    ahora.getMinutes(),
  ).padStart(2, '0')}`;

  const filas: ReactElement[] = [];
  let marcadorPuesto = !esHoy;
  for (const item of conHora) {
    const horaItem = item.fecha_inicio!.slice(11, 16);
    if (!marcadorPuesto && horaItem > horaActual) {
      filas.push(<MarcadorAhora key="ahora" etiqueta={`AHORA · ${horaActual}`} />);
      marcadorPuesto = true;
    }
    filas.push(<ItemCard key={item.id} item={item} onPressCheck={() => onToggleItem(item)} />);
  }
  if (!marcadorPuesto && conHora.length > 0) {
    filas.push(<MarcadorAhora key="ahora" etiqueta={`AHORA · ${horaActual}`} />);
  }

  return (
    <ScrollView
      style={{ width: ancho }}
      contentContainerStyle={estilos.contenido}
      showsVerticalScrollIndicator={false}
    >
      {items.length === 0 ? (
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
                {sinHora.map((item) => (
                  <ItemCard key={item.id} item={item} onPressCheck={() => onToggleItem(item)} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
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
    color: '#FFFFFF',
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
