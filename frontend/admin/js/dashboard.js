// Dashboard Variables
let charts = {};
let dashboardData = {};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function () {
  await cargarDashboard();
});

// Show section function
function mostrarSeccion(seccion) {
  // Hide all sections
  document.querySelectorAll('.seccion').forEach(sec => {
    sec.classList.remove('active');
  });

  // Remove active class from menu links
  document.querySelectorAll('.menu-link').forEach(link => {
    link.classList.remove('active');
  });

  // Show selected section
  document.getElementById(`${seccion}-section`).classList.add('active');

  // Add active class to clicked menu link
  event.target.closest('.menu-link').classList.add('active');

  // Load data for specific sections
  if (seccion === 'pedidos') {
    cargarPedidos();
  } else if (seccion === 'contactos') {
    cargarContactos();
  }
}

// Load Dashboard Data
async function cargarDashboard() {
  try {
    // Load statistics
    await cargarEstadisticas();

    // Load charts
    await cargarGraficos();

  } catch (error) {
    console.error('Error cargando dashboard:', error);
    mostrarNotificacion('Error cargando dashboard', 'error');
  }
}

// Load Statistics
async function cargarEstadisticas() {
  try {
    const response = await api.getEstadisticasVentas();

    if (response.success) {
      const stats = response.estadisticas;

      // Update statistics cards
      document.getElementById('total-ventas').textContent = `$${stats.total_ventas.toLocaleString()}`;
      document.getElementById('total-pedidos').textContent = stats.total_pedidos.toLocaleString();
      document.getElementById('promedio-pedido').textContent = `$${stats.promedio_pedido.toLocaleString()}`;

      dashboardData.estadisticas = stats;
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    // Set default values
    document.getElementById('total-ventas').textContent = '$0';
    document.getElementById('total-pedidos').textContent = '0';
    document.getElementById('promedio-pedido').textContent = '$0';
  }
}

// Load Charts
async function cargarGraficos() {
  try {
    const response = await api.getDatosGraficos();

    if (response.success) {
      const datos = response.datos;

      // Sales by month chart
      crearGraficoVentasPorMes(datos.ventas_por_mes);

      // Top products chart
      crearGraficoProductosMasVendidos(datos.productos_mas_vendidos);

      // Order status chart
      crearGraficoEstadosPedidos(datos.estados_pedidos);

      // Delivery methods chart
      crearGraficoMetodosEntrega(datos.metodos_entrega);
    }
  } catch (error) {
    console.error('Error cargando gráficos:', error);
    // Create charts with sample data
    crearGraficosSample();
  }
}

// Create Sales by Month Chart
function crearGraficoVentasPorMes(datos) {
  const ctx = document.getElementById('ventasPorMes').getContext('2d');

  if (charts.ventasPorMes) {
    charts.ventasPorMes.destroy();
  }

  charts.ventasPorMes = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.map(d => d.mes),
      datasets: [{
        label: 'Ventas ($)',
        data: datos.map(d => d.total),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Create Top Products Chart
function crearGraficoProductosMasVendidos(datos) {
  const ctx = document.getElementById('productosMasVendidos').getContext('2d');

  if (charts.productosMasVendidos) {
    charts.productosMasVendidos.destroy();
  }

  charts.productosMasVendidos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.map(d => d.nombre),
      datasets: [{
        label: 'Cantidad Vendida',
        data: datos.map(d => d.cantidad),
        backgroundColor: [
          '#10b981',
          '#3b82f6',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create Order Status Chart
function crearGraficoEstadosPedidos(datos) {
  const ctx = document.getElementById('estadosPedidos').getContext('2d');

  if (charts.estadosPedidos) {
    charts.estadosPedidos.destroy();
  }

  charts.estadosPedidos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: datos.map(d => d.estado),
      datasets: [{
        data: datos.map(d => d.cantidad),
        backgroundColor: [
          '#f59e0b',
          '#3b82f6',
          '#10b981',
          '#06b6d4',
          '#ef4444'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Create Delivery Methods Chart
function crearGraficoMetodosEntrega(datos) {
  const ctx = document.getElementById('metodosEntrega').getContext('2d');

  if (charts.metodosEntrega) {
    charts.metodosEntrega.destroy();
  }

  charts.metodosEntrega = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: datos.map(d => d.metodo),
      datasets: [{
        data: datos.map(d => d.cantidad),
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Create Sample Charts (fallback)
function crearGraficosSample() {
  // Sample data for demonstration
  crearGraficoVentasPorMes([
    { mes: 'Enero', total: 15000 },
    { mes: 'Febrero', total: 22000 },
    { mes: 'Marzo', total: 18000 },
    { mes: 'Abril', total: 25000 },
    { mes: 'Mayo', total: 30000 },
    { mes: 'Junio', total: 28000 }
  ]);

  crearGraficoProductosMasVendidos([
    { nombre: 'Tablet Educativa', cantidad: 45 },
    { nombre: 'Kit Robótica', cantidad: 32 },
    { nombre: 'Impresora 3D', cantidad: 28 },
    { nombre: 'Monitor', cantidad: 25 },
    { nombre: 'Teclado', cantidad: 20 }
  ]);

  crearGraficoEstadosPedidos([
    { estado: 'Pendiente', cantidad: 15 },
    { estado: 'Procesando', cantidad: 8 },
    { estado: 'Enviado', cantidad: 12 },
    { estado: 'Entregado', cantidad: 45 },
    { estado: 'Cancelado', cantidad: 3 }
  ]);

  crearGraficoMetodosEntrega([
    { metodo: 'Estándar', cantidad: 45 },
    { metodo: 'Exprés', cantidad: 25 },
    { metodo: 'Tienda', cantidad: 13 }
  ]);
}

// Load Orders
async function cargarPedidos() {
  try {
    const response = await api.getPedidos({ limite: 20 });

    if (response.success) {
      const pedidos = response.pedidos;
      const tbody = document.getElementById('pedidos-tabla');

      tbody.innerHTML = '';

      pedidos.forEach(pedido => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
                    <td><strong>${pedido.numero_pedido}</strong></td>
                    <td>${pedido.nombre_cliente}</td>
                    <td>${new Date(pedido.fecha_pedido).toLocaleDateString('es-MX')}</td>
                    <td><strong>$${parseFloat(pedido.total).toLocaleString()}</strong></td>
                    <td><span class="status-badge status-${pedido.estado}">${pedido.estado}</span></td>
                    <td>
                        <select class="form-select form-select-sm" onchange="cambiarEstadoPedido('${pedido.numero_pedido}', this.value, this)">
                            <option value="pendiente" ${pedido.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="procesando" ${pedido.estado === 'procesando' ? 'selected' : ''}>Procesando</option>
                            <option value="enviado" ${pedido.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                            <option value="entregado" ${pedido.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                            <option value="cancelado" ${pedido.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </td>
                `;
        tbody.appendChild(fila);
      });
    }
  } catch (error) {
    console.error('Error cargando pedidos:', error);
    document.getElementById('pedidos-tabla').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">Error cargando pedidos</td>
            </tr>
        `;
  }
}

// Change Order Status
async function cambiarEstadoPedido(numeroPedido, nuevoEstado, selectElement) {
  try {
    const response = await api.actualizarEstadoPedido(numeroPedido, nuevoEstado);

    if (response.success) {
      mostrarNotificacion('Estado del pedido actualizado', 'success');
      // Update status badge
      const fila = selectElement.closest('tr');
      const badge = fila.querySelector('.status-badge');
      badge.className = `status-badge status-${nuevoEstado}`;
      badge.textContent = nuevoEstado;
    } else {
      mostrarNotificacion('Error actualizando estado: ' + response.message, 'error');
      // Revert select value
      const currentBadge = selectElement.closest('tr').querySelector('.status-badge');
      selectElement.value = currentBadge.textContent;
    }
  } catch (error) {
    console.error('Error actualizando estado:', error);
    mostrarNotificacion('Error actualizando estado del pedido', 'error');
    // Reload orders to reset the UI
    cargarPedidos();
  }
}

// Load Contacts
async function cargarContactos() {
  try {
    const response = await api.getMensajesContacto({ limite: 10 });

    if (response.success) {
      const mensajes = response.mensajes;
      const container = document.getElementById('contactos-container');

      container.innerHTML = '';

      mensajes.forEach(mensaje => {
        const div = document.createElement('div');
        div.className = 'comentario d-flex flex-wrap';
        div.innerHTML = `
                    <div class="foto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
                            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                        </svg>
                    </div>
                    <div class="texto">
                        <strong>${mensaje.nombre}</strong>
                        <p><small class="text-muted">${mensaje.email} • ${new Date(mensaje.fecha_envio).toLocaleDateString('es-MX')}</small></p>
                        <p><strong>Asunto:</strong> ${mensaje.asunto}</p>
                        <p class="texto-comentario">${mensaje.mensaje}</p>
                        <span class="status-badge status-${mensaje.estado}">${mensaje.estado}</span>
                    </div>
                    <div class="botones d-flex justify-content-start flex-wrap w-100">
                        <button class="aprobar" onclick="marcarContactoComoLeido(${mensaje.id})" ${mensaje.estado !== 'nuevo' ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-square" viewBox="0 0 16 16">
                                <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>
                                <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>
                            </svg>
                            Marcar Leído
                        </button>
                        <button class="respondido" onclick="marcarContactoComoRespondido(${mensaje.id})" ${mensaje.estado === 'respondido' ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply-fill" viewBox="0 0 16 16">
                                <path d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"/>
                            </svg>
                            Respondido
                        </button>
                        <button class="eliminar" onclick="eliminarContacto(${mensaje.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                            </svg>
                            Eliminar
                        </button>
                    </div>
                `;
        container.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error cargando contactos:', error);
    document.getElementById('contactos-container').innerHTML = `
            <div class="text-center text-muted p-4">Error cargando mensajes de contacto</div>
        `;
  }
}

// Mark Contact as Read
async function marcarContactoComoLeido(id) {
  try {
    const response = await api.actualizarEstadoContacto(id, 'leido');

    if (response.success) {
      mostrarNotificacion('Mensaje marcado como leído', 'success');
      cargarContactos(); // Reload contacts
    } else {
      mostrarNotificacion('Error actualizando estado: ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Error actualizando contacto:', error);
    mostrarNotificacion('Error actualizando mensaje', 'error');
  }
}

// Mark Contact as Responded
async function marcarContactoComoRespondido(id) {
  try {
    const response = await api.actualizarEstadoContacto(id, 'respondido');

    if (response.success) {
      mostrarNotificacion('Mensaje marcado como respondido', 'success');
      cargarContactos(); // Reload contacts
    } else {
      mostrarNotificacion('Error actualizando estado: ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Error actualizando contacto:', error);
    mostrarNotificacion('Error actualizando mensaje', 'error');
  }
}

// Delete Contact (we'll just mark as closed)
async function eliminarContacto(id) {
  if (!confirm('¿Estás seguro de que deseas cerrar este mensaje?')) {
    return;
  }

  try {
    const response = await api.actualizarEstadoContacto(id, 'cerrado');

    if (response.success) {
      mostrarNotificacion('Mensaje cerrado', 'success');
      cargarContactos(); // Reload contacts
    } else {
      mostrarNotificacion('Error cerrando mensaje: ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Error cerrando contacto:', error);
    mostrarNotificacion('Error cerrando mensaje', 'error');
  }
}

// Show Notification
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
  notificacion.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';

  const iconos = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-triangle',
    warning: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle'
  };

  notificacion.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.remove();
    }
  }, 4000);
}

// Refresh Dashboard Data
async function actualizarDashboard() {
  mostrarNotificacion('Actualizando dashboard...', 'info');
  await cargarDashboard();
  mostrarNotificacion('Dashboard actualizado', 'success');
}

// Auto-refresh dashboard every 5 minutes
setInterval(async () => {
  try {
    await cargarEstadisticas();
  } catch (error) {
    console.error('Error en actualización automática:', error);
  }
}, 300000); // 5 minutes
