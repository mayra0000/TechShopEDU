// Variables globales para el carrito
let carritoActual = null;
let cargandoCarrito = false;

// Función para obtener el carrito desde la API
async function obtenerCarrito() {
    if (cargandoCarrito) return carritoActual;

    try {
        cargandoCarrito = true;
        const response = await api.getCarrito();

        if (response.success) {
            carritoActual = response.carrito;
            return carritoActual;
        } else {
            console.error('Error obteniendo carrito:', response.message);
            return { items: [], total: 0, subtotal: 0, impuestos: 0, cantidad_items: 0 };
        }
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        mostrarNotificacion('Error cargando carrito: ' + api.getErrorMessage(error), 'error');
        return { items: [], total: 0, subtotal: 0, impuestos: 0, cantidad_items: 0 };
    } finally {
        cargandoCarrito = false;
    }
}

// Función para agregar item al carrito
async function agregarItemAlCarrito(item) {
    try {
        mostrarCargando(true);

        const response = await api.agregarAlCarrito(
            item.id,
            item.cantidad || 1,
            item.variantes || {}
        );

        if (response.success) {
            mostrarNotificacion('Producto agregado al carrito', 'success');
            await actualizarContadorCarrito();

            // Recargar carrito si estamos en la página del carrito
            if (window.location.pathname.includes('carrito.html')) {
                await cargarCarrito();
            }
        } else {
            mostrarNotificacion('Error: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        mostrarNotificacion('Error agregando producto: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función para actualizar el contador del carrito en el navbar
async function actualizarContadorCarrito() {
    try {
        const carrito = await obtenerCarrito();
        const badge = document.getElementById('cart-badge');

        if (badge) {
            badge.textContent = carrito.cantidad_items || 0;

            // Animación simple del badge
            if (carrito.cantidad_items > 0) {
                badge.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    badge.style.transform = 'scale(1)';
                }, 200);
            }
        }
    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

// Función para cargar y mostrar el carrito
async function cargarCarrito() {
    const carritoItems = document.getElementById('carrito-items');
    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoContenido = document.getElementById('carrito-contenido');

    if (!carritoItems) return; // No estamos en la página del carrito

    try {
        mostrarCargando(true);
        const carrito = await obtenerCarrito();

        if (!carrito.items || carrito.items.length === 0) {
            carritoVacio.style.display = 'block';
            carritoContenido.style.display = 'none';
            return;
        }

        carritoVacio.style.display = 'none';
        carritoContenido.style.display = 'block';

        carritoItems.innerHTML = '';

        carrito.items.forEach((item, index) => {
            const descripcionVariantes = generarDescripcionVariantes(item.variantes);

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="cart-item-image me-3">
                            <img src="${item.imagen}" alt="${item.nombre}" 
                                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;"
                                 onerror="this.src='img/placeholder.jpg'">
                        </div>
                        <div>
                            <h6 class="mb-0">${item.nombre}</h6>
                            ${descripcionVariantes ? `<small class="text-muted">${descripcionVariantes}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td class="align-middle">
                    <strong>$${parseFloat(item.precio_unitario).toFixed(2)}</strong>
                </td>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-outline-secondary btn-sm btn-quantity" 
                                onclick="cambiarCantidad(${item.id}, ${item.cantidad - 1})"
                                ${item.cantidad <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="form-control form-control-sm quantity-input mx-2" 
                               value="${item.cantidad}" 
                               onchange="actualizarCantidad(${item.id}, this.value)" 
                               min="1" max="${item.stock || 99}">
                        <button class="btn btn-outline-secondary btn-sm btn-quantity" 
                                onclick="cambiarCantidad(${item.id}, ${item.cantidad + 1})"
                                ${item.cantidad >= (item.stock || 99) ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td class="align-middle">
                    <strong>$${(parseFloat(item.precio_unitario) * item.cantidad).toFixed(2)}</strong>
                </td>
                <td class="align-middle">
                    <button class="btn btn-outline-danger btn-sm" 
                            onclick="eliminarDelCarrito(${item.id})" 
                            title="Eliminar producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            carritoItems.appendChild(fila);
        });

        actualizarTotalesCarrito(carrito);

    } catch (error) {
        console.error('Error cargando carrito:', error);
        mostrarNotificacion('Error cargando carrito: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función para cambiar cantidad
async function cambiarCantidad(itemId, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
        await eliminarDelCarrito(itemId);
        return;
    }

    try {
        mostrarCargando(true);
        const response = await api.actualizarCantidadCarrito(itemId, nuevaCantidad);

        if (response.success) {
            await cargarCarrito();
            await actualizarContadorCarrito();
        } else {
            mostrarNotificacion('Error: ' + response.message, 'error');
            await cargarCarrito(); // Recargar para mostrar valores correctos
        }
    } catch (error) {
        console.error('Error cambiando cantidad:', error);
        mostrarNotificacion('Error actualizando cantidad: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función para actualizar cantidad directamente
async function actualizarCantidad(itemId, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad > 0) {
        await cambiarCantidad(itemId, cantidad);
    }
}

// Función para eliminar item del carrito
async function eliminarDelCarrito(itemId) {
    try {
        mostrarCargando(true);
        const response = await api.eliminarDelCarrito(itemId);

        if (response.success) {
            mostrarNotificacion('Producto eliminado del carrito', 'warning');
            await cargarCarrito();
            await actualizarContadorCarrito();
        } else {
            mostrarNotificacion('Error: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error eliminando del carrito:', error);
        mostrarNotificacion('Error eliminando producto: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función para limpiar todo el carrito
async function limpiarCarrito() {
    if (!confirm('¿Estás seguro de que deseas limpiar todo el carrito?')) {
        return;
    }

    try {
        mostrarCargando(true);
        const response = await api.limpiarCarrito();

        if (response.success) {
            mostrarNotificacion('Carrito limpiado', 'info');
            await cargarCarrito();
            await actualizarContadorCarrito();
        } else {
            mostrarNotificacion('Error: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error limpiando carrito:', error);
        mostrarNotificacion('Error limpiando carrito: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Función para calcular totales del carrito (usar datos de la API)
function calcularTotalesCarrito() {
    return carritoActual ? {
        subtotal: carritoActual.subtotal,
        impuestos: carritoActual.impuestos,
        total: carritoActual.total
    } : { subtotal: 0, impuestos: 0, total: 0 };
}

// Función para actualizar totales en la interfaz
function actualizarTotalesCarrito(carrito = null) {
    const totales = carrito || carritoActual;
    if (!totales) return;

    const subtotalElement = document.getElementById('subtotal-carrito');
    const impuestosElement = document.getElementById('impuestos-carrito');
    const totalElement = document.getElementById('total-carrito');

    if (subtotalElement) subtotalElement.textContent = `$${totales.subtotal.toFixed(2)}`;
    if (impuestosElement) impuestosElement.textContent = `$${totales.impuestos.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${totales.total.toFixed(2)}`;

    // Actualizar totales en checkout si existe
    actualizarTotalesCheckout();
}

// Función para ir al checkout
async function irAlCheckout() {
    try {
        const carrito = await obtenerCarrito();
        if (!carrito.items || carrito.items.length === 0) {
            alert('Tu carrito está vacío. Agrega algunos productos antes de continuar.');
            return;
        }
        window.location.href = 'checkout.html';
    } catch (error) {
        console.error('Error verificando carrito:', error);
        mostrarNotificacion('Error verificando carrito: ' + api.getErrorMessage(error), 'error');
    }
}

// Función para actualizar totales en checkout
function actualizarTotalesCheckout() {
    if (!carritoActual) return;

    // Obtener costo de envío seleccionado
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega') || 'estandar';
    const calculoEnvio = api.calcularTotalConEnvio(
        carritoActual.subtotal,
        carritoActual.impuestos,
        metodoEntrega
    );

    const subtotalCheckout = document.getElementById('subtotal-checkout');
    const impuestosCheckout = document.getElementById('impuestos-checkout');
    const costoEnvioElement = document.getElementById('costo-envio');
    const totalCheckout = document.getElementById('total-checkout');

    if (subtotalCheckout) subtotalCheckout.textContent = `$${carritoActual.subtotal.toFixed(2)}`;
    if (impuestosCheckout) impuestosCheckout.textContent = `$${carritoActual.impuestos.toFixed(2)}`;
    if (costoEnvioElement) costoEnvioElement.textContent = `$${calculoEnvio.costoEnvio.toFixed(2)}`;
    if (totalCheckout) totalCheckout.textContent = `$${calculoEnvio.total.toFixed(2)}`;
}

// Función para generar descripción de variantes
function generarDescripcionVariantes(variantes) {
    if (!variantes || typeof variantes !== 'object') return '';

    return Object.entries(variantes)
        .map(([tipo, variante]) => `${tipo}: ${variante.valor || variante}`)
        .join(', ');
}

// Función para mostrar indicador de carga
function mostrarCargando(mostrar) {
    const existente = document.getElementById('loading-indicator');

    if (mostrar && !existente) {
        const loading = document.createElement('div');
        loading.id = 'loading-indicator';
        loading.className = 'position-fixed top-50 start-50 translate-middle';
        loading.style.zIndex = '9999';
        loading.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        `;
        document.body.appendChild(loading);
    } else if (!mostrar && existente) {
        existente.remove();
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    notificacion.style.cssText = 'top: 100px; right: 20px; z-index: 1050; min-width: 300px;';

    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    notificacion.innerHTML = `
        <i class="${iconos[tipo] || iconos.info} me-2"></i>${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 4000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function () {
    try {
        await actualizarContadorCarrito();

        // Cargar el carrito si estamos en la página del carrito
        if (window.location.pathname.includes('carrito.html')) {
            await cargarCarrito();
        }
    } catch (error) {
        console.error('Error inicializando carrito:', error);
    }
});

// Actualizar contador cada 30 segundos (en caso de cambios desde otra pestaña)
setInterval(async () => {
    try {
        await actualizarContadorCarrito();
    } catch (error) {
        console.error('Error actualizando contador automáticamente:', error);
    }
}, 30000);
