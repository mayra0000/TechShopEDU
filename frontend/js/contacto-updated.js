document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (validarFormularioContacto()) {
                enviarFormularioContacto();
            }
        });

        // Real-time validation
        const campos = ['contactNombre', 'contactEmail', 'contactAsunto', 'contactMensaje'];
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                elemento.addEventListener('blur', function () {
                    validarCampo(this);
                });

                elemento.addEventListener('input', function () {
                    if (this.classList.contains('is-invalid')) {
                        validarCampo(this);
                    }
                });
            }
        });

        // Privacy checkbox validation
        const checkboxPrivacidad = document.getElementById('contactPrivacidad');
        if (checkboxPrivacidad) {
            checkboxPrivacidad.addEventListener('change', function () {
                validarCampo(this);
            });
        }
    }
});

// Validate entire form
function validarFormularioContacto() {
    const campos = [
        'contactNombre',
        'contactEmail',
        'contactAsunto',
        'contactMensaje',
        'contactPrivacidad'
    ];

    let formularioValido = true;

    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && !validarCampo(elemento)) {
            formularioValido = false;
        }
    });

    return formularioValido;
}

// Validate individual field
function validarCampo(elemento) {
    const valor = elemento.value.trim();
    let esValido = true;
    let mensaje = '';

    // Clear previous state
    elemento.classList.remove('is-invalid', 'is-valid');

    switch (elemento.id) {
        case 'contactNombre':
            if (!valor) {
                esValido = false;
                mensaje = 'El nombre es obligatorio';
            } else if (valor.length < 2) {
                esValido = false;
                mensaje = 'El nombre debe tener al menos 2 caracteres';
            } else if (valor.length > 100) {
                esValido = false;
                mensaje = 'El nombre no puede tener más de 100 caracteres';
            }
            break;

        case 'contactEmail':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!valor) {
                esValido = false;
                mensaje = 'El email es obligatorio';
            } else if (!emailRegex.test(valor)) {
                esValido = false;
                mensaje = 'El formato del email no es válido';
            }
            break;

        case 'contactTelefono':
            if (valor && !/^[\d\s\-\+\(\)]{10,15}$/.test(valor.replace(/\s/g, ''))) {
                esValido = false;
                mensaje = 'El formato del teléfono no es válido';
            }
            break;

        case 'contactAsunto':
            if (!valor) {
                esValido = false;
                mensaje = 'Debes seleccionar un asunto';
            }
            break;

        case 'contactMensaje':
            if (!valor) {
                esValido = false;
                mensaje = 'El mensaje es obligatorio';
            } else if (valor.length < 10) {
                esValido = false;
                mensaje = 'El mensaje debe tener al menos 10 caracteres';
            } else if (valor.length > 2000) {
                esValido = false;
                mensaje = 'El mensaje no puede tener más de 2000 caracteres';
            }
            break;

        case 'contactPrivacidad':
            if (!elemento.checked) {
                esValido = false;
                mensaje = 'Debes aceptar la política de privacidad';
            }
            break;
    }

    // Add validation classes
    if (esValido) {
        elemento.classList.add('is-valid');
    } else {
        elemento.classList.add('is-invalid');
        const feedback = elemento.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = mensaje;
        }
    }

    return esValido;
}

// Send contact form
async function enviarFormularioContacto() {
    const datos = {
        nombre: document.getElementById('contactNombre').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        telefono: document.getElementById('contactTelefono')?.value.trim() || '',
        asunto: document.getElementById('contactAsunto').value,
        mensaje: document.getElementById('contactMensaje').value.trim()
    };

    const btnEnviar = document.querySelector('#contactForm button[type="submit"]');
    const textoOriginal = btnEnviar.innerHTML;

    try {
        // Show loading state
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';

        const response = await api.enviarMensajeContacto(datos);

        if (response.success) {
            mostrarMensajeExito(datos, response.id);
            limpiarFormulario();
        } else {
            throw new Error(response.message);
        }

    } catch (error) {
        console.error('Error enviando mensaje:', error);
        mostrarMensajeError(api.getErrorMessage(error));
    } finally {
        // Restore button state
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = textoOriginal;
    }
}

// Show success message
function mostrarMensajeExito(datos, messageId) {
    const modalHtml = `
        <div class="modal fade" id="exitoContactoModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle me-2"></i>¡Mensaje Enviado!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="fas fa-envelope-circle-check text-success" style="font-size: 3rem;"></i>
                        </div>
                        <h5>¡Gracias por contactarnos, ${datos.nombre}!</h5>
                        <p>Tu mensaje ha sido enviado exitosamente. Nuestro equipo se pondrá en contacto contigo a la brevedad posible.</p>
                        <div class="alert alert-info">
                            <strong>Número de referencia:</strong> #${messageId}<br>
                            <strong>Asunto:</strong> ${datos.asunto}<br>
                            <strong>Email de contacto:</strong> ${datos.email}
                        </div>
                        <div class="alert alert-primary">
                            <strong>Tiempo de respuesta esperado:</strong><br>
                            <i class="fas fa-clock me-1"></i> Email: Menos de 24 horas<br>
                            <i class="fas fa-phone me-1"></i> Asuntos urgentes: Mismo día
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                            <i class="fas fa-check me-2"></i>Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalAnterior = document.getElementById('exitoContactoModal');
    if (modalAnterior) {
        modalAnterior.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('exitoContactoModal'));
    modal.show();
}

// Show error message
function mostrarMensajeError(mensaje) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Error:</strong> ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Insert at the top of the form
    const form = document.getElementById('contactForm');
    form.insertAdjacentHTML('afterbegin', alertHtml);

    // Scroll to the error
    form.scrollIntoView({ behavior: 'smooth' });
}

// Clear form
function limpiarFormulario() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.reset();
        limpiarErroresVisuales();
    }
}

// Clear visual errors
function limpiarErroresVisuales() {
    const campos = document.querySelectorAll('.form-control, .form-select, .form-check-input');
    campos.forEach(campo => {
        campo.classList.remove('is-valid', 'is-invalid');
    });
}

// Format phone number
document.addEventListener('DOMContentLoaded', function () {
    const telefonoInput = document.getElementById('contactTelefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function () {
            let valor = this.value.replace(/\D/g, '');
            if (valor.length > 10) {
                valor = valor.substring(0, 10);
            }
            if (valor.length >= 6) {
                valor = valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '$1 $2 $3');
            } else if (valor.length >= 2) {
                valor = valor.replace(/(\d{2})(\d{0,4})/, '$1 $2');
            }

            this.value = valor.trim();
        });
    }

    // Character counter for message
    const mensajeInput = document.getElementById('contactMensaje');
    if (mensajeInput) {
        const contador = document.createElement('div');
        contador.className = 'form-text text-end';
        contador.id = 'mensaje-contador';
        mensajeInput.parentNode.appendChild(contador);

        function actualizarContador() {
            const longitud = mensajeInput.value.length;
            contador.textContent = `${longitud}/2000 caracteres`;

            if (longitud > 1900) {
                contador.className = 'form-text text-end text-warning';
            } else if (longitud > 2000) {
                contador.className = 'form-text text-end text-danger';
            } else {
                contador.className = 'form-text text-end text-muted';
            }
        }

        mensajeInput.addEventListener('input', actualizarContador);
        actualizarContador();
    }
});
