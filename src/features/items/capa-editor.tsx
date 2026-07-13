// Capa global del editor universal: montada una vez (en _layout, junto al
// Toast), lee la tienda del editor y despliega la hoja adecuada según el tipo
// del ítem tocado. Es dueña del flujo «Eliminar» (archiva conservando el
// historial + toast con deshacer). Los hábitos se editan aparte, desde su fila.

import { useSQLiteContext } from 'expo-sqlite';

import { useTiendaToast } from '@/components/toast';
import { actualizar, archivar } from '@/db/repositorios/items';
import { useTiendaHoy } from '@/features/hoy/tienda';
import { HojaEditar } from '@/features/items/hoja-editar';
import { useTiendaEditor } from '@/features/items/tienda-editor';
import { DetalleLista } from '@/features/todo/detalle-lista';
import { DetalleNota } from '@/features/todo/detalle-nota';

export function CapaEditor() {
  const db = useSQLiteContext();
  const objetivo = useTiendaEditor((estado) => estado.objetivo);
  const cerrar = useTiendaEditor((estado) => estado.cerrar);
  const refrescar = useTiendaHoy((estado) => estado.refrescar);
  const mostrarToast = useTiendaToast((estado) => estado.mostrar);

  if (!objetivo) return null;
  const { item, fechaOriginal } = objetivo;

  // «Eliminar» archiva (nada se pierde): toast con deshacer que restaura estado
  const eliminar = async () => {
    const estadoPrevio = item.estado;
    await archivar(db, item.id);
    cerrar();
    refrescar();
    mostrarToast(item.rrule ? 'Serie eliminada' : 'Eliminado', {
      etiqueta: 'Deshacer',
      onDeshacer: () => {
        actualizar(db, item.id, { estado: estadoPrevio })
          .then(() => refrescar())
          .catch(() => undefined);
      },
    });
  };

  // las listas tienen su hoja propia (elementos marcables)
  if (item.tipo === 'lista') return <DetalleLista lista={item} onCerrar={cerrar} />;

  // una nota/referencia SIN fecha ni repetición es un «documento» → su hoja de
  // detalle (cuerpo + enlaces). Con fecha/hora/repetición vive en la cronología,
  // así que se edita como un evento en el editor universal (que además permite
  // reclasificarla o cambiarle la programación).
  if ((item.tipo === 'nota' || item.tipo === 'referencia') && !item.fecha_inicio && !item.rrule) {
    return <DetalleNota nota={item} onCerrar={cerrar} />;
  }

  return (
    <HojaEditar item={item} fechaOriginal={fechaOriginal} onCerrar={cerrar} onEliminar={eliminar} />
  );
}
