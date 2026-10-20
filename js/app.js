import { cargarDatosTienda } from "./api.js";
import {
  obtenerCarrito,
  agregarProducto,
  cambiarCantidad,
  quitarProducto,
  vaciarCarrito,
  guardarUltimoPedido,
  obtenerUltimoPedido,
  borrarTodosLosDatos,
} from "./storage.js";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const formatearPrecio = (valor) => formatoMoneda.format(valor);

const TODAS_LAS_CATEGORIAS = "todas";
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const elementos = {
  estadoCarga: document.getElementById("estado-carga"),
  estadoError: document.getElementById("estado-error"),
  mensajeError: document.getElementById("mensaje-error"),
  botonReintentar: document.getElementById("boton-reintentar"),
  seccionTienda: document.getElementById("seccion-tienda"),
  buscador: document.getElementById("buscador"),
  filtroCategoria: document.getElementById("filtro-categoria"),
  ordenProductos: document.getElementById("orden-productos"),
  contadorResultados: document.getElementById("contador-resultados"),
  contenedorProductos: document.getElementById("contenedor-productos"),
  contadorCarrito: document.getElementById("contador-carrito"),
  listaCarrito: document.getElementById("lista-carrito"),
  subtotalCarrito: document.getElementById("subtotal-carrito"),
  botonFinalizar: document.getElementById("boton-finalizar"),
  botonVaciar: document.getElementById("boton-vaciar"),
  botonUltimoPedido: document.getElementById("boton-ultimo-pedido"),
  botonBorrarDatos: document.getElementById("boton-borrar-datos"),
  panelCarrito: document.getElementById("panel-carrito"),
  modalCompra: document.getElementById("modal-compra"),
  tituloModalCompra: document.getElementById("titulo-modal-compra"),
  formularioCompra: document.getElementById("formulario-compra"),
  vistaFormulario: document.getElementById("vista-formulario"),
  vistaConfirmacion: document.getElementById("vista-confirmacion"),
  detalleCompra: document.getElementById("detalle-pedido"),
  resumenCompra: document.getElementById("resumen-compra"),
  campoEnvio: document.getElementById("campo-envio"),
  grupoDireccion: document.getElementById("grupo-direccion"),
};

const camposFormulario = {
  nombre: document.getElementById("campo-nombre"),
  email: document.getElementById("campo-email"),
  direccion: document.getElementById("campo-direccion"),
  pago: document.getElementById("campo-pago"),
};

let catalogo = [];
let opcionesEnvio = [];

function escaparHtml(texto) {
  const contenedor = document.createElement("div");
  contenedor.textContent = texto;
  return contenedor.innerHTML;
}

function notificar(mensaje, tipo = "exito") {
  Toastify({
    text: mensaje,
    duration: 2500,
    gravity: "bottom",
    position: "right",
    style: { background: tipo === "error" ? "#b3261e" : "#4b2e1e" },
  }).showToast();
}

async function pedirConfirmacion({ titulo, texto, textoConfirmar }) {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#4b2e1e",
  });
  return isConfirmed;
}

function mostrarCarga(visible) {
  elementos.estadoCarga.hidden = !visible;
}

function mostrarError(mensaje) {
  elementos.mensajeError.textContent = `${mensaje} Si abriste el archivo haciendo doble clic, probá con un servidor local (ver readme.md).`;
  elementos.estadoError.hidden = false;
  elementos.seccionTienda.hidden = true;
}

/* ---------- Catálogo ---------- */

function poblarCategorias() {
  const categorias = [...new Set(catalogo.map(({ categoria }) => categoria))];
  const opciones = [
    `<option value="${TODAS_LAS_CATEGORIAS}">Todas las categorías</option>`,
    ...categorias.map((categoria) => `<option value="${escaparHtml(categoria)}">${escaparHtml(categoria)}</option>`),
  ];
  elementos.filtroCategoria.innerHTML = opciones.join("");
}

function poblarEnvios() {
  elementos.campoEnvio.innerHTML = opcionesEnvio
    .map(({ id, nombre, costo }) => {
      const detalleCosto = costo === 0 ? "Gratis" : formatearPrecio(costo);
      return `<option value="${id}">${nombre} - ${detalleCosto}</option>`;
    })
    .join("");
}

function ordenarProductos(lista, criterio) {
  const copia = [...lista];
  const criterios = {
    "precio-asc": (a, b) => a.precio - b.precio,
    "precio-desc": (a, b) => b.precio - a.precio,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  };
  return criterios[criterio] ? copia.sort(criterios[criterio]) : copia;
}

function filtrarProductos() {
  const texto = elementos.buscador.value.trim().toLowerCase();
  const categoriaElegida = elementos.filtroCategoria.value;

  const filtrados = catalogo.filter(({ nombre, descripcion, categoria }) => {
    const coincideTexto = `${nombre} ${descripcion || ""}`.toLowerCase().includes(texto);
    const coincideCategoria = categoriaElegida === TODAS_LAS_CATEGORIAS || categoria === categoriaElegida;
    return coincideTexto && coincideCategoria;
  });

  return ordenarProductos(filtrados, elementos.ordenProductos.value);
}

function crearTarjetaProducto({ id, nombre, categoria, precio, stock, descripcion, imagen }) {
  const sinStock = stock === 0;
  const avisoStock = stock <= 5 && !sinStock ? `<small class="text-danger">¡Quedan ${stock}!</small>` : "";

  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <article class="card tarjeta-producto h-100">
        <img src="${imagen}" class="card-img-top" alt="${escaparHtml(nombre)}">
        <div class="card-body d-flex flex-column">
          <span class="badge etiqueta-categoria align-self-start mb-2">${escaparHtml(categoria)}</span>
          <h3 class="h5 card-title">${escaparHtml(nombre)}</h3>
          <p class="card-text text-muted small flex-grow-1">${escaparHtml(descripcion || "Sin descripción")}</p>
          ${avisoStock}
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="precio-producto">${formatearPrecio(precio)}</span>
            <button class="btn btn-cafe btn-sm" type="button" data-accion="agregar" data-id="${id}" ${sinStock ? "disabled" : ""}>
              ${sinStock ? "Sin stock" : "Agregar"}
            </button>
          </div>
        </div>
      </article>
    </div>`;
}

function renderizarProductos() {
  const productos = filtrarProductos();
  const { contenedorProductos, contadorResultados } = elementos;

  contadorResultados.textContent = `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;
  contenedorProductos.innerHTML = productos.length
    ? productos.map(crearTarjetaProducto).join("")
    : `<div class="col-12"><div class="alert alert-secondary">No encontramos productos con esos filtros.</div></div>`;
}

/* ---------- Carrito ---------- */

function obtenerItemsDetallados() {
  return obtenerCarrito()
    .map(({ id, cantidad }) => {
      const producto = catalogo.find((productoCatalogo) => productoCatalogo.id === id);
      return producto && { ...producto, cantidad };
    })
    .filter(Boolean);
}

const calcularSubtotal = (items) => items.reduce((acumulado, { precio, cantidad }) => acumulado + precio * cantidad, 0);

function crearItemCarrito({ id, nombre, precio, cantidad, imagen }) {
  return `
    <div class="item-carrito">
      <img src="${imagen}" alt="${escaparHtml(nombre)}">
      <div>
        <div class="d-flex justify-content-between gap-2">
          <strong>${escaparHtml(nombre)}</strong>
          <button class="btn-close btn-sm" type="button" data-accion="quitar" data-id="${id}" aria-label="Quitar ${escaparHtml(nombre)}"></button>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <div class="control-cantidad">
            <button class="btn btn-outline-secondary btn-sm" type="button" data-accion="restar" data-id="${id}" aria-label="Restar una unidad">-</button>
            <span class="valor-cantidad">${cantidad}</span>
            <button class="btn btn-outline-secondary btn-sm" type="button" data-accion="sumar" data-id="${id}" aria-label="Sumar una unidad">+</button>
          </div>
          <span class="fw-semibold">${formatearPrecio(precio * cantidad)}</span>
        </div>
      </div>
    </div>`;
}

function renderizarCarrito() {
  const items = obtenerItemsDetallados();
  const cantidadTotal = items.reduce((acumulado, { cantidad }) => acumulado + cantidad, 0);
  const hayItems = items.length > 0;

  elementos.contadorCarrito.textContent = cantidadTotal;
  elementos.listaCarrito.innerHTML = hayItems
    ? items.map(crearItemCarrito).join("")
    : `<p class="text-muted text-center mt-4">Tu carrito está vacío. Sumá algún producto para empezar.</p>`;
  elementos.subtotalCarrito.textContent = formatearPrecio(calcularSubtotal(items));
  elementos.botonFinalizar.disabled = !hayItems;
  elementos.botonVaciar.disabled = !hayItems;
}

function buscarProductoPorId(idTexto) {
  return catalogo.find(({ id }) => id === Number(idTexto));
}

function manejarAccionProducto(evento) {
  const boton = evento.target.closest("[data-accion='agregar']");
  if (!boton) return;

  const producto = buscarProductoPorId(boton.dataset.id);
  const agregado = agregarProducto(producto.id, producto.stock);

  renderizarCarrito();
  agregado
    ? notificar(`${producto.nombre} agregado al carrito`)
    : notificar(`No hay más stock de ${producto.nombre}`, "error");
}

function manejarAccionCarrito(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  const producto = buscarProductoPorId(id);
  const variaciones = { sumar: 1, restar: -1 };

  if (accion === "quitar") {
    quitarProducto(producto.id);
    notificar(`${producto.nombre} eliminado del carrito`);
  } else if (variaciones[accion]) {
    const modificado = cambiarCantidad(producto.id, variaciones[accion], producto.stock);
    if (!modificado && accion === "sumar") {
      notificar(`Stock máximo de ${producto.nombre}: ${producto.stock}`, "error");
    }
  }

  renderizarCarrito();
}

async function manejarVaciarCarrito() {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Vaciar el carrito?",
    texto: "Se quitarán todos los productos.",
    textoConfirmar: "Sí, vaciar",
  });
  if (!confirmado) return;

  vaciarCarrito();
  renderizarCarrito();
  notificar("Carrito vaciado");
}

/* ---------- Checkout ---------- */

function obtenerEnvioElegido() {
  return opcionesEnvio.find(({ id }) => id === elementos.campoEnvio.value) || opcionesEnvio[0];
}

function actualizarResumenCompra() {
  const items = obtenerItemsDetallados();
  const subtotal = calcularSubtotal(items);
  const { nombre: nombreEnvio, costo, requiereDireccion } = obtenerEnvioElegido();

  elementos.grupoDireccion.hidden = !requiereDireccion;

  const filas = items
    .map(({ nombre, cantidad, precio }) => `
      <li class="d-flex justify-content-between small">
        <span>${cantidad} x ${escaparHtml(nombre)}</span>
        <span>${formatearPrecio(precio * cantidad)}</span>
      </li>`)
    .join("");

  elementos.resumenCompra.innerHTML = `
    <h3 class="h6 mb-3">Resumen del pedido</h3>
    <ul class="list-unstyled d-grid gap-1 mb-3">${filas}</ul>
    <div class="d-flex justify-content-between small"><span>Subtotal</span><span>${formatearPrecio(subtotal)}</span></div>
    <div class="d-flex justify-content-between small"><span>${nombreEnvio}</span><span>${costo === 0 ? "Gratis" : formatearPrecio(costo)}</span></div>
    <hr>
    <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>${formatearPrecio(subtotal + costo)}</span></div>`;
}

function marcarCampo(nombreCampo, mensajeError) {
  const campo = camposFormulario[nombreCampo];
  campo.classList.toggle("is-invalid", Boolean(mensajeError));
  document.getElementById(`error-${nombreCampo}`).textContent = mensajeError;
}

function validarFormulario() {
  const { requiereDireccion } = obtenerEnvioElegido();
  const { nombre, email, direccion, pago } = camposFormulario;

  const errores = {
    nombre: nombre.value.trim().length >= 3 ? "" : "Ingresá tu nombre completo.",
    email: REGEX_EMAIL.test(email.value.trim()) ? "" : "Ingresá un email válido.",
    direccion: !requiereDireccion || direccion.value.trim().length >= 5 ? "" : "Ingresá una dirección de entrega.",
    pago: pago.value ? "" : "Elegí un medio de pago.",
  };

  Object.entries(errores).forEach(([nombreCampo, mensaje]) => marcarCampo(nombreCampo, mensaje));
  return !Object.values(errores).some(Boolean);
}

function mostrarVistaCompra(mostrarConfirmacion) {
  elementos.vistaFormulario.hidden = mostrarConfirmacion;
  elementos.vistaConfirmacion.hidden = !mostrarConfirmacion;
  elementos.tituloModalCompra.textContent = mostrarConfirmacion ? "Pedido confirmado" : "Finalizar compra";
}

function abrirModalCompra() {
  if (obtenerItemsDetallados().length === 0) return;

  elementos.formularioCompra.reset();
  Object.keys(camposFormulario).forEach((nombreCampo) => marcarCampo(nombreCampo, ""));
  mostrarVistaCompra(false);
  actualizarResumenCompra();

  bootstrap.Offcanvas.getOrCreateInstance(elementos.panelCarrito).hide();
  bootstrap.Modal.getOrCreateInstance(elementos.modalCompra).show();
}

function renderizarConfirmacion(pedido) {
  const { numero, fecha, cliente, items, envio, pago, subtotal, total } = pedido;
  const filas = items
    .map(({ nombre, cantidad, precio }) => `
      <tr>
        <td>${escaparHtml(nombre)}</td>
        <td class="text-center">${cantidad}</td>
        <td class="text-end">${formatearPrecio(precio * cantidad)}</td>
      </tr>`)
    .join("");
  const lineaDireccion = cliente.direccion
    ? `<p class="mb-1"><strong>Dirección:</strong> ${escaparHtml(cliente.direccion)}</p>`
    : "";

  elementos.detalleCompra.innerHTML = `
    <div class="text-center mb-4">
      <h3 class="h4">¡Gracias por tu compra, ${escaparHtml(cliente.nombre)}!</h3>
      <p class="mb-0 text-muted">Pedido <strong>${numero}</strong> - ${fecha}</p>
    </div>
    <table class="table table-sm align-middle">
      <thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-end">Importe</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="d-flex justify-content-between"><span>Subtotal</span><span>${formatearPrecio(subtotal)}</span></div>
    <div class="d-flex justify-content-between"><span>${envio.nombre}</span><span>${envio.costo === 0 ? "Gratis" : formatearPrecio(envio.costo)}</span></div>
    <div class="d-flex justify-content-between fw-bold fs-5 mb-3"><span>Total</span><span>${formatearPrecio(total)}</span></div>
    <p class="mb-1"><strong>Email:</strong> ${escaparHtml(cliente.email)}</p>
    ${lineaDireccion}
    <p class="mb-0"><strong>Medio de pago:</strong> ${escaparHtml(pago)}</p>`;
}

function construirPedido(items) {
  const envio = obtenerEnvioElegido();
  const subtotal = calcularSubtotal(items);
  const { nombre, email, direccion, pago } = camposFormulario;

  return {
    numero: `CO-${Date.now().toString().slice(-6)}`,
    fecha: new Date().toLocaleString("es-AR"),
    cliente: {
      nombre: nombre.value.trim(),
      email: email.value.trim(),
      direccion: envio.requiereDireccion ? direccion.value.trim() : "",
    },
    items: items.map(({ nombre: nombreProducto, precio, cantidad }) => ({ nombre: nombreProducto, precio, cantidad })),
    envio: { nombre: envio.nombre, costo: envio.costo },
    pago: pago.value,
    subtotal,
    total: subtotal + envio.costo,
  };
}

async function manejarConfirmacionCompra(evento) {
  evento.preventDefault();
  if (!validarFormulario()) {
    notificar("Revisá los datos marcados en el formulario", "error");
    return;
  }

  const items = obtenerItemsDetallados();
  const { total } = construirPedido(items);
  const confirmado = await pedirConfirmacion({
    titulo: "¿Confirmar el pedido?",
    texto: `Vas a confirmar una compra por ${formatearPrecio(total)}.`,
    textoConfirmar: "Sí, confirmar",
  });
  if (!confirmado) return;

  const pedido = construirPedido(items);
  guardarUltimoPedido(pedido);
  vaciarCarrito();
  renderizarCarrito();
  actualizarBotonUltimoPedido();
  renderizarConfirmacion(pedido);
  mostrarVistaCompra(true);

  Swal.fire({
    title: "¡Pedido confirmado!",
    text: `Tu número de pedido es ${pedido.numero}.`,
    icon: "success",
    confirmButtonColor: "#4b2e1e",
  });
}

function actualizarBotonUltimoPedido() {
  elementos.botonUltimoPedido.hidden = !obtenerUltimoPedido();
}

function mostrarUltimoPedido() {
  const ultimoPedido = obtenerUltimoPedido();
  if (!ultimoPedido) return;

  renderizarConfirmacion(ultimoPedido);
  mostrarVistaCompra(true);
  bootstrap.Modal.getOrCreateInstance(elementos.modalCompra).show();
}

async function manejarBorrarDatos() {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Borrar todos los datos guardados?",
    texto: "Se eliminarán el carrito y el último pedido de este navegador.",
    textoConfirmar: "Sí, borrar",
  });
  if (!confirmado) return;

  borrarTodosLosDatos();
  renderizarCarrito();
  actualizarBotonUltimoPedido();
  notificar("Datos borrados");
}

/* ---------- Inicio ---------- */

async function iniciarTienda() {
  elementos.estadoError.hidden = true;
  mostrarCarga(true);

  try {
    const datos = await cargarDatosTienda();
    ({ productos: catalogo, envios: opcionesEnvio } = datos);

    poblarCategorias();
    poblarEnvios();
    renderizarProductos();
    elementos.seccionTienda.hidden = false;
  } catch (error) {
    mostrarError(error.message || "Ocurrió un error inesperado.");
  } finally {
    mostrarCarga(false);
    renderizarCarrito();
    actualizarBotonUltimoPedido();
  }
}

function registrarEventos() {
  elementos.buscador.addEventListener("input", renderizarProductos);
  elementos.filtroCategoria.addEventListener("change", renderizarProductos);
  elementos.ordenProductos.addEventListener("change", renderizarProductos);
  elementos.contenedorProductos.addEventListener("click", manejarAccionProducto);
  elementos.listaCarrito.addEventListener("click", manejarAccionCarrito);
  elementos.botonVaciar.addEventListener("click", manejarVaciarCarrito);
  elementos.botonFinalizar.addEventListener("click", abrirModalCompra);
  elementos.campoEnvio.addEventListener("change", actualizarResumenCompra);
  elementos.formularioCompra.addEventListener("submit", manejarConfirmacionCompra);
  elementos.botonUltimoPedido.addEventListener("click", mostrarUltimoPedido);
  elementos.botonBorrarDatos.addEventListener("click", manejarBorrarDatos);
  elementos.botonReintentar.addEventListener("click", iniciarTienda);
}

registrarEventos();
iniciarTienda();
