let pasoActual = 1;

// Inicializar checkout
document.addEventListener('DOMContentLoaded', function() {
    const carrito = obtenerCarrito();
    
    if (carrito.length === 0) {
        document.getElementById('carrito-vacio-checkout').style.display = 'block';
        document.getElementById('checkout-form').style.display = 'none';
    } else {
        document.getElementById('carrito-vacio-checkout').style.display = 'none';
        document.getElementById('checkout-form').style.display = 'block';
        cargarResumenCarrito();
        actualizarTotales();
    }
});

// Cargar resumen del carrito
function cargarResumenCarrito() {
    const carrito = obtenerCarrito();
    const resumen = document.getElementById('resumen-carrito-checkout');
    
    if (!resumen) return;
    
    resumen.innerHTML = '';
    carrito.forEach(item => {
        resumen.innerHTML += `
            <div class="d-flex justify-content-between mb-2 small">
                <div>
                    <div class="fw-bold">${item.nombre}</div>
                    <div class="text-muted">${item.descripcionVariantes || ''}</div>
                    <div class="text-muted">Cantidad: ${item.cantidad}</div>
                </div>
                <div>$${(item.precio * item.cantidad).toFixed(2)}</div>
            </div>
        `;
    });
}

// Actualizar totales
function actualizarTotales() {
    const totales = calcularTotalesCarrito();
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');
    let costoEnvio = metodoEntrega === 'expres' ? 150 : 0;
    const totalFinal = totales.subtotal + totales.impuestos + costoEnvio;
    
    document.getElementById('subtotal-checkout').textContent = `$${totales.subtotal.toFixed(2)}`;
    document.getElementById('costo-envio').textContent = `$${costoEnvio.toFixed(2)}`;
    document.getElementById('impuestos-checkout').textContent = `$${totales.impuestos.toFixed(2)}`;
    document.getElementById('total-checkout').textContent = `$${totalFinal.toFixed(2)}`;
}

// Ir al siguiente paso
function siguientePaso(paso) {
    if (validarPaso()) {
        guardarDatos();
        mostrarPaso(paso);
    }
}

// Ir al paso anterior
function pasoAnterior(paso) {
    mostrarPaso(paso);
}

// Mostrar paso específico
function mostrarPaso(paso) {
    // Ocultar todos los pasos
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`step-${i}`).style.display = 'none';
        document.getElementById(`step-${i}-indicator`).classList.remove('active', 'completed');
    }
    
    // Mostrar paso actual
    document.getElementById(`step-${paso}`).style.display = 'block';
    document.getElementById(`step-${paso}-indicator`).classList.add('active');
    
    // Marcar pasos completados
    for (let i = 1; i < paso; i++) {
        document.getElementById(`step-${i}-indicator`).classList.add('completed');
    }
    
    // Actualizar barra de progreso
    document.getElementById('progress-bar').style.width = `${(paso / 3) * 100}%`;
    
    pasoActual = paso;
    
    if (paso === 3) {
        cargarResumenFinal();
    }
}

// Validar paso actual
function validarPaso() {
    if (pasoActual === 1) {
        return validarDatosEnvio();
    } else if (pasoActual === 2) {
        return validarMetodoEntrega();
    }
    return true;
}

// Validar datos de envío
function validarDatosEnvio() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const codigoPostal = document.getElementById('codigo-postal').value.trim();
    
    if (!nombre) {
        mostrarNotificacion('Por favor ingresa tu nombre', 'warning');
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        mostrarNotificacion('Por favor ingresa un email válido', 'warning');
        return false;
    }
    if (!direccion) {
        mostrarNotificacion('Por favor ingresa tu dirección', 'warning');
        return false;
    }
    if (!ciudad) {
        mostrarNotificacion('Por favor ingresa tu ciudad', 'warning');
        return false;
    }    
    if (!codigoPostal || !/^\d{5}$/.test(codigoPostal)) {
        mostrarNotificacion('El código postal debe tener 5 dígitos', 'warning');
        return false;
    }
    return true;
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    notificacion.style.cssText = 'top: 100px; right: 20px; z-index: 1050; min-width: 300px;';
    notificacion.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>${mensaje}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notificacion);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 4000);
}

// Validar método de entrega
function validarMetodoEntrega() {
    const metodo = document.querySelector('input[name="metodo-entrega"]:checked');
    if (!metodo) {
        mostrarNotificacion('Selecciona un método de entrega', 'warning');
        return false;
    }
    return true;
}

// Guardar datos del paso actual
function guardarDatos() {
    if (pasoActual === 1) {
        const datos = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            direccion: document.getElementById('direccion').value,
            ciudad: document.getElementById('ciudad').value,
            codigoPostal: document.getElementById('codigo-postal').value
        };
        localStorage.setItem('techshop_datos_envio', JSON.stringify(datos));
    }
    
    if (pasoActual === 2) {
        const metodo = document.querySelector('input[name="metodo-entrega"]:checked');
        if (metodo) {
            localStorage.setItem('techshop_metodo_entrega', metodo.value);
            actualizarTotales();
        }
    }
}

// Seleccionar método de entrega
function seleccionarEntrega(metodo) {
    // Quitar selección previa
    document.querySelectorAll('.delivery-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Seleccionar nuevo método
    event.currentTarget.classList.add('selected');
    event.currentTarget.querySelector('input[type="radio"]').checked = true;
    
    localStorage.setItem('techshop_metodo_entrega', metodo);
    actualizarTotales();
}

// Cargar resumen final
function cargarResumenFinal() {
    const datosEnvio = JSON.parse(localStorage.getItem('techshop_datos_envio') || '{}');
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');
    const carrito = obtenerCarrito();
    
    // Mostrar datos de envío
    document.getElementById('resumen-envio').innerHTML = `
        <p><strong>${datosEnvio.nombre}</strong></p>
        <p>${datosEnvio.email}</p>
        <p>${datosEnvio.direccion}</p>
        <p>${datosEnvio.ciudad}, ${datosEnvio.codigoPostal}</p>
    `;
    
    // Mostrar método de entrega
    let metodoTexto = '';
    switch (metodoEntrega) {
        case 'estandar': metodoTexto = 'Envío Estándar (5-7 días) - Gratis'; break;
        case 'expres': metodoTexto = 'Envío Exprés (1-2 días) - $150.00'; break;
        case 'tienda': metodoTexto = 'Recogida en Tienda - Gratis'; break;
    }
    document.getElementById('resumen-entrega').innerHTML = `<p><strong>${metodoTexto}</strong></p>`;
    
    // Mostrar productos
    const resumenProductos = document.getElementById('resumen-productos');
    resumenProductos.innerHTML = '';
    carrito.forEach(item => {
        resumenProductos.innerHTML += `
            <div class="d-flex justify-content-between mb-2 border-bottom pb-2">
                <div>
                    <strong>${item.nombre}</strong><br>
                    <small class="text-muted">${item.descripcionVariantes || ''}</small><br>
                    <small>Cantidad: ${item.cantidad}</small>
                </div>
                <div><strong>$${(item.precio * item.cantidad).toFixed(2)}</strong></div>
            </div>
        `;
    });
}

// Confirmar pedido
function confirmarPedido() {
    const numeroPedido = 'ORD-' + Date.now();
    generarArchivoPedido(numeroPedido);
    
    // Limpiar datos
    localStorage.removeItem('techshop_carrito');
    localStorage.removeItem('techshop_datos_envio');
    localStorage.removeItem('techshop_metodo_entrega');
    
    // Mostrar confirmación
    alert(`¡Pedido confirmado!\n\nNúmero de pedido: ${numeroPedido}\n\nEl archivo del pedido se ha descargado automáticamente.`);
    
    // Redirigir al inicio
    window.location.href = 'index.html';
}

// Generar archivo de pedido
function generarArchivoPedido(numeroPedido) {
    const carrito = obtenerCarrito();
    const datosEnvio = JSON.parse(localStorage.getItem('techshop_datos_envio') || '{}');
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');
    const totales = calcularTotalesCarrito();
    
    let costoEnvio = 0;
    let metodoTexto = '';
    
    switch (metodoEntrega) {
        case 'estandar':
            metodoTexto = 'Envío Estándar (5-7 días hábiles)';
            break;
        case 'expres':
            metodoTexto = 'Envío Exprés (1-2 días hábiles)';
            costoEnvio = 150;
            break;
        case 'tienda':
            metodoTexto = 'Recoger en Tienda';
            break;
    }

    const fechaPedido = new Date().toLocaleString('es-MX');
    const totalFinal = totales.subtotal + totales.impuestos + costoEnvio;

    let contenido = `TECHSHOP EDU - CONFIRMACIÓN DE PEDIDO
            --------------------------------------

        Número de Pedido: ${numeroPedido}
        Fecha: ${fechaPedido}

        DATOS DEL CLIENTE:
        --------------------------------------
        Nombre: ${datosEnvio.nombre}
        Email: ${datosEnvio.email}
        Dirección: ${datosEnvio.direccion}
        Ciudad: ${datosEnvio.ciudad}
        Código Postal: ${datosEnvio.codigoPostal}

        MÉTODO DE ENTREGA:
        --------------------------------------
        ${metodoTexto}

        PRODUCTOS PEDIDOS:
        --------------------------------------
        `;

    carrito.forEach((item, index) => {
        contenido += `      ${index + 1}. ${item.nombre}\n`;
        if (item.descripcionVariantes) {
            contenido += `      Variantes: ${item.descripcionVariantes}\n`;
        }
        contenido += `      Precio unitario: $${item.precio.toFixed(2)}\n`;
        contenido += `      Cantidad: ${item.cantidad}\n`;
        contenido += `      Subtotal: $${(item.precio * item.cantidad).toFixed(2)}\n\n`;
    });

    contenido += `      ------------------------------
        Subtotal: $${totales.subtotal.toFixed(2)}
        Envío: $${costoEnvio.toFixed(2)}
        Impuestos (16%): $${totales.impuestos.toFixed(2)}
        TOTAL: $${totalFinal.toFixed(2)}

        ¡Gracias por tu compra en TechShop EDU!`;

    // Descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedido_${numeroPedido}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}