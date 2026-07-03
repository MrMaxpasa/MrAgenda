// Componente invisible que mantiene las notificaciones al día:
// configura canales al arrancar y reprograma la ventana al abrir la app
// y tras cada escritura (con un pequeño debounce para agrupar cambios).

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { useTiendaHoy } from '@/features/hoy/tienda';
import { configurar, reprogramarTodo } from '@/lib/notificaciones';

export function Notificador() {
  const db = useSQLiteContext();
  const version = useTiendaHoy((estado) => estado.version);

  useEffect(() => {
    configurar();
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      reprogramarTodo(db);
    }, 1200);
    return () => clearTimeout(temporizador);
  }, [db, version]);

  return null;
}
