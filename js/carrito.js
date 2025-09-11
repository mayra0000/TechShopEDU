// Función para obtener el carrito del localStorage
function obtenerCarrito() {
    const carritoString = localStorage.getItem('techshop_carrito');
    return carritoString ? JSON.parse(carritoString) : [];
}

// Función para guardar el carrito en localStorage
function guardarCarrito(carrito) {
    localStorage.setItem('techshop_carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
}

// Función para agregar item al carrito
function agregarItemAlCarrito(nuevoItem) {
    let carrito = obtenerCarrito();
    
    // Buscar si el producto ya existe con las mismas variantes
    const itemExistente = carrito.find(item => 
        item.id === nuevoItem.id && 
        JSON.stringify(item.variantes) === JSON.stringify(nuevoItem.variantes)
    );

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push(nuevoItem);
    }

    guardarCarrito(carrito);  
    //Recargar
    if (window.location.pathname.includes('carrito.html')) {
        cargarCarrito();
    }
}

// Función para actualizar el contador del carrito en el navbar
function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
    
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = totalItems;
    }
}

// Función para cargar y mostrar el carrito
function cargarCarrito() {
    const carrito = obtenerCarrito();
    const carritoItems = document.getElementById('carrito-items');
    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoContenido = document.getElementById('carrito-contenido');

    if (!carritoItems) return; // No estamos en la página del carrito

    if (carrito.length === 0) {
        carritoVacio.style.display = 'block';
        carritoContenido.style.display = 'none';
        return;
    }

    carritoVacio.style.display = 'none';
    carritoContenido.style.display = 'block';

    carritoItems.innerHTML = '';

    carrito.forEach((item, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="cart-item-image me-3">
                        <img src="${item.imagen}" alt="${item.nombre}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
                    </div>
                    <div>
                        <h6 class="mb-0">${item.nombre}</h6>
                        <small class="text-muted">${item.descripcionVariantes || ''}</small>
                    </div>
                </div>
            </td>
            <td class="align-middle">
                <strong>$${item.precio.toFixed(2)}</strong>
            </td>
            <td class="align-middle">
                <div class="d-flex align-items-center">
                    <button class="btn btn-outline-secondary btn-sm btn-quantity" onclick="cambiarCantidad(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="form-control form-control-sm quantity-input mx-2" value="${item.cantidad}" onchange="actualizarCantidad(${index}, this.value)" min="1">
                    <button class="btn btn-outline-secondary btn-sm btn-quantity" onclick="cambiarCantidad(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>
            <td class="align-middle">
                <strong>$${(item.precio * item.cantidad).toFixed(2)}</strong>
            </td>
            <td class="align-middle">
                <button class="btn btn-outline-danger btn-sm" onclick="eliminarDelCarrito(${index})" title="Eliminar producto">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        carritoItems.appendChild(fila);
    });

    actualizarTotalesCarrito();
}

// Función para cambiar cantidad
function cambiarCantidad(index, cambio) {
    let carrito = obtenerCarrito();
    if (carrito[index]) {
        carrito[index].cantidad += cambio;
        if (carrito[index].cantidad <= 0) {
            carrito.splice(index, 1);
        }
        guardarCarrito(carrito);
        cargarCarrito();
    }
}

// Función para actualizar cantidad directamente
function actualizarCantidad(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad > 0) {
        let carrito = obtenerCarrito();
        if (carrito[index]) {
            carrito[index].cantidad = cantidad;
            guardarCarrito(carrito);
            cargarCarrito();
        }
    }
}

// Función para eliminar item del carrito
function eliminarDelCarrito(index) {
    let carrito = obtenerCarrito();
    carrito.splice(index, 1);
    guardarCarrito(carrito);
    cargarCarrito();
    
    mostrarNotificacion('Producto eliminado del carrito', 'warning');
}

// Función para limpiar todo el carrito
function limpiarCarrito() {
    if (confirm('¿Estás seguro de que deseas limpiar todo el carrito?')) {
        localStorage.removeItem('techshop_carrito');
        actualizarContadorCarrito();
        cargarCarrito();
        mostrarNotificacion('Carrito limpiado', 'info');
    }
}

// Función para calcular totales del carrito
function calcularTotalesCarrito() {
    const carrito = obtenerCarrito();
    const subtotal = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;

    return {
        subtotal: subtotal,
        impuestos: impuestos,
        total: total
    };
}

// Función para actualizar totales 
function actualizarTotalesCarrito() {
    const totales = calcularTotalesCarrito();
    
    const subtotalElement = document.getElementById('subtotal-carrito');
    const impuestosElement = document.getElementById('impuestos-carrito');
    const totalElement = document.getElementById('total-carrito');

    if (subtotalElement) subtotalElement.textContent = `$${totales.subtotal.toFixed(2)}`;
    if (impuestosElement) impuestosElement.textContent = `$${totales.impuestos.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${totales.total.toFixed(2)}`;
    
    actualizarTotalesCheckout();
}

// Función para ir al checkout
function irAlCheckout() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) {
        alert('Tu carrito está vacío. Agrega algunos productos antes de continuar.');
        return;
    }
    window.location.href = 'checkout.html';
}

// Función para actualizar totales en checkout
function actualizarTotalesCheckout() {
    const totales = calcularTotalesCarrito();
    
    // Obtener costo de envío seleccionado
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');
    let costoEnvio = 0;
    
    if (metodoEntrega === 'expres') {
        costoEnvio = 150;
    }
    
    const totalFinal = totales.subtotal + totales.impuestos + costoEnvio;
    
    const subtotalCheckout = document.getElementById('subtotal-checkout');
    const impuestosCheckout = document.getElementById('impuestos-checkout');
    const costoEnvioElement = document.getElementById('costo-envio');
    const totalCheckout = document.getElementById('total-checkout');

    if (subtotalCheckout) subtotalCheckout.textContent = `$${totales.subtotal.toFixed(2)}`;
    if (impuestosCheckout) impuestosCheckout.textContent = `$${totales.impuestos.toFixed(2)}`;
    if (costoEnvioElement) costoEnvioElement.textContent = `$${costoEnvio.toFixed(2)}`;
    if (totalCheckout) totalCheckout.textContent = `$${totalFinal.toFixed(2)}`;
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    notificacion.style.cssText = 'top: 100px; right: 20px; z-index: 1050; min-width: 300px;';
    
    notificacion.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 3000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    actualizarContadorCarrito();
    
    //Cargar el carrito
    if (window.location.pathname.includes('carrito.html')) {
        cargarCarrito();
    }
});