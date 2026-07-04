// Hoja de registro de sesión de deporte: ejercicios con series (reps × peso).
// Se abre al tocar la tarjeta de un entreno; se precarga con la última
// sesión para machacar solo lo que cambia. Guardar registra y completa.

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTiendaToast } from '@/components/toast';
import { completar } from '@/db/repositorios/items';
import { guardarSesion, ultimasSesiones, type Ejercicio } from '@/db/repositorios/sesiones';
import { useTiendaHoy } from '@/features/hoy/tienda';
import type { Instancia } from '@/features/items/instancias';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

interface SerieForm {
  reps: string;
  peso: string;
}

interface EjercicioForm {
  nombre: string;
  series: SerieForm[];
}

const VACIO: EjercicioForm = { nombre: '', series: [{ reps: '', peso: '' }] };

function deSesion(ejercicios: Ejercicio[]): EjercicioForm[] {
  return ejercicios.map((e) => ({
    nombre: e.nombre,
    series: e.series.map((s) => ({
      reps: String(s.reps),
      peso: s.peso === null ? '' : String(s.peso).replace('.', ','),
    })),
  }));
}

function aSesion(formulario: EjercicioForm[]): Ejercicio[] {
  return formulario
    .filter((e) => e.nombre.trim())
    .map((e) => ({
      nombre: e.nombre.trim(),
      series: e.series
        .filter((s) => s.reps.trim() || s.peso.trim())
        .map((s) => ({
          reps: parseInt(s.reps, 10) || 0,
          peso: s.peso.trim() ? parseFloat(s.peso.replace(',', '.')) : null,
        })),
    }))
    .filter((e) => e.series.length > 0);
}

interface Props {
  instancia: Instancia | null;
  onCerrar: () => void;
}

export function HojaSesion({ instancia, onCerrar }: Props) {
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);
  const [ejercicios, setEjercicios] = useState<EjercicioForm[]>([VACIO]);

  // precarga con la última sesión del entreno
  useEffect(() => {
    if (!instancia) return;
    let vivo = true;
    ultimasSesiones(db)
      .then((mapa) => {
        if (!vivo) return;
        const anterior = mapa.get(instancia.item.id);
        setEjercicios(anterior && anterior.ejercicios.length > 0 ? deSesion(anterior.ejercicios) : [VACIO]);
      })
      .catch(() => setEjercicios([VACIO]));
    return () => {
      vivo = false;
    };
  }, [db, instancia]);

  if (!instancia) return null;

  const editar = (i: number, cambios: Partial<EjercicioForm>) => {
    setEjercicios((lista) => lista.map((e, idx) => (idx === i ? { ...e, ...cambios } : e)));
  };

  const editarSerie = (i: number, j: number, cambios: Partial<SerieForm>) => {
    setEjercicios((lista) =>
      lista.map((e, idx) =>
        idx === i
          ? { ...e, series: e.series.map((s, jdx) => (jdx === j ? { ...s, ...cambios } : s)) }
          : e,
      ),
    );
  };

  const guardar = async () => {
    const sesion = aSesion(ejercicios);
    if (sesion.length === 0) return;
    await guardarSesion(db, instancia.item.id, instancia.fecha, sesion);
    if (!instancia.hecha) {
      await completar(db, instancia.item.id, instancia.fechaOriginal);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refrescar();
    onCerrar();
    mostrarToast('Sesión guardada ✓');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={estilos.overlay} onPress={onCerrar}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Pressable style={estilos.hoja} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.asa} />
            <Text style={estilos.etiqueta}>Sesión · {instancia.item.titulo}</Text>

            <ScrollView style={estilos.lista} keyboardShouldPersistTaps="handled">
              {ejercicios.map((ejercicio, i) => (
                <View key={i} style={estilos.ejercicio}>
                  <TextInput
                    style={estilos.nombre}
                    value={ejercicio.nombre}
                    onChangeText={(nombre) => editar(i, { nombre })}
                    placeholder="Ejercicio (p. ej. press banca)"
                    placeholderTextColor={paleta.muted}
                    accessibilityLabel={`Nombre del ejercicio ${i + 1}`}
                  />
                  {ejercicio.series.map((serie, j) => (
                    <View key={j} style={estilos.serie}>
                      <Text style={estilos.serieNumero}>{j + 1}ª</Text>
                      <TextInput
                        style={estilos.campoCorto}
                        value={serie.reps}
                        onChangeText={(reps) => editarSerie(i, j, { reps })}
                        placeholder="reps"
                        placeholderTextColor={paleta.muted}
                        keyboardType="number-pad"
                        accessibilityLabel="Repeticiones"
                      />
                      <Text style={estilos.serieSeparador}>×</Text>
                      <TextInput
                        style={estilos.campoCorto}
                        value={serie.peso}
                        onChangeText={(peso) => editarSerie(i, j, { peso })}
                        placeholder="kg"
                        placeholderTextColor={paleta.muted}
                        keyboardType="decimal-pad"
                        accessibilityLabel="Peso en kilos"
                      />
                    </View>
                  ))}
                  <Pressable
                    onPress={() =>
                      editar(i, { series: [...ejercicio.series, { reps: '', peso: '' }] })
                    }
                    accessibilityRole="button"
                    style={estilos.anadir}
                  >
                    <Text style={estilos.anadirTexto}>+ serie</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={() => setEjercicios((lista) => [...lista, { ...VACIO }])}
                accessibilityRole="button"
                style={estilos.anadir}
              >
                <Text style={estilos.anadirTexto}>+ ejercicio</Text>
              </Pressable>
            </ScrollView>

            <Pressable onPress={guardar} accessibilityRole="button" style={estilos.guardar}>
              <Text style={estilos.guardarTexto}>Guardar sesión</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,36,48,.3)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: paleta.card,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  asa: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: paleta.line,
    alignSelf: 'center',
    marginBottom: 14,
  },
  etiqueta: {
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  lista: {
    marginTop: 10,
    maxHeight: 340,
  },
  ejercicio: {
    borderWidth: 1,
    borderColor: paleta.line,
    borderRadius: radios.campo,
    padding: 12,
    marginBottom: 10,
  },
  nombre: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
    color: paleta.ink,
    paddingVertical: 4,
  },
  serie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  serieNumero: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiSemi,
    color: paleta.muted,
    width: 24,
  },
  campoCorto: {
    flex: 1,
    borderWidth: 1,
    borderColor: paleta.line,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
    minHeight: 44,
  },
  serieSeparador: {
    color: paleta.muted,
    fontSize: tipografia.titulo,
  },
  anadir: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anadirTexto: {
    color: paleta.evento,
    fontSize: 13.5,
    fontFamily: fuente.uiMedia,
  },
  guardar: {
    marginTop: 8,
    borderRadius: radios.campo,
    backgroundColor: paleta.ink,
    paddingVertical: 13,
    alignItems: 'center',
  },
  guardarTexto: {
    color: '#FFFFFF',
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
});
