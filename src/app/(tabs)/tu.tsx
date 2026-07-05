import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { estadisticasDePeriodo, type Estadisticas } from '@/features/tu/estadisticas';
import { rangoDePeriodo, type Periodo } from '@/features/tu/periodos';
import {
  calcularConsistencia,
  resumenSemanal,
  textoDelta,
  type ResumenSemanal,
} from '@/features/tu/revision';
import { aFechaISO } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

const PERIODOS: { clave: Periodo; etiqueta: string }[] = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'mes', etiqueta: 'Mes' },
];

function useEstadisticas(periodo: Periodo): Estadisticas | null {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [datos, setDatos] = useState<Estadisticas | null>(null);

  useEffect(() => {
    let vivo = true;
    const ahora = new Date();
    estadisticasDePeriodo(db, rangoDePeriodo(periodo, ahora), aFechaISO(ahora))
      .then((estadisticas) => {
        if (vivo) setDatos(estadisticas);
      })
      .catch((error) => console.error('[tu] error calculando estadísticas:', error));
    return () => {
      vivo = false;
    };
  }, [db, periodo, version]);

  return datos;
}

export default function PantallaTu() {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const datos = useEstadisticas(periodo);

  const [consistencia, setConsistencia] = useState<number | null>(null);
  const [semana, setSemana] = useState<ResumenSemanal | null>(null);
  const refSemana = useRef<View>(null);

  useEffect(() => {
    let vivo = true;
    const ahora = new Date();
    Promise.all([
      calcularConsistencia(db, rangoDePeriodo(periodo, ahora), aFechaISO(ahora)),
      resumenSemanal(db, ahora),
    ])
      .then(([indice, resumen]) => {
        if (!vivo) return;
        setConsistencia(indice);
        setSemana(resumen);
      })
      .catch((error) => console.error('[tu] error calculando la revisión:', error));
    return () => {
      vivo = false;
    };
  }, [db, periodo, version]);

  const compartirSemana = async () => {
    if (!refSemana.current) return;
    try {
      const uri = await captureRef(refSemana, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (error) {
      console.error('[tu] error compartiendo la semana:', error);
    }
  };

  const sinDatos =
    datos !== null && datos.completadas === 0 && datos.rachas.length === 0 && !datos.mejorRecord;

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <Text style={estilos.eyebrow}>Tú</Text>
      </View>

      <View style={estilos.selector} accessibilityRole="tablist">
        {PERIODOS.map(({ clave, etiqueta }) => (
          <Pressable
            key={clave}
            onPress={() => setPeriodo(clave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: periodo === clave }}
            style={[estilos.opcion, periodo === clave && estilos.opcionActiva]}
          >
            <Text style={[estilos.opcionTexto, periodo === clave && estilos.opcionTextoActivo]}>
              {etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      {sinDatos ? (
        <EstadoVacio mensaje="En cuanto completes cosas y arranques un hábito, aquí verás tu progreso." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
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
              <Text style={estilos.numero}>
                {consistencia === null ? '–' : `${consistencia}%`}
              </Text>
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
              <Pressable
                onPress={compartirSemana}
                accessibilityRole="button"
                style={estilos.compartir}
              >
                <Text style={estilos.compartirTexto}>Compartir como imagen</Text>
              </Pressable>
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
        </ScrollView>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
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
    marginBottom: 18,
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
});
