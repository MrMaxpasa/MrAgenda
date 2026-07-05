// Detalle de una nota: cuerpo y enlaces (nota ↔ evento/tarea), con
// buscador para enlazar — la semilla del futuro mapa mental.

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaInferior } from '@/components/hoja-inferior';
import { useTiendaToast } from '@/components/toast';
import { crearEnlace, eliminarEnlace, enlacesDe, type Enlazado } from '@/db/repositorios/enlaces';
import { archivar, buscar } from '@/db/repositorios/items';
import type { Item } from '@/db/tipos';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { fuente } from '@/theme/fonts';
import { radios, tipografia, type Colores } from '@/theme/tokens';
import { usePaleta } from '@/theme/use-tema';

interface Props {
  nota: Item;
  onCerrar: () => void;
}

export function DetalleNota({ nota, onCerrar }: Props) {
  const paleta = usePaleta();
  const estilos = useMemo(() => crearEstilos(paleta), [paleta]);

  const db = useSQLiteContext();
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const version = useTiendaHoy((estado) => estado.version);
  const [enlaces, setEnlaces] = useState<Enlazado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState<Item[]>([]);

  useEffect(() => {
    let vivo = true;
    enlacesDe(db, nota.id)
      .then((lista) => {
        if (vivo) setEnlaces(lista);
      })
      .catch((error) => console.error('[todo] error cargando enlaces:', error));
    return () => {
      vivo = false;
    };
  }, [db, nota.id, version]);

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setCandidatos([]);
      return;
    }
    let vivo = true;
    const temporizador = setTimeout(() => {
      buscar(db, busqueda.trim())
        .then((resultados) => {
          if (!vivo) return;
          const yaEnlazados = new Set(enlaces.map((e) => e.item.id));
          setCandidatos(
            resultados.filter((r) => r.id !== nota.id && !yaEnlazados.has(r.id)).slice(0, 5),
          );
        })
        .catch(() => setCandidatos([]));
    }, 200);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [db, busqueda, enlaces, nota.id]);

  const enlazar = async (destino: Item) => {
    await crearEnlace(db, nota.id, destino.id, 'nota-de');
    setBusqueda('');
    refrescar();
  };

  const desenlazar = async (enlazado: Enlazado) => {
    await eliminarEnlace(db, nota.id, enlazado.item.id);
    await eliminarEnlace(db, enlazado.item.id, nota.id);
    refrescar();
  };

  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  const archivarNota = async () => {
    await archivar(db, nota.id);
    refrescar();
    onCerrar();
    mostrarToast('Archivada — sigue en el historial ✓');
  };

  return (
    <HojaInferior visible onCerrar={onCerrar}>
      <Text style={estilos.etiqueta}>Nota</Text>
      <Text style={estilos.titulo}>{nota.titulo}</Text>
      {nota.cuerpo ? <Text style={estilos.cuerpo}>{nota.cuerpo}</Text> : null}

      <Text style={estilos.seccion}>Enlazada con</Text>
      <ScrollView style={estilos.lista} keyboardShouldPersistTaps="handled">
        {enlaces.map((enlazado) => (
          <View key={enlazado.item.id} style={estilos.filaEnlace}>
            <Text style={estilos.enlaceTitulo} numberOfLines={1}>
              {enlazado.item.titulo}
            </Text>
            <Pressable
              onPress={() => desenlazar(enlazado)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Quitar enlace con ${enlazado.item.titulo}`}
            >
              <Text style={estilos.quitar}>×</Text>
            </Pressable>
          </View>
        ))}
        {enlaces.length === 0 && (
          <Text style={estilos.vacio}>Sin enlaces. Busca abajo para conectarla.</Text>
        )}
      </ScrollView>

      <TextInput
        style={estilos.campo}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Enlazar con… (busca por título)"
        placeholderTextColor={paleta.muted}
        accessibilityLabel="Buscar ítems para enlazar"
      />
      {candidatos.map((candidato) => (
        <Pressable
          key={candidato.id}
          onPress={() => enlazar(candidato)}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.candidato, pressed && estilos.candidatoPulsado]}
        >
          <Text style={estilos.enlaceTitulo} numberOfLines={1}>
            + {candidato.titulo}
          </Text>
        </Pressable>
      ))}

      <Pressable onPress={archivarNota} accessibilityRole="button" style={estilos.archivar}>
        <Text style={estilos.archivarTexto}>Archivar</Text>
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
  titulo: {
    fontSize: 17,
    fontFamily: fuente.uiMedia,
    color: paleta.ink,
    marginTop: 6,
  },
  cuerpo: {
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    marginTop: 4,
  },
  seccion: {
    marginTop: 14,
    fontSize: tipografia.eyebrow,
    fontFamily: fuente.uiMedia,
    letterSpacing: tipografia.trackingEyebrow,
    textTransform: 'uppercase',
    color: paleta.muted,
  },
  lista: {
    maxHeight: 160,
    marginTop: 4,
  },
  filaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: paleta.line,
  },
  enlaceTitulo: {
    flex: 1,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
  quitar: {
    fontSize: 18,
    color: paleta.muted,
    paddingHorizontal: 6,
  },
  vacio: {
    fontSize: tipografia.meta,
    fontFamily: fuente.uiRegular,
    color: paleta.muted,
    paddingVertical: 10,
  },
  campo: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: paleta.line,
    borderRadius: radios.campo,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: tipografia.titulo,
    fontFamily: fuente.uiRegular,
    color: paleta.ink,
  },
  candidato: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  candidatoPulsado: {
    backgroundColor: paleta.fog,
  },
  archivar: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  archivarTexto: {
    fontSize: 13.5,
    fontFamily: fuente.uiMedia,
    color: paleta.muted,
  },
});
