// contacto.js - Gestión del formulario de contacto

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validarFormularioContacto()) {
                enviarFormularioContacto();
            }
        });
        
        // Validación en tiempo real
        const campos = ['contactNombre', 'contactEmail', 'contactAsunto', 'contactMensaje'];
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                elemento.addEventListener('blur', function() {
                    validarCampo(this);
                });
                
                elemento.addEventListener('input', function() {
                    if (this.classList.contains('is-invalid')) {
                        validarCampo(this);
                    }
                });
            }
        });
        
        // Validación del checkbox
        const checkboxPrivacidad = document.getElementById('contactPrivacidad');
        if (checkboxPrivacidad) {
            checkboxPrivacidad.addEventListener('change', function() {
                validarCampo(this);
            });
        }
    }
});

// Función para validar todo el formulario
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

// Función para validar un campo individual
function validarCampo(elemento) {
    const valor = elemento.value.trim();
    let esValido = true;
    let mensaje = '';
    
    // Limpiar estado previo
    elemento.classList.remove('is-invalid', 'is-valid');
    
    switch (elemento.id) {
        case 'contactNombre':
            if (!valor) {
                esValido = false;
                mensaje = 'El nombre es obligatorio';
            } else if (valor.length < 2) {
                esValido = false;
                mensaje = 'El nombre debe tener al menos 2 caracteres';
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
            }
            break;
            
        case 'contactPrivacidad':
            if (!elemento.checked) {
                esValido = false;
                mensaje = 'Debes aceptar la política de privacidad';
            }
            break;
    }
    
    // Agregar clases de validación
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

// Función para "enviar" el formulario
function enviarFormularioContacto() {
    const datos = {
        nombre: document.getElementById('contactNombre').value,
        email: document.getElementById('contactEmail').value,
        telefono: document.getElementById('contactTelefono').value,
        asunto: document.getElementById('contactAsunto').value,
        mensaje: document.getElementById('contactMensaje').value,
        fecha: new Date().toLocaleString('es-MX')
    };
    
    const btnEnviar = document.querySelector('#contactForm button[type="submit"]');
    const textoOriginal = btnEnviar.innerHTML;
    
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';
    
    setTimeout(() => {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = textoOriginal;
        
        mostrarMensajeExito(datos);
        limpiarFormulario();
        
    }, 2000);
}

// Función para mostrar mensaje de éxito
function mostrarMensajeExito(datos) {
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

// Función para limpiar el formulario
function limpiarFormulario() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.reset();
        limpiarErroresVisuales();
    }
}

// Función para formatear número de teléfono
document.addEventListener('DOMContentLoaded', function() {
    const telefonoInput = document.getElementById('contactTelefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
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
});