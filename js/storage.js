const CLAVE_CARRITO = "carritoCafeOrigen";
const CLAVE_ULTIMO_PEDIDO = "ultimoPedidoCafeOrigen";

export function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch {
    return [];
  }
}

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

export function agregarProducto(idProducto, stockDisponible) {
  const carrito = obtenerCarrito();
  const itemExistente = carrito.find(({ id }) => id === idProducto);

  if (itemExistente) {
    if (itemExistente.cantidad >= stockDisponible) return false;
    itemExistente.cantidad += 1;
  } else {
    carrito.push({ id: idProducto, cantidad: 1 });
  }

  guardarCarrito(carrito);
  return true;
}

export function cambiarCantidad(idProducto, variacion, stockDisponible) {
  const carrito = obtenerCarrito();
  const itemExistente = carrito.find(({ id }) => id === idProducto);

  if (!itemExistente) return false;

  const nuevaCantidad = itemExistente.cantidad + variacion;
  if (nuevaCantidad < 1 || nuevaCantidad > stockDisponible) return false;

  itemExistente.cantidad = nuevaCantidad;
  guardarCarrito(carrito);
  return true;
}

export function quitarProducto(idProducto) {
  const carritoActualizado = obtenerCarrito().filter(({ id }) => id !== idProducto);
  guardarCarrito(carritoActualizado);
}

export function vaciarCarrito() {
  localStorage.removeItem(CLAVE_CARRITO);
}

export function guardarUltimoPedido(pedido) {
  localStorage.setItem(CLAVE_ULTIMO_PEDIDO, JSON.stringify(pedido));
}

export function obtenerUltimoPedido() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ULTIMO_PEDIDO));
  } catch {
    return null;
  }
}

export function borrarTodosLosDatos() {
  localStorage.clear();
}
