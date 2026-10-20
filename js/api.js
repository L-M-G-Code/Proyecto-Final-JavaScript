const RUTA_PRODUCTOS = "data/productos.json";
const RUTA_ENVIOS = "data/envios.json";

async function pedirJson(ruta) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar "${ruta}" (código ${respuesta.status}).`);
  }

  return respuesta.json();
}

export async function cargarDatosTienda() {
  const [productos, envios] = await Promise.all([
    pedirJson(RUTA_PRODUCTOS),
    pedirJson(RUTA_ENVIOS),
  ]);

  return { productos, envios };
}
