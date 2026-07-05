// Alta rápida de un dato de Referencia (tallas, matrícula, wifi…).

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { crear } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

interface Props {
  visible: boolean;
  onCerrar: () => void;
}

export function HojaReferencia({ visible, onCerrar }: Props) {
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');

  const limpiarYCerrar = () => {
    setTitulo('');
    setCuerpo('');
    onCerrar();
  };

  const guardar = async () => {
    if (!titulo.trim()) return;
    await crear(db, {
      tipo: 'referencia',
      titulo: titulo.trim(),
      cuerpo: cuerpo.trim() || null,
      todo_el_dia: true,
    });
    refrescar();
    limpiarYCerrar();
    mostrarToast('Guardado en Referencia ✓');
  };

  return (
    <HojaInferior visible={visible} onCerrar={limpiarYCerrar}>
      <Text style={estilos.etiqueta}>Nueva referencia</Text>
      <TextInput
        style={estilos.campo}
        value={titulo}
        onChangeText={setTitulo}
        placeholder="p. ej. «Wifi de casa»"
        placeholderTextColor={paleta.muted}
        autoFocus
        accessibilityLabel="Título de la referencia"
      />
      <TextInput
        style={[estilos.campo, estilos.campoCuerpo]}
        value={cuerpo}
        onChangeText={setCuerpo}
        placeholder="El dato (contraseña, número, talla…)"
        placeholderTextColor={paleta.muted}
        multiline
        accessibilityLabel="Contenido de la referencia"
      />
      <Pressable
        onPress={guardar}
        accessibilityRole="button"
        disabled={!titulo.trim()}
        style={[estilos.guardar, !titulo.trim() && estilos.guardarInactivo]}
      >
        <Text style={estilos.guardarTexto}>Guardar</Text>
      </Pressable>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
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
  campoCuerpo: {
    minHeight: 70,
    textAlignVertical: 'top',
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
    color: '#FFFFFF',
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiMedia,
  },
});
