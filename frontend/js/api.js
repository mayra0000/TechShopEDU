class TechShopAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.sessionId = this.getSessionId();
  }

  // Generar o obtener session ID
  getSessionId() {
    let sessionId = localStorage.getItem('techshop_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('techshop_session_id', sessionId);
    }
    return sessionId;
  }

  // Método genérico para hacer requests
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // PRODUCTOS
  async getProductos(filtros = {}) {
    const params = new URLSearchParams(filtros);
    const endpoint = `/productos${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getProducto(id) {
    return this.request(`/productos/${id}`);
  }

  async getProductosPorCategoria(categoria) {
    return this.request(`/productos/categoria/${categoria}`);
  }

  async buscarProductos(termino) {
    return this.request(`/productos/buscar/${termino}`);
  }

  async getCategorias() {
    return this.request('/productos/meta/categorias');
  }

  // CARRITO
  async getCarrito() {
    return this.request(`/carrito/${this.sessionId}`);
  }

  async agregarAlCarrito(productoId, cantidad = 1, variantes = {}) {
    return this.request('/carrito/agregar', {
      method: 'POST',
      body: {
        session_id: this.sessionId,
        producto_id: productoId,
        cantidad,
        variantes
      }
    });
  }

  async actualizarCantidadCarrito(itemId, cantidad) {
    return this.request('/carrito/actualizar', {
      method: 'PUT',
      body: {
        session_id: this.sessionId,
        item_id: itemId,
        cantidad
      }
    });
  }

  async eliminarDelCarrito(itemId) {
    return this.request(`/carrito/eliminar/${this.sessionId}/${itemId}`, {
      method: 'DELETE'
    });
  }

  async limpiarCarrito() {
    return this.request(`/carrito/limpiar/${this.sessionId}`, {
      method: 'DELETE'
    });
  }

  async crearNuevoCarrito() {
    const response = await this.request('/carrito/nuevo', {
      method: 'POST'
    });

    if (response.success) {
      this.sessionId = response.session_id;
      localStorage.setItem('techshop_session_id', this.sessionId);
    }

    return response;
  }

  // PEDIDOS
  async crearPedido(datosCliente, metodoEntrega) {
    return this.request('/pedidos/crear', {
      method: 'POST',
      body: {
        session_id: this.sessionId,
        datos_cliente: datosCliente,
        metodo_entrega: metodoEntrega
      }
    });
  }

  async getPedido(numeroPedido) {
    return this.request(`/pedidos/${numeroPedido}`);
  }

  async getPedidosPorEmail(email, limite = 10, pagina = 1) {
    return this.request(`/pedidos/email/${email}?limite=${limite}&pagina=${pagina}`);
  }

  async actualizarEstadoPedido(numeroPedido, estado) {
    return this.request(`/pedidos/${numeroPedido}/estado`, {
      method: 'PUT',
      body: { estado }
    });
  }

  async getPedidos(filtros = {}) {
    const params = new URLSearchParams(filtros);
    const endpoint = `/pedidos${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // CONTACTO
  async enviarMensajeContacto(datos) {
    return this.request('/contacto/enviar', {
      method: 'POST',
      body: datos
    });
  }

  async getMensajesContacto(filtros = {}) {
    const params = new URLSearchParams(filtros);
    const endpoint = `/contacto${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getMensajeContacto(id) {
    return this.request(`/contacto/${id}`);
  }

  async actualizarEstadoContacto(id, estado, notasInternas = '') {
    return this.request(`/contacto/${id}/estado`, {
      method: 'PUT',
      body: { estado, notas_internas: notasInternas }
    });
  }

  async getEstadisticasContacto() {
    return this.request('/contacto/stats/resumen');
  }

  // UTILIDADES
  calcularTotales(items) {
    let subtotal = 0;
    let cantidadItems = 0;

    items.forEach(item => {
      subtotal += item.precio_unitario * item.cantidad;
      cantidadItems += item.cantidad;
    });

    const impuestos = subtotal * 0.16; // 16% IVA
    const total = subtotal + impuestos;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      impuestos: parseFloat(impuestos.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      cantidadItems
    };
  }

  calcularTotalConEnvio(subtotal, impuestos, metodoEntrega) {
    let costoEnvio = 0;

    switch (metodoEntrega) {
      case 'expres':
        costoEnvio = 150;
        break;
      case 'estandar':
      case 'tienda':
        costoEnvio = 0;
        break;
    }

    const total = subtotal + impuestos + costoEnvio;

    return {
      costoEnvio,
      total: parseFloat(total.toFixed(2))
    };
  }

  async getEstadisticasVentas() {
    return this.request('/dashboard/estadisticas');
  }

  async getDatosGraficos() {
    return this.request('/dashboard/graficos');
  }

  async getVentasRecientes(limite = 10) {
    return this.request(`/dashboard/ventas-recientes?limite=${limite}`);
  }

  async getProductosStockBajo(limite = 10) {
    return this.request(`/dashboard/productos-stock-bajo?limite=${limite}`);
  }

  // Manejar errores de red
  isNetworkError(error) {
    return error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError');
  }

  // Mostrar mensaje de error user-friendly
  getErrorMessage(error) {
    if (this.isNetworkError(error)) {
      return 'Error de conexión. Verifica tu conexión a internet.';
    }

    return error.message || 'Ha ocurrido un error inesperado.';
  }
}

// Crear instancia global
const api = new TechShopAPI();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TechShopAPI;
}
