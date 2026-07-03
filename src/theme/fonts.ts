// Tipografías del sistema de diseño (docs/03-diseno.md), empaquetadas en la app:
// no se descargan en runtime, cumplen el offline-first.
// - Display (saludos, titulares emotivos): Fraunces ligera, itálica para el saludo.
// - UI y cuerpo: Outfit 300–600.
// El mockup usa pesos 340/560 (variable); aquí los estáticos más cercanos.

import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';

// Mapa para useFonts() en el layout raíz.
export const mapaFuentes = {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_600SemiBold,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
};

// Nombres semánticos para usar en los estilos.
export const fuente = {
  displayLigera: 'Fraunces_300Light',
  displayItalica: 'Fraunces_300Light_Italic',
  displayNegrita: 'Fraunces_600SemiBold',
  uiLigera: 'Outfit_300Light',
  uiRegular: 'Outfit_400Regular',
  uiMedia: 'Outfit_500Medium',
  uiSemi: 'Outfit_600SemiBold',
} as const;
