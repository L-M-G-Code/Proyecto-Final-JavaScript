# Café Origen - Simulador de tienda online

Proyecto final de JavaScript. Simula el circuito completo de una compra online de café de especialidad: **ver productos → filtrar/buscar → agregar al carrito → modificar cantidades → elegir entrega y pago → confirmar → ver comprobante del pedido**. No incluye registro ni login.

## Cómo ejecutarlo

Los datos se leen con `fetch` desde archivos `.json`, por lo que **hay que abrir el proyecto desde un servidor local** (abrir `index.html` con doble clic bloquea `fetch` en la mayoría de los navegadores). Opciones:

- Extensión **Live Server** de VS Code: clic derecho sobre `index.html` → *Open with Live Server*.
- Con Python: `python -m http.server 8000` y abrir `http://localhost:8000`.

Si se publica en **GitHub Pages**, funciona sin configuración adicional.

## Estructura

```
index.html
assets/img/     logo e imágenes de productos (SVG)
css/estilos.css estilos propios sobre Bootstrap 5
data/           productos.json y envios.json (base de datos simulada)
js/api.js       carga de datos con fetch + async/await
js/storage.js   operaciones de localStorage (guardar, modificar, borrar, vaciar)
js/app.js       lógica de la interfaz y manipulación del DOM
```

## Tecnologías

- HTML, CSS y JavaScript (módulos ES)
- Bootstrap 5 (interfaz)
- SweetAlert2 (confirmaciones) y Toastify (notificaciones), en reemplazo de `alert`/`confirm`/`prompt`

## Requisitos de la consigna

| Requisito | Dónde |
|---|---|
| Arrays de objetos en `.json` consumidos con `fetch` | `data/*.json`, `js/api.js` |
| `async/await`, `try/catch/finally` y manejo de errores de carga | `js/app.js` (`iniciarTienda`), `js/api.js` |
| Funciones de orden superior | `map`, `filter`, `find`, `reduce`, `some`, `forEach` en `js/app.js` y `js/storage.js` |
| `localStorage`: guardar, modificar, borrar y vaciar | `js/storage.js` |
| Ternario, operador OR y destructuring | a lo largo de `js/app.js` y `js/storage.js` |
| Librerías externas | SweetAlert2 y Toastify |
