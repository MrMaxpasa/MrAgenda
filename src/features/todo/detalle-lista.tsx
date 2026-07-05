// Detalle de una lista viva: elementos marcables (hechos tachados al
// final) y campo para añadir sin salir de la hoja.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import * as items from '@/db/repositorios/items';
import { anadirElemento, elementosDeLista } from '@/db/repositorios/listas';
import type { Item } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { fuente } from '@/theme/fonts';
import { paleta, radios, tipografia } from '@/theme/tokens';

import { FilaTodo } from './fila-todo';

interface Props {
  lista: Item;
  onCerrar: () => void;
}

export function DetalleLista({ lista, onCerrar }: Props) {
  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const version = useTiendaHoy((estado) => estado.version);
  const [elementos, setElementos] = useState<Item[]>([]);
  const [nuevo, setNuevo] = useState('');

  useEffect(() => {
    let vivo = true;
    elementosDeLista(db, lista.id)
      .then((lista_) => {
        if (vivo) setElementos(lista_);
      })
      .catch((error) => console.error('[todo] error cargando la lista:', error));
    return () => {
      vivo = false;
    };
  }, [db, lista.id, version]);

  const alternar = async (elemento: Item) => {
    await items.actualizar(db, elemento.id, {
      estado: elemento.estado === 'hecho' ? 'pendiente' : 'hecho',
    });
    refrescar();
  };

  const anadir = async () => {
    if (!nuevo.trim()) return;
    await anadirElemento(db, lista.id, nuevo.trim());
    setNuevo('');
    refrescar();
  };

  const pendientes = elementos.filter((e) => e.estado === 'pendiente').length;

  return (
    <HojaInferior visible onCerrar={onCerrar}>
      <View style={estilos.cabecera}>
        <Text style={estilos.etiqueta}>{lista.titulo}</Text>
        <Text style={estilos.contador}>
          {pendientes === 0 && elementos.length > 0 ? 'lista al día ✓' : `${pendientes} pendientes`}
        </Text>
      </View>

      <ScrollView style={estilos.lista} keyboardShouldPersistTaps="handled">
        {elementos.map((elemento) => (
          <FilaTodo key={elemento.id} item={elemento} onToggle={() => alternar(elemento)} />
        ))}
        {elementos.length === 0 && (
          <Text style={estilos.vacio}>Nada aún. Añade lo primero abajo.</Text>
        )}
      </ScrollView>

      <TextInput
        style={estilos.campo}
        value={nuevo}
        onChangeText={setNuevo}
        placeholder="Añadir a la lista…"
        placeholderTextColor={paleta.muted}
        returnKeyType="done"
        onSubmitEditing={anadir}
        blurOnSubmit={false}
        accessibilityLabel={`Añadir a ${lista.titulo}`}
      />
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  etiqueta: {
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
  lista: {
    marginTop: 8,
    maxHeight: 320,
  },
  vacio: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    paddingVertical: 14,
  },
  campo: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: paleta.line,
    borderRadius: radios.campo,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
});
