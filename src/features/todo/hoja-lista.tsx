// Alta manual de una lista viva (compra, películas, regalos…), igual que
// Referencia: las listas no se capturan por texto — se crean aquí y sus
// elementos se añaden dentro (DetalleLista).

import { useSQLiteContext } from 'expo-sqlite';
import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { asegurarLista } from '@/db/repositorios/listas';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { useTiendaEditor } from '@/features/items/tienda-editor';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  visible: boolean;
  onCerrar: () => void;
}

export function HojaLista({ visible, onCerrar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);
  const abrirEditor = useTiendaEditor((estado) => estado.abrir);
  const [nombre, setNombre] = useState('');

  const limpiarYCerrar = () => {
    setNombre('');
    onCerrar();
  };

  const guardar = async () => {
    if (!nombre.trim()) return;
    // asegurarLista reutiliza la contenedora si ya existe con ese nombre
    const lista = await asegurarLista(db, nombre.trim());
    refrescar();
    limpiarYCerrar();
    mostrarToast(`Lista ${lista.titulo} lista ✓`);
    abrirEditor(lista); // se abre su detalle para añadir lo primero
  };

  return (
    <HojaInferior visible={visible} onCerrar={limpiarYCerrar}>
      <Text style={estilos.etiqueta}>Nueva lista</Text>
      <TextInput
        style={estilos.campo}
        value={nombre}
        onChangeText={setNombre}
        placeholder="p. ej. «Compra»"
        placeholderTextColor={paleta.muted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={guardar}
        accessibilityLabel="Nombre de la lista"
      />
      <Text style={estilos.pista}>Luego añades lo que quieras dentro de la lista.</Text>
      <Pressable
        onPress={guardar}
        accessibilityRole="button"
        disabled={!nombre.trim()}
        style={[estilos.guardar, !nombre.trim() && estilos.guardarInactivo]}
      >
        <Text style={estilos.guardarTexto}>Crear</Text>
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
    campo: {
      marginTop: 10,
      borderWidth: 1.5,
      borderColor: paleta.line,
      borderRadius: radios.campo,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: tipografia.titulo,
      fontFamily: fuente.uiRegular,
      color: paleta.ink,
    },
    pista: {
      marginTop: 8,
      fontSize: 12.5,
      fontFamily: fuente.uiRegular,
      color: paleta.muted,
    },
    guardar: {
      marginTop: 14,
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
