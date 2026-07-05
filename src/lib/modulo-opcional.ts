// Carga perezosa y tolerante de módulos nativos opcionales: si el binario
// instalado aún no los incluye (JS más nuevo que la build), devolvemos
// null y la interfaz oculta esa función en lugar de tumbar la ruta.

export function cargarModuloOpcional<T>(cargador: () => T): T | null {
  try {
    return cargador();
  } catch {
    return null;
  }
}
