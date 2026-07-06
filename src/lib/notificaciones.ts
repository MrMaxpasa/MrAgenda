// Avisos locales (docs/02 §3): 3 niveles — 0 silencioso (solo en Hoy),
// 1 notificación normal, 2 alarma insistente (canal MAX con sonido propio,
// timeSensitive en iOS y ráfaga de recordatorios). Todo local, sin red.
// Límites reales de Expo documentados en docs/04-arquitectura.md.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ConexionDB, Item } from '@/db/tipos';
import { listarInstanciasPorFecha } from '@/features/items/consultas';
import { aFechaISO, sumarDias } from '@/lib/fechas';

const DIAS_VENTANA = 14;
const PRESUPUESTO = 60; // iOS corta en 64 notificaciones pendientes
const RAFAGA_MINUTOS = [2, 5]; // insistencia: recordatorios tras la hora

export const CANAL_AVISOS = 'avisos';
export const CANAL_ALARMAS = 'alarmas';

/** Handler + canales Android. Llamar una vez al arrancar, antes de programar. */
export async function configurar(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS !== 'android') return;
  // sin canal, Android 8+ descarta las notificaciones en silencio
  await Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
    name: 'Avisos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CANAL_ALARMAS, {
    name: 'Alarmas',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarma.wav', // empaquetado por el config plugin (dev build)
    vibrationPattern: [0, 400, 200, 400, 200, 600],
    enableVibrate: true,
    audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
    lightColor: '#DE9E38',
  });
}

/** Pide permisos solo si aún no se han decidido. Devuelve si hay permiso. */
export async function asegurarPermisos(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

export interface Aviso {
  titulo: string;
  cuerpo: string;
  momento: Date;
  alarma: boolean;
}

/**
 * Avisos que corresponden a una instancia (función pura, testeada):
 * nada si está hecha, es silenciosa, no tiene hora o su momento ya pasó;
 * el aviso principal resta el aviso previo; nivel 2 añade la ráfaga.
 */
export function avisosParaInstancia(
  instancia: { item: Item; fecha: string; hecha: boolean },
  ahora: Date,
): Aviso[] {
  const { item } = instancia;
  if (instancia.hecha || item.nivel_aviso < 1 || item.todo_el_dia || !item.fecha_inicio) {
    return [];
  }

  const hora = item.fecha_inicio.slice(11, 16);
  const disparo = new Date(`${instancia.fecha}T${hora}`);
  const offset = item.aviso_offset_min ?? 0;
  const momento = new Date(disparo.getTime() - offset * 60_000);
  if (momento <= ahora) return [];

  const alarma = item.nivel_aviso === 2;
  const avisos: Aviso[] = [
    {
      titulo: item.titulo,
      cuerpo: offset > 0 ? `En ${offset} min · a las ${hora}` : `Es la hora · ${hora}`,
      momento,
      alarma,
    },
  ];

  if (alarma) {
    for (const minutos of RAFAGA_MINUTOS) {
      const recordatorio = new Date(disparo.getTime() + minutos * 60_000);
      if (recordatorio > ahora) {
        avisos.push({
          titulo: item.titulo,
          cuerpo: 'Sigue pendiente — toca para verlo',
          momento: recordatorio,
          alarma: true,
        });
      }
    }
  }
  return avisos;
}

/**
 * Ordena los avisos por prioridad y corta al presupuesto (función pura):
 * las alarmas insistentes van primero (para que un despertador nunca se
 * caiga por recordatorios triviales), y dentro de cada grupo, los más
 * próximos primero.
 */
export function priorizarAvisos(avisos: Aviso[], presupuesto: number): Aviso[] {
  return [...avisos]
    .sort((a, b) => {
      if (a.alarma !== b.alarma) return a.alarma ? -1 : 1;
      return a.momento.getTime() - b.momento.getTime();
    })
    .slice(0, presupuesto);
}

async function programarAviso({ titulo, cuerpo, momento, alarma }: Aviso): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      sound: alarma ? 'alarma.wav' : true,
      priority: alarma
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.DEFAULT,
      interruptionLevel: alarma ? 'timeSensitive' : 'active',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: momento,
      channelId: alarma ? CANAL_ALARMAS : CANAL_AVISOS,
    },
  });
}

async function hacerReprogramacion(db: ConexionDB): Promise<void> {
  const permisos = await Notifications.getPermissionsAsync();
  if (!permisos.granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const ahora = new Date();

  // acumular TODOS los avisos candidatos de la ventana y luego priorizar,
  // para que las alarmas nunca se caigan por avisos triviales anteriores
  const candidatos: Aviso[] = [];
  for (let d = 0; d < DIAS_VENTANA; d++) {
    const fecha = aFechaISO(sumarDias(ahora, d));
    const instancias = await listarInstanciasPorFecha(db, fecha);
    for (const instancia of instancias) {
      candidatos.push(...avisosParaInstancia(instancia, ahora));
    }
  }

  for (const aviso of priorizarAvisos(candidatos, PRESUPUESTO)) {
    await programarAviso(aviso);
  }
}

// Guardia anti-solapamiento: si llega una reprogramación mientras otra
// corre, se marca «repetir» y la actual hace una pasada más al terminar,
// en vez de solapar dos cancelAll + schedule (que podría duplicar/perder).
let enCurso: Promise<void> | null = null;
let repetir = false;

/**
 * Cancela todo y programa la ventana de los próximos días: instancias
 * pendientes con hora y nivel de aviso ≥ 1, con su aviso previo. Las de
 * nivel 2 añaden una ráfaga (+2 y +5 min) que desaparece al reprogramar
 * (completar el ítem o abrir la app la cancela sola). Serializada.
 */
export async function reprogramarTodo(db: ConexionDB): Promise<void> {
  if (enCurso) {
    repetir = true;
    return enCurso;
  }
  enCurso = (async () => {
    do {
      repetir = false;
      await hacerReprogramacion(db);
    } while (repetir);
  })();
  try {
    await enCurso;
  } finally {
    enCurso = null;
  }
}
