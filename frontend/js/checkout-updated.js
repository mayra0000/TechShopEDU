// js/checkout-complete.js - Complete updated checkout to use API

let pasoActual = 1;
let carritoCheckout = null;

// Initialize checkout
document.addEventListener('DOMContentLoaded', async function () {
    try {
        mostrarCargando(true);
        const response = await api.getCarrito();

        if (!response.success) {
            throw new Error('Error obteniendo carrito');
        }

        carritoCheckout = response;
        const carrito = response.carrito;

        if (!carrito.items || carrito.items.length === 0) {
            document.getElementById('carrito-vacio-checkout').style.display = 'block';
            document.getElementById('checkout-form').style.display = 'none';
        } else {
            document.getElementById('carrito-vacio-checkout').style.display = 'none';
            document.getElementById('checkout-form').style.display = 'block';
            cargarResumenCarrito(carrito);
            actualizarTotales(carrito);
        }
    } catch (error) {
        console.error('Error inicializando checkout:', error);
        mostrarNotificacion('Error cargando checkout: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
});

// Load cart summary
function cargarResumenCarrito(carrito) {
    const resumen = document.getElementById('resumen-carrito-checkout');

    if (!resumen) return;

    resumen.innerHTML = '';
    carrito.items.forEach(item => {
        const descripcionVariantes = generarDescripcionVariantes(item.variantes);
        resumen.innerHTML += `
            <div class="d-flex justify-content-between mb-2 small">
                <div>
                    <div class="fw-bold">${item.nombre}</div>
                    ${descripcionVariantes ? `<div class="text-muted">${descripcionVariantes}</div>` : ''}
                    <div class="text-muted">Cantidad: ${item.cantidad}</div>
                </div>
                <div>$${(parseFloat(item.precio_unitario) * item.cantidad).toFixed(2)}</div>
            </div>
        `;
    });
}

// Update totals
function actualizarTotales(carrito = null) {
    const carritoData = carrito || carritoCheckout?.carrito;
    if (!carritoData) return;

    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega') || 'estandar';
    const calculoEnvio = api.calcularTotalConEnvio(
        carritoData.subtotal,
        carritoData.impuestos,
        metodoEntrega
    );

    const subtotalElement = document.getElementById('subtotal-checkout');
    const costoEnvioElement = document.getElementById('costo-envio');
    const impuestosElement = document.getElementById('impuestos-checkout');
    const totalElement = document.getElementById('total-checkout');

    if (subtotalElement) subtotalElement.textContent = `$${carritoData.subtotal.toFixed(2)}`;
    if (costoEnvioElement) costoEnvioElement.textContent = `$${calculoEnvio.costoEnvio.toFixed(2)}`;
    if (impuestosElement) impuestosElement.textContent = `$${carritoData.impuestos.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${calculoEnvio.total.toFixed(2)}`;
}

// Go to next step
function siguientePaso(paso) {
    if (validarPaso()) {
        guardarDatos();
        mostrarPaso(paso);
    }
}

// Go to previous step
function pasoAnterior(paso) {
    mostrarPaso(paso);
}

// Show specific step
function mostrarPaso(paso) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        const indicatorElement = document.getElementById(`step-${i}-indicator`);

        if (stepElement) stepElement.style.display = 'none';
        if (indicatorElement) {
            indicatorElement.classList.remove('active', 'completed');
        }
    }

    // Show current step
    const currentStep = document.getElementById(`step-${paso}`);
    const currentIndicator = document.getElementById(`step-${paso}-indicator`);

    if (currentStep) currentStep.style.display = 'block';
    if (currentIndicator) currentIndicator.classList.add('active');

    // Mark completed steps
    for (let i = 1; i < paso; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        if (indicator) indicator.classList.add('completed');
    }

    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${(paso / 3) * 100}%`;
    }

    pasoActual = paso;

    if (paso === 3) {
        cargarResumenFinal();
    }
}

// Validate current step
function validarPaso() {
    if (pasoActual === 1) {
        return validarDatosEnvio();
    } else if (pasoActual === 2) {
        return validarMetodoEntrega();
    }
    return true;
}

// Validate shipping data
function validarDatosEnvio() {
    const nombre = document.getElementById('nombre')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const direccion = document.getElementById('direccion')?.value.trim() || '';
    const ciudad = document.getElementById('ciudad')?.value.trim() || '';
    const codigoPostal = document.getElementById('codigo-postal')?.value.trim() || '';

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

// Validate delivery method
function validarMetodoEntrega() {
    const metodo = document.querySelector('input[name="metodo-entrega"]:checked');
    if (!metodo) {
        mostrarNotificacion('Selecciona un método de entrega', 'warning');
        return false;
    }
    return true;
}

// Save current step data
function guardarDatos() {
    if (pasoActual === 1) {
        const datos = {
            nombre: document.getElementById('nombre')?.value || '',
            email: document.getElementById('email')?.value || '',
            telefono: document.getElementById('telefono')?.value || '',
            direccion: document.getElementById('direccion')?.value || '',
            ciudad: document.getElementById('ciudad')?.value || '',
            codigo_postal: document.getElementById('codigo-postal')?.value || ''
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

// Select delivery method
function seleccionarEntrega(metodo) {
    // Remove previous selection
    document.querySelectorAll('.delivery-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Select new method
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
        const radioInput = event.currentTarget.querySelector('input[type="radio"]');
        if (radioInput) radioInput.checked = true;
    }

    localStorage.setItem('techshop_metodo_entrega', metodo);
    actualizarTotales();
}

// Load final summary
function cargarResumenFinal() {
    const datosEnvio = JSON.parse(localStorage.getItem('techshop_datos_envio') || '{}');
    const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');

    // Show shipping data
    const resumenEnvioElement = document.getElementById('resumen-envio');
    if (resumenEnvioElement) {
        resumenEnvioElement.innerHTML = `
            <p><strong>${datosEnvio.nombre || 'N/A'}</strong></p>
            <p>${datosEnvio.email || 'N/A'}</p>
            ${datosEnvio.telefono ? `<p>${datosEnvio.telefono}</p>` : ''}
            <p>${datosEnvio.direccion || 'N/A'}</p>
            <p>${datosEnvio.ciudad || 'N/A'}, ${datosEnvio.codigo_postal || 'N/A'}</p>
        `;
    }

    // Show delivery method
    let metodoTexto = '';
    switch (metodoEntrega) {
        case 'estandar': metodoTexto = 'Envío Estándar (5-7 días) - Gratis'; break;
        case 'expres': metodoTexto = 'Envío Exprés (1-2 días) - $150.00'; break;
        case 'tienda': metodoTexto = 'Recogida en Tienda - Gratis'; break;
        default: metodoTexto = 'No seleccionado';
    }

    const resumenEntregaElement = document.getElementById('resumen-entrega');
    if (resumenEntregaElement) {
        resumenEntregaElement.innerHTML = `<p><strong>${metodoTexto}</strong></p>`;
    }

    // Show products
    const resumenProductos = document.getElementById('resumen-productos');
    if (resumenProductos && carritoCheckout && carritoCheckout.carrito && carritoCheckout.carrito.items) {
        resumenProductos.innerHTML = '';
        carritoCheckout.carrito.items.forEach(item => {
            const descripcionVariantes = generarDescripcionVariantes(item.variantes);
            resumenProductos.innerHTML += `
                <div class="d-flex justify-content-between mb-2 border-bottom pb-2">
                    <div>
                        <strong>${item.nombre}</strong><br>
                        ${descripcionVariantes ? `<small class="text-muted">${descripcionVariantes}</small><br>` : ''}
                        <small>Cantidad: ${item.cantidad}</small>
                    </div>
                    <div><strong>$${(parseFloat(item.precio_unitario) * item.cantidad).toFixed(2)}</strong></div>
                </div>
            `;
        });
    }
}

// Confirm order
async function confirmarPedido() {
    try {
        mostrarCargando(true);

        const datosEnvio = JSON.parse(localStorage.getItem('techshop_datos_envio') || '{}');
        const metodoEntrega = localStorage.getItem('techshop_metodo_entrega');

        if (!datosEnvio.nombre || !datosEnvio.email || !metodoEntrega) {
            mostrarNotificacion('Faltan datos para completar el pedido', 'error');
            return;
        }

        const response = await api.crearPedido(datosEnvio, metodoEntrega);

        if (response.success) {
            // Clear local storage
            localStorage.removeItem('techshop_datos_envio');
            localStorage.removeItem('techshop_metodo_entrega');

            // Show success modal
            mostrarModalExito(response.pedido);

            // Redirect after a delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 5000);

        } else {
            mostrarNotificacion('Error creando pedido: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error confirmando pedido:', error);
        mostrarNotificacion('Error confirmando pedido: ' + api.getErrorMessage(error), 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Show success modal
function mostrarModalExito(pedido) {
    const modalHtml = `
        <div class="modal fade" id="exitoPedidoModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle me-2"></i>¡Pedido Confirmado!
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-shopping-bag text-success" style="font-size: 3rem;"></i>
                        </div>
                        <h5>¡Gracias por tu compra!</h5>
                        <p>Tu pedido ha sido procesado exitosamente.</p>
                        <div class="alert alert-info">
                            <strong>Número de pedido:</strong><br>
                            <code class="fs-5">${pedido.numero_pedido}</code>
                        </div>
                        <div class="alert alert-warning">
                            <strong>Total pagado:</strong> $${pedido.total.toFixed(2)}<br>
                            <strong>Estado:</strong> ${pedido.estado}
                        </div>
                        <p class="text-muted">
                            Recibirás un email de confirmación con los detalles de tu pedido.<br>
                            Serás redirigido automáticamente en 5 segundos.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" onclick="window.location.href='index.html'">
                            <i class="fas fa-home me-2"></i>Ir al Inicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal
    const modalAnterior = document.getElementById('exitoPedidoModal');
    if (modalAnterior) {
        modalAnterior.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('exitoPedidoModal'));
    modal.show();
}

// Generate variant description
function generarDescripcionVariantes(variantes) {
    if (!variantes || typeof variantes !== 'object') return '';

    return Object.entries(variantes)
        .map(([tipo, variante]) => `${tipo}: ${variante.valor || variante}`)
        .join(', ');
}

// Show loading indicator
function mostrarCargando(mostrar) {
    const existente = document.getElementById('loading-checkout');

    if (mostrar && !existente) {
        const loading = document.createElement('div');
        loading.id = 'loading-checkout';
        loading.className = 'position-fixed top-50 start-50 translate-middle';
        loading.style.zIndex = '9999';
        loading.innerHTML = `
            <div class="d-flex flex-column align-items-center">
                <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Procesando...</span>
                </div>
                <div class="text-primary">Procesando pedido...</div>
            </div>
        `;
        document.body.appendChild(loading);
    } else if (!mostrar && existente) {
        existente.remove();
    }
}

// Show notifications
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
    }, 5000);
}

// Clean up visual errors
function limpiarErroresVisuales() {
    const campos = document.querySelectorAll('.form-control, .form-select, .form-check-input');
    campos.forEach(campo => {
        campo.classList.remove('is-valid', 'is-invalid');
    });
}
