import { Redirect } from 'expo-router';

// La raíz redirige a la pestaña Hoy, la pantalla principal.
export default function Indice() {
  return <Redirect href="/hoy" />;
}
