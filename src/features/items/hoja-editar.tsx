// Edición de un ítem ya guardado: título, fecha, hora y nivel de aviso.
// Sin picker nativo (coherente con la captura): chips rápidos para la
// fecha y campo HH:MM para la hora. En series recurrentes la fecha/hora
// las gobierna la RRULE, así que solo se editan título y aviso.

import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { actualizar } from '@/db/repositorios/items';
import type { Item, NivelAviso } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { aFechaISO, sumarDias } from '@/lib/fechas';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

const ETIQUETA_AVISO: Record<NivelAviso, string> = {
  0: '🔕 Silencioso',
  1: '🔔 Aviso',
  2: '⏰ Alarma',
};

const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

interface Props {
  item: Item;
  onCerrar: () => void;
}

export function HojaEditar({ item, onCerrar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const esSerie = item.rrule !== null;

  const [titulo, setTitulo] = useState(item.titulo);
  const [fecha, setFecha] = useState<string | null>(item.fecha_inicio?.slice(0, 10) ?? null);
  const [hora, setHora] = useState(
    item.fecha_inicio && item.fecha_inicio.length > 10 ? item.fecha_inicio.slice(11, 16) : '',
  );
  const [nivelAviso, setNivelAviso] = useState<NivelAviso>(item.nivel_aviso);

  const hoy = aFechaISO(new Date());
  const manana = aFechaISO(sumarDias(new Date(), 1));
  const horaValida = hora === '' || RE_HORA.test(hora);

  const etiquetaFecha = (f: string): string =>
    f === hoy ? 'hoy' : f === manana ? 'mañana' : `${Number(f.slice(8))}/${Number(f.slice(5, 7))}`;

  const guardar = async () => {
    if (!titulo.trim() || !horaValida) return;
    const cambios: Parameters<typeof actualizar>[2] = { titulo: titulo.trim() };

    if (!esSerie) {
      if (!fecha) {
        cambios.fecha_inicio = null;
        cambios.todo_el_dia = false;
      } else if (hora && RE_HORA.test(hora)) {
        cambios.fecha_inicio = `${fecha}T${hora}`;
        cambios.todo_el_dia = false;
      } else {
        cambios.fecha_inicio = fecha;
        cambios.todo_el_dia = true;
      }
    }

    const tieneHora = !esSerie && !!fecha && !!hora;
    cambios.nivel_aviso = tieneHora ? nivelAviso : item.nivel_aviso;

    await actualizar(db, item.id, cambios);
    refrescar();
    onCerrar();
    mostrarToast('Cambios guardados ✓');
  };

  return (
    <HojaInferior visible onCerrar={onCerrar}>
      <Text style={estilos.etiqueta}>Editar</Text>
      <TextInput
        style={estilos.campo}
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Título"
        placeholderTextColor={paleta.muted}
        accessibilityLabel="Título"
      />

      {esSerie ? (
        <Text style={estilos.nota}>
          Se repite ({item.rrule ? '↻' : ''}): la fecha y la hora las marca la repetición. Para
          mover un día suelto, desliza y usa «Posponer».
        </Text>
      ) : (
        <>
          <Text style={estilos.subetiqueta}>Fecha</Text>
          <View style={estilos.chips}>
            {[
              { clave: hoy, texto: 'Hoy' },
              { clave: manana, texto: 'Mañana' },
            ].map(({ clave, texto }) => (
              <Pressable
                key={clave}
                onPress={() => setFecha(clave)}
                accessibilityRole="button"
                style={[estilos.chip, fecha === clave && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, fecha === clave && estilos.chipTextoActivo]}>
                  {texto}
                </Text>
              </Pressable>
            ))}
            {fecha && fecha !== hoy && fecha !== manana && (
              <View style={[estilos.chip, estilos.chipActivo]}>
                <Text style={[estilos.chipTexto, estilos.chipTextoActivo]}>
                  {etiquetaFecha(fecha)}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                setFecha(null);
                setHora('');
              }}
              accessibilityRole="button"
              style={[estilos.chip, fecha === null && estilos.chipActivo]}
            >
              <Text style={[estilos.chipTexto, fecha === null && estilos.chipTextoActivo]}>
                Sin fecha
              </Text>
            </Pressable>
          </View>

          {fecha && (
            <>
              <Text style={estilos.subetiqueta}>Hora (opcional)</Text>
              <TextInput
                style={[estilos.campo, !horaValida && estilos.campoError]}
                value={hora}
                onChangeText={setHora}
                placeholder="HH:MM"
                placeholderTextColor={paleta.muted}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Hora en formato HH:MM"
              />
              {!horaValida && <Text style={estilos.error}>Usa el formato HH:MM (p. ej. 19:30).</Text>}
            </>
          )}

          {fecha && hora !== '' && horaValida && (
            <Pressable
              onPress={() => setNivelAviso(((nivelAviso + 1) % 3) as NivelAviso)}
              accessibilityRole="button"
              accessibilityLabel={`Nivel de aviso ${ETIQUETA_AVISO[nivelAviso]}, tocar para cambiar`}
              style={estilos.aviso}
            >
              <Text style={estilos.avisoTexto}>{ETIQUETA_AVISO[nivelAviso]} ↺</Text>
            </Pressable>
          )}
        </>
      )}

      <Pressable
        onPress={guardar}
        accessibilityRole="button"
        disabled={!titulo.trim() || !horaValida}
        style={[estilos.guardar, (!titulo.trim() || !horaValida) && estilos.guardarInactivo]}
      >
        <Text style={estilos.guardarTexto}>Guardar cambios</Text>
      </Pressable>
    </HojaInferior>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    etiqueta: {
      fontSize: tipografia.eyebrow,
      fontFamily: fuente.uiMedia,
      letterSpacing: tipografia.trackingEyebrow,
      textTransform: 'uppercase',
      color: paleta.muted,
    },
    subetiqueta: {
      marginTop: 14,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
    campo: {
      marginTop: 10,
      borderWidth: 1.5,
      borderColor: paleta.line,
      borderRadius: radios.campo,
      paddingVertical: 13,
      paddingHorizontal: 14,
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    campoError: {
      borderColor: paleta.ambar,
    },
    error: {
      marginTop: 6,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.ambar,
    },
    nota: {
      marginTop: 12,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      lineHeight: 19,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      borderRadius: radios.pill,
      borderWidth: 1,
      borderColor: paleta.line,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minHeight: 40,
      justifyContent: 'center',
    },
    chipActivo: {
      backgroundColor: paleta.ink,
      borderColor: paleta.ink,
    },
    chipTexto: {
      fontSize: 13,
      fontFamily: fuente.uiMedia,
      color: paleta.muted,
    },
    chipTextoActivo: {
      color: paleta.sobreInk,
    },
    aviso: {
      alignSelf: 'flex-start',
      marginTop: 14,
      backgroundColor: paleta.chipSuave,
      borderRadius: radios.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minHeight: 40,
      justifyContent: 'center',
    },
    avisoTexto: {
      fontSize: 13,
      fontFamily: fuente.uiMedia,
      color: paleta.evento,
    },
    guardar: {
      marginTop: 18,
      borderRadius: radios.campo,
      backgroundColor: paleta.ink,
      paddingVertical: 13,
      alignItems: 'center',
    },
    guardarInactivo: {
      opacity: 0.4,
    },
    guardarTexto: {
      color: paleta.sobreInk,
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiMedia,
    },
  });
