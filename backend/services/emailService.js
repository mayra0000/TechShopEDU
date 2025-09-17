// services/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
    constructor() {
        this.fromEmail = `${process.env.FROM_NAME || 'TechShop EDU'} <${process.env.FROM_EMAIL || 'noreply@example.com'}>`;
    }

    // Enviar email de confirmación de pedido
    async enviarConfirmacionPedido(pedido, items) {
        try {
            const emailHtml = this.generarHtmlConfirmacion(pedido, items);
            const emailText = this.generarTextoConfirmacion(pedido, items);

            const { data, error } = await resend.emails.send({
                from: this.fromEmail,
                to: [pedido.email_cliente],
                subject: `Confirmación de Pedido #${pedido.numero_pedido} - TechShop EDU`,
                html: emailHtml,
                text: emailText
            });

            if (error) {
                console.error('Error enviando email:', error);
                return { success: false, error };
            }

            console.log('Email enviado exitosamente:', data);
            return { success: true, data };

        } catch (error) {
            console.error('Error en enviarConfirmacionPedido:', error);
            return { success: false, error: error.message };
        }
    }

    // Función helper para formatear variantes
    formatearVariantes(descripcionVariantes) {
        if (!descripcionVariantes) return '';

        try {
            let variantes;

            // Si es un string, intentar parsearlo
            if (typeof descripcionVariantes === 'string') {
                // Si parece JSON, parsearlo
                if (descripcionVariantes.startsWith('{') || descripcionVariantes.startsWith('[')) {
                    variantes = JSON.parse(descripcionVariantes);
                } else {
                    // Si ya está formateado, devolverlo
                    return descripcionVariantes;
                }
            } else {
                // Si ya es un objeto
                variantes = descripcionVariantes;
            }

            // Función recursiva para extraer valores legibles
            const extraerValores = (obj, prefijo = '') => {
                const resultados = [];

                for (const [clave, valor] of Object.entries(obj)) {
                    const claveCompleta = prefijo ? `${prefijo}.${clave}` : clave;

                    if (valor && typeof valor === 'object') {
                        // Si tiene la propiedad 'valor', usar esa
                        if (valor.valor !== undefined) {
                            resultados.push(`${clave}: ${valor.valor}`);
                        }
                        // Si tiene 'value', usar esa
                        else if (valor.value !== undefined) {
                            resultados.push(`${clave}: ${valor.value}`);
                        }
                        // Si es un objeto con más propiedades, extraer recursivamente
                        else {
                            // Buscar la primera propiedad que parezca un valor legible
                            const propiedadesValor = ['name', 'nombre', 'text', 'texto', 'label', 'etiqueta'];
                            let valorEncontrado = false;

                            for (const prop of propiedadesValor) {
                                if (valor[prop] !== undefined) {
                                    resultados.push(`${clave}: ${valor[prop]}`);
                                    valorEncontrado = true;
                                    break;
                                }
                            }

                            // Si no se encontró un valor legible, usar el primer valor primitivo
                            if (!valorEncontrado) {
                                for (const [subClave, subValor] of Object.entries(valor)) {
                                    if (typeof subValor === 'string' || typeof subValor === 'number') {
                                        resultados.push(`${clave}: ${subValor}`);
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        // Es un valor primitivo
                        resultados.push(`${clave}: ${valor}`);
                    }
                }

                return resultados;
            };

            // Extraer valores del objeto de variantes
            if (typeof variantes === 'object' && variantes !== null) {
                const valoresFormateados = extraerValores(variantes);
                return valoresFormateados.join(', ');
            }

            return variantes.toString();

        } catch (e) {
            console.log('Error formateando variantes:', e, 'Datos:', descripcionVariantes);
            // Si no se puede parsear, devolver vacío para evitar mostrar JSON crudo
            return '';
        }
    }

    // Generar HTML del email
    generarHtmlConfirmacion(pedido, items) {
        const metodosEntrega = {
            'estandar': 'Envío Estándar (5-7 días hábiles) - Gratis',
            'expres': 'Envío Exprés (1-2 días hábiles) - $150.00',
            'tienda': 'Recogida en Tienda - Gratis'
        };

        const fechaPedido = new Date(pedido.fecha_pedido).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let itemsHtml = '';
        items.forEach(item => {
            const descripcionVariantes = this.formatearVariantes(item.descripcion_variantes);
            itemsHtml += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0;">
                        <strong>${item.nombre_producto}</strong><br>
                        ${descripcionVariantes ? `<small style="color: #6b7280;">${descripcionVariantes}</small><br>` : ''}
                        <small>Cantidad: ${item.cantidad}</small>
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                        ${parseFloat(item.precio_unitario).toFixed(2)}
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                        <strong>${parseFloat(item.subtotal).toFixed(2)}</strong>
                    </td>
                </tr>
            `;
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmación de Pedido</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">¡Pedido Confirmado!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">Gracias por tu compra, ${pedido.nombre_cliente}</p>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #1f2937; margin-top: 0;">Detalles del Pedido</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0;"><strong>Número de Pedido:</strong></td>
                                <td style="padding: 8px 0; text-align: right;"><code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${pedido.numero_pedido}</code></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Fecha:</strong></td>
                                <td style="padding: 8px 0; text-align: right;">${fechaPedido}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Estado:</strong></td>
                                <td style="padding: 8px 0; text-align: right;">
                                    <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase;">${pedido.estado}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Método de Entrega:</strong></td>
                                <td style="padding: 8px 0; text-align: right;">${metodosEntrega[pedido.metodo_entrega]}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Dirección de Envío</h3>
                        <p style="margin: 0; line-height: 1.5;">
                            ${pedido.direccion_envio}<br>
                            ${pedido.ciudad_envio}, ${pedido.codigo_postal_envio}
                        </p>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Productos Pedidos</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f3f4f6;">
                                    <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Producto</th>
                                    <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Precio</th>
                                    <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #1f2937; margin-top: 0;">Resumen de Pago</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0;">Subtotal:</td>
                                <td style="padding: 8px 0; text-align: right;">$${parseFloat(pedido.subtotal).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Envío:</td>
                                <td style="padding: 8px 0; text-align: right;">$${parseFloat(pedido.costo_envio).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Impuestos (16%):</td>
                                <td style="padding: 8px 0; text-align: right;">$${parseFloat(pedido.impuestos).toFixed(2)}</td>
                            </tr>
                            <tr style="border-top: 2px solid #e5e7eb; font-weight: bold; font-size: 18px;">
                                <td style="padding: 12px 0;">TOTAL:</td>
                                <td style="padding: 12px 0; text-align: right; color: #059669;">$${parseFloat(pedido.total).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <h4 style="margin: 0 0 10px 0; color: #1e40af;">Información Importante</h4>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Recibirás una notificación cuando tu pedido sea enviado</li>
                            <li>Si tienes alguna pregunta, contáctanos con el número de pedido</li>
                            <li>Tiempo de entrega estimado: ${metodosEntrega[pedido.metodo_entrega]}</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <p style="color: #6b7280; margin: 0;">¿Necesitas ayuda? Contáctanos:</p>
                        <p style="margin: 5px 0;">
                            <strong>Email:</strong> info@techshopedu.com<br>
                            <strong>Teléfono:</strong> +52 222 123 4567
                        </p>
                    </div>

                    <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
                        <p>© 2025 TechShop EDU. Todos los derechos reservados.</p>
                        <p>Puebla, México</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Generar versión texto del email
    generarTextoConfirmacion(pedido, items) {
        const metodosEntrega = {
            'estandar': 'Envío Estándar (5-7 días hábiles) - Gratis',
            'expres': 'Envío Exprés (1-2 días hábiles) - $150.00',
            'tienda': 'Recogida en Tienda - Gratis'
        };

        let itemsText = '';
        items.forEach(item => {
            const descripcionVariantes = this.formatearVariantes(item.descripcion_variantes);
            itemsText += `- ${item.nombre_producto}\n`;
            if (descripcionVariantes) {
                itemsText += `  ${descripcionVariantes}\n`;
            }
            itemsText += `  Cantidad: ${item.cantidad} | Precio: ${parseFloat(item.precio_unitario).toFixed(2)} | Subtotal: ${parseFloat(item.subtotal).toFixed(2)}\n\n`;
        });

        return `
¡PEDIDO CONFIRMADO!

Hola ${pedido.nombre_cliente},

Tu pedido ha sido procesado exitosamente.

DETALLES DEL PEDIDO:
Número de Pedido: ${pedido.numero_pedido}
Fecha: ${new Date(pedido.fecha_pedido).toLocaleDateString('es-MX')}
Estado: ${pedido.estado}
Método de Entrega: ${metodosEntrega[pedido.metodo_entrega]}

DIRECCIÓN DE ENVÍO:
${pedido.direccion_envio}
${pedido.ciudad_envio}, ${pedido.codigo_postal_envio}

PRODUCTOS PEDIDOS:
${itemsText}

RESUMEN DE PAGO:
Subtotal: $${parseFloat(pedido.subtotal).toFixed(2)}
Envío: $${parseFloat(pedido.costo_envio).toFixed(2)}
Impuestos (16%): $${parseFloat(pedido.impuestos).toFixed(2)}
TOTAL: $${parseFloat(pedido.total).toFixed(2)}

¿Necesitas ayuda?
Email: info@techshopedu.com
Teléfono: +52 222 123 4567

Gracias por tu compra.

TechShop EDU
Puebla, México
        `;
    }

    // Enviar email de actualización de estado
    async enviarActualizacionEstado(pedido, nuevoEstado) {
        try {
            const estadosTexto = {
                'pendiente': 'Pendiente de procesamiento',
                'procesando': 'En proceso',
                'enviado': 'Enviado',
                'entregado': 'Entregado',
                'cancelado': 'Cancelado'
            };

            const { data, error } = await resend.emails.send({
                from: this.fromEmail,
                to: [pedido.email_cliente],
                subject: `Actualización de Pedido #${pedido.numero_pedido} - ${estadosTexto[nuevoEstado]}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #2563eb;">Actualización de Pedido</h1>
                        <p>Hola ${pedido.nombre_cliente},</p>
                        <p>Tu pedido <strong>#${pedido.numero_pedido}</strong> ha sido actualizado.</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Nuevo Estado: <span style="color: #059669;">${estadosTexto[nuevoEstado]}</span></h3>
                        </div>
                        <p>Saludos,<br>Equipo TechShop EDU</p>
                    </div>
                `,
                text: `
Actualización de Pedido #${pedido.numero_pedido}

Hola ${pedido.nombre_cliente},

Tu pedido ha sido actualizado a: ${estadosTexto[nuevoEstado]}

Saludos,
Equipo TechShop EDU
                `
            });

            if (error) {
                console.error('Error enviando actualización:', error);
                return { success: false, error };
            }

            return { success: true, data };

        } catch (error) {
            console.error('Error en enviarActualizacionEstado:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
