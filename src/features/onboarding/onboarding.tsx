// Onboarding de 3 pasos (docs/06 Fase 6): nombre → primer hábito → primera
// captura. Tono cálido y sin fricción (docs/03): los dos últimos se pueden
// saltar. Reutiliza crearHabito, interpretar() y crear() ya existentes.

import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { crear } from '@/db/repositorios/items';
import { crearHabito } from '@/db/repositorios/habitos';
import { interpretar } from '@/features/captura/parser';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

import { completarOnboarding, guardarNombre } from './tienda-perfil';

const ICONOS = ['💧', '📖', '🧘', '😴', '🏃', '🥗'];

export function Onboarding() {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState('');
  const [habito, setHabito] = useState('');
  const [icono, setIcono] = useState(ICONOS[0]!);
  const [captura, setCaptura] = useState('');

  const interpretacion = useMemo(
    () => (captura.trim().length >= 3 ? interpretar(captura, new Date()) : null),
    [captura],
  );

  const terminar = async () => {
    await completarOnboarding(db);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pasoNombre = async () => {
    if (nombre.trim()) await guardarNombre(db, nombre);
    setPaso(1);
  };

  const pasoHabito = async () => {
    if (habito.trim()) await crearHabito(db, { titulo: habito.trim(), icono, dias: 'diario' });
    setPaso(2);
  };

  const pasoCaptura = async () => {
    const r = interpretacion;
    if (r && captura.trim()) {
      let fecha_inicio: string | null = null;
      let todo_el_dia = false;
      if (r.fecha && r.hora) {
        fecha_inicio = `${r.fecha}T${String(r.hora.hora).padStart(2, '0')}:${String(
          r.hora.minuto,
        ).padStart(2, '0')}`;
      } else if (r.fecha) {
        fecha_inicio = r.fecha;
        todo_el_dia = true;
      }
      await crear(db, {
        tipo: r.tipo === 'referencia' ? 'nota' : r.tipo,
        titulo: r.titulo,
        fecha_inicio,
        todo_el_dia,
        rrule: r.recurrencia?.rrule ?? null,
        rrule_fin: r.recurrencia?.fin ?? null,
      });
    }
    await terminar();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[estilos.pantalla, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={estilos.puntos}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[estilos.punto, i === paso && estilos.puntoActivo]} />
        ))}
      </View>

      <View style={estilos.centro}>
        {paso === 0 && (
          <>
            <Text style={estilos.saludo}>Hola 👋</Text>
            <Text style={estilos.texto}>
              Soy tu agenda. Antes de empezar, ¿cómo te llamo?
            </Text>
            <TextInput
              style={estilos.campo}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={paleta.muted}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={pasoNombre}
              accessibilityLabel="Tu nombre"
            />
          </>
        )}

        {paso === 1 && (
          <>
            <Text style={estilos.saludo}>Tu primer hábito</Text>
            <Text style={estilos.texto}>
              Algo pequeño que quieras hacer cada día. Podrás cambiarlo luego.
            </Text>
            <View style={estilos.iconos}>
              {ICONOS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setIcono(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`Icono ${emoji}`}
                  style={[estilos.icono, icono === emoji && estilos.iconoActivo]}
                >
                  <Text style={estilos.iconoTexto}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={estilos.campo}
              value={habito}
              onChangeText={setHabito}
              placeholder="p. ej. «Beber agua»"
              placeholderTextColor={paleta.muted}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={pasoHabito}
              accessibilityLabel="Nombre del hábito"
            />
          </>
        )}

        {paso === 2 && (
          <>
            <Text style={estilos.saludo}>Prueba a anotar algo</Text>
            <Text style={estilos.texto}>
              Escribe como hablas y yo lo ordeno. Sin formularios.
            </Text>
            <TextInput
              style={estilos.campo}
              value={captura}
              onChangeText={setCaptura}
              placeholder="p. ej. «médico el jueves a las 10»"
              placeholderTextColor={paleta.muted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={pasoCaptura}
              accessibilityLabel="Primera captura"
            />
            {interpretacion && (
              <Text style={estilos.pista}>
                Lo guardaré como {interpretacion.tipo}
                {interpretacion.fecha ? ` · ${interpretacion.fecha}` : ''} ✓
              </Text>
            )}
          </>
        )}
      </View>

      <View style={estilos.acciones}>
        {paso === 0 && (
          <Pressable
            onPress={pasoNombre}
            accessibilityRole="button"
            disabled={!nombre.trim()}
            style={[estilos.primario, !nombre.trim() && estilos.primarioInactivo]}
          >
            <Text style={estilos.primarioTexto}>Empezar</Text>
          </Pressable>
        )}
        {paso === 1 && (
          <>
            <Pressable onPress={pasoHabito} accessibilityRole="button" style={estilos.primario}>
              <Text style={estilos.primarioTexto}>{habito.trim() ? 'Siguiente' : 'Ahora no'}</Text>
            </Pressable>
          </>
        )}
        {paso === 2 && (
          <Pressable onPress={pasoCaptura} accessibilityRole="button" style={estilos.primario}>
            <Text style={estilos.primarioTexto}>
              {captura.trim() ? 'Guardar y entrar' : 'Entrar'}
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const crearEstilos = (paleta: Colores) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: paleta.paper,
      paddingHorizontal: 26,
    },
    puntos: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    punto: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: paleta.line,
    },
    puntoActivo: {
      backgroundColor: paleta.ink,
      width: 22,
    },
    centro: {
      flex: 1,
      justifyContent: 'center',
    },
    saludo: {
      fontSize: 30,
      fontFamily: fuente.displayItalica,
      color: paleta.ink,
    },
    texto: {
      marginTop: 10,
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
      lineHeight: 22,
    },
    campo: {
      marginTop: 22,
      borderWidth: 1.5,
      borderColor: paleta.line,
      borderRadius: radios.campo,
      paddingVertical: 14,
      paddingHorizontal: 15,
      fontSize: 17,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    iconos: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 20,
    },
    icono: {
      width: 48,
      height: 48,
      borderRadius: radios.campo,
      borderWidth: 1,
      borderColor: paleta.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconoActivo: {
      borderColor: paleta.deporte,
      backgroundColor: paleta.deporteSuave,
    },
    iconoTexto: {
      fontSize: 22,
    },
    pista: {
      marginTop: 12,
      fontSize: tipografia.meta,
      fontFamily: fuente.uiRegular,
      color: paleta.deporte,
    },
    acciones: {
      gap: 8,
    },
    primario: {
      borderRadius: radios.campo,
      backgroundColor: paleta.ink,
      paddingVertical: 15,
      alignItems: 'center',
    },
    primarioInactivo: {
      opacity: 0.4,
    },
    primarioTexto: {
      color: paleta.sobreInk,
      fontSize: 16,
      fontFamily: fuente.uiMedia,
    },
  });
