import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cargarModuloOpcional } from '@/lib/modulo-opcional';

// nativos opcionales: sin ellos en el binario, el botón de compartir no aparece
const Sharing = cargarModuloOpcional(
  () => require('expo-sharing') as typeof import('expo-sharing'),
);
const ViewShot = cargarModuloOpcional(
  () => require('react-native-view-shot') as typeof import('react-native-view-shot'),
);

import { Pantalla } from '@/components/pantalla';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { Calendario, type Granularidad } from '@/features/tu/calendario';
import { diasDeCuadriculaMes, diasDeSemana } from '@/features/tu/dias-calendario';
import { estadisticasDePeriodo, type Estadisticas } from '@/features/tu/estadisticas';
import { PanelDia } from '@/features/tu/panel-dia';
import { rangoDePeriodo } from '@/features/tu/periodos';
import {
  calcularConsistencia,
  resumenSemanal,
  textoDelta,
  type ResumenSemanal,
} from '@/features/tu/revision';
import { useDiasCalendario } from '@/features/tu/use-dias-calendario';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

const GRANULARIDADES: { clave: Granularidad; etiqueta: string }[] = [
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'mes', etiqueta: 'Mes' },
];

export default function PantallaTu() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);

  const hoy = useMemo(() => new Date(), []);
  const hoyISO = aFechaISO(hoy);

  const [granularidad, setGranularidad] = useState<Granularidad>('semana');
  const [ancla, setAncla] = useState<Date>(hoy);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(hoyISO);

  const rango = useMemo(() => rangoDePeriodo(granularidad, ancla), [granularidad, ancla]);

  // días visibles del calendario según la granularidad
  const fechasVisibles = useMemo(
    () =>
      granularidad === 'semana'
        ? diasDeSemana(ancla)
        : diasDeCuadriculaMes(ancla).map((c) => c.fecha),
    [granularidad, ancla],
  );
  const mapa = useDiasCalendario(fechasVisibles);

  const navegar = (delta: number) => {
    const nueva =
      granularidad === 'semana'
        ? sumarDias(ancla, delta * 7)
        : new Date(ancla.getFullYear(), ancla.getMonth() + delta, 1);
    setAncla(nueva);
    // seleccionar hoy si cae en el nuevo periodo; si no, el primer día
    const nuevoRango = rangoDePeriodo(granularidad, nueva);
    setDiaSeleccionado(hoyISO >= nuevoRango.desde && hoyISO <= nuevoRango.hasta ? hoyISO : nuevoRango.desde);
  };

  const cambiarGranularidad = (g: Granularidad) => {
    setGranularidad(g);
    setAncla(hoy);
    setDiaSeleccionado(hoyISO);
  };

  // estadísticas del periodo navegado
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [consistencia, setConsistencia] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    Promise.all([
      estadisticasDePeriodo(db, rango, hoyISO),
      calcularConsistencia(db, rango, hoyISO),
    ])
      .then(([e, c]) => {
        if (!vivo) return;
        setDatos(e);
        setConsistencia(c);
      })
      .catch((error) => console.error('[tu] error calculando estadísticas:', error));
    return () => {
      vivo = false;
    };
  }, [db, rango, hoyISO, version]);

  // «Tu semana» compartible: solo cuando el periodo visible contiene hoy
  const periodoEsActual = hoyISO >= rango.desde && hoyISO <= rango.hasta;
  const [semana, setSemana] = useState<ResumenSemanal | null>(null);
  const refSemana = useRef<View>(null);
  useEffect(() => {
    if (!periodoEsActual) {
      setSemana(null);
      return;
    }
    let vivo = true;
    resumenSemanal(db, new Date())
      .then((r) => vivo && setSemana(r))
      .catch((error) => console.error('[tu] error en la revisión semanal:', error));
    return () => {
      vivo = false;
    };
  }, [db, periodoEsActual, version]);

  const puedeCompartir = Sharing !== null && ViewShot !== null;
  const compartirSemana = async () => {
    if (!refSemana.current || !Sharing || !ViewShot) return;
    try {
      const uri = await ViewShot.captureRef(refSemana, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (error) {
      console.error('[tu] error compartiendo la semana:', error);
    }
  };

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Tú</Text>
      </View>

      <View style={estilos.selector} accessibilityRole="tablist">
        {GRANULARIDADES.map(({ clave, etiqueta }) => (
          <Pressable
            key={clave}
            onPress={() => cambiarGranularidad(clave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: granularidad === clave }}
            style={[estilos.opcion, granularidad === clave && estilos.opcionActiva]}
          >
            <Text
              style={[estilos.opcionTexto, granularidad === clave && estilos.opcionTextoActivo]}
            >
              {etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Calendario
          granularidad={granularidad}
          ancla={ancla}
          diaSeleccionado={diaSeleccionado}
          hoyISO={hoyISO}
          mapa={mapa}
          onNavegar={navegar}
          onSeleccionar={setDiaSeleccionado}
        />

        <PanelDia
          fecha={diaSeleccionado}
          hoyISO={hoyISO}
          instancias={mapa.get(diaSeleccionado) ?? []}
        />

        <View style={estilos.filaTarjetas}>
          <View style={estilos.tarjeta}>
            <Text style={estilos.numero}>{datos?.completadas ?? '–'}</Text>
            <Text style={estilos.etiquetaTarjeta}>completadas</Text>
          </View>
          <View style={estilos.tarjeta}>
            <Text style={estilos.numero}>{datos?.entrenos ?? '–'}</Text>
            <Text style={estilos.etiquetaTarjeta}>entrenos</Text>
          </View>
          <View style={estilos.tarjeta}>
            <Text style={estilos.numero}>{consistencia === null ? '–' : `${consistencia}%`}</Text>
            <Text style={estilos.etiquetaTarjeta}>consistencia</Text>
          </View>
        </View>

        {semana && (
          <>
            <Text style={estilos.tituloSeccion}>Tu semana</Text>
            <View ref={refSemana} collapsable={false} style={estilos.tarjetaSemana}>
              <Text style={estilos.semanaTitulo}>Diaria · tu semana</Text>
              <View style={estilos.semanaFila}>
                <Text style={estilos.semanaNumero}>{semana.completadas}</Text>
                <View style={estilos.semanaTextos}>
                  <Text style={estilos.semanaDato}>cosas completadas</Text>
                  <Text style={estilos.semanaDelta}>{textoDelta(semana.deltaCompletadas)}</Text>
                </View>
              </View>
              <View style={estilos.semanaFila}>
                <Text style={estilos.semanaNumero}>{semana.entrenos}</Text>
                <View style={estilos.semanaTextos}>
                  <Text style={estilos.semanaDato}>entrenos</Text>
                  <Text style={estilos.semanaDelta}>{textoDelta(semana.deltaEntrenos)}</Text>
                </View>
              </View>
              {semana.mejorRacha && (
                <View style={estilos.semanaFila}>
                  <Text style={estilos.semanaNumero}>{semana.mejorRacha.icono}</Text>
                  <View style={estilos.semanaTextos}>
                    <Text style={estilos.semanaDato}>
                      {semana.mejorRacha.titulo}: racha de {semana.mejorRacha.dias}
                    </Text>
                  </View>
                </View>
              )}
              {semana.consistencia !== null && (
                <View style={estilos.semanaFila}>
                  <Text style={estilos.semanaNumero}>{semana.consistencia}%</Text>
                  <View style={estilos.semanaTextos}>
                    <Text style={estilos.semanaDato}>de lo previsto, hecho</Text>
                    <Text style={estilos.semanaDelta}>
                      {textoDelta(semana.deltaConsistencia, ' pt')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {puedeCompartir && (
              <Pressable
                onPress={compartirSemana}
                accessibilityRole="button"
                style={estilos.compartir}
              >
                <Text style={estilos.compartirTexto}>Compartir como imagen</Text>
              </Pressable>
            )}
          </>
        )}

        {datos && datos.rachas.length > 0 && (
          <>
            <Text style={estilos.tituloSeccion}>Rachas activas</Text>
            <View style={estilos.lista}>
              {datos.rachas.map(({ habito, racha }) => (
                <View key={habito.item.id} style={estilos.filaRacha}>
                  <Text style={estilos.rachaIcono}>{habito.icono}</Text>
                  <Text style={estilos.rachaNombre} numberOfLines={1}>
                    {habito.item.titulo}
                  </Text>
                  {racha.comodinUsadoEstaSemana && <Text style={estilos.comodin}>🃏</Text>}
                  <Text style={estilos.rachaFuego}>🔥 {racha.actual}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {datos?.mejorRecord && (
          <>
            <Text style={estilos.tituloSeccion}>Tu récord</Text>
            <View style={estilos.lista}>
              <View style={estilos.filaRacha}>
                <Text style={estilos.rachaIcono}>{datos.mejorRecord.habito.icono}</Text>
                <Text style={estilos.rachaNombre} numberOfLines={1}>
                  {datos.mejorRecord.habito.item.titulo}
                </Text>
                <Text style={estilos.rachaFuego}>🏆 {datos.mejorRecord.racha.record} días</Text>
              </View>
            </View>
          </>
        )}

        <View style={estilos.pie} />
      </ScrollView>
    </Pantalla>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    cabecera: {
      paddingHorizontal: 2,
      paddingBottom: 6,
    },
    eyebrow: {
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    selector: {
      flexDirection: 'row',
      backgroundColor: paleta.fog,
      borderRadius: radios.pill,
      padding: 4,
      marginTop: 12,
      marginBottom: 12,
    },
    opcion: {
      flex: 1,
      minHeight: 40,
      borderRadius: radios.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    opcionActiva: {
      backgroundColor: paleta.card,
    },
    opcionTexto: {
      fontSize: 13.5,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
    opcionTextoActivo: {
      color: paleta.ink,
    },
    filaTarjetas: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    tarjeta: {
      flex: 1,
      backgroundColor: paleta.card,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      paddingVertical: 16,
      alignItems: 'center',
    },
    numero: {
      fontSize: 30,
      fontFamily: fuente.displayLigera,
      color: paleta.ink,
    },
    etiquetaTarjeta: {
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      marginTop: 2,
    },
    tituloSeccion: {
      marginTop: 22,
      marginBottom: 10,
      paddingHorizontal: 2,
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    tarjetaSemana: {
      backgroundColor: paleta.card,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      padding: 16,
    },
    semanaTitulo: {
      fontSize: 11,
      fontFamily: fuente.uiMedia,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: paleta.muted,
      marginBottom: 6,
    },
    semanaFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
    },
    semanaNumero: {
      fontSize: 24,
      fontFamily: fuente.displayLigera,
      color: paleta.ink,
      minWidth: 52,
    },
    semanaTextos: {
      flex: 1,
    },
    semanaDato: {
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    semanaDelta: {
      fontSize: 12,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      marginTop: 1,
    },
    compartir: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    compartirTexto: {
      fontSize: 13.5,
      fontFamily: fuente.uiMedia,
      color: paleta.evento,
    },
    lista: {
      backgroundColor: paleta.card,
      borderWidth: 1,
      borderColor: paleta.line,
      borderRadius: radios.tarjeta,
      paddingHorizontal: 15,
    },
    filaRacha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: paleta.line,
    },
    rachaIcono: {
      fontSize: 18,
    },
    rachaNombre: {
      flex: 1,
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    comodin: {
      fontSize: 13,
    },
    rachaFuego: {
      fontSize: tipografia.meta,
      fontFamily: fuente.uiSemi,
      color: paleta.ambar,
    },
    pie: {
      height: 110,
    },
  });
