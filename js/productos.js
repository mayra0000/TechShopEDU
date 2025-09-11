// Catálogo de productos
const productos = [
    {
        id: 1,
        nombre: "Tablet Educativa Pro",
        descripcion: "Tablet de 10 pulgadas diseñada para estudiantes",
        precio: 5999.00,
        imagen: "img/producto1.jpg",
        categoria: "electrónicos",
        variantes: [
            { tipo: "capacidad", valor: "64GB", precioExtra: 0 },
            { tipo: "capacidad", valor: "128GB", precioExtra: 500 },
            { tipo: "color", valor: "Azul", precioExtra: 0 },
            { tipo: "color", valor: "Gris", precioExtra: 0 },
            { tipo: "color", valor: "Negro", precioExtra: 0 }
        ]
    },
    {
        id: 2,
        nombre: "Kit de Robótica",
        descripcion: "Kit completo para aprender programación y robótica",
        precio: 2499.00,
        imagen: "img/producto2.jpg",
        categoria: "robótica",
        variantes: [
            { tipo: "nivel", valor: "Básico", precioExtra: 0 },
            { tipo: "nivel", valor: "Intermedio", precioExtra: 800 },
            { tipo: "nivel", valor: "Avanzado", precioExtra: 1500 }
        ]
    },
    {
        id: 3,
        nombre: "Impresora 3D",
        descripcion: "Impresora 3D segura y fácil de usar para centros educativos",
        precio: 12999.00,
        imagen: "img/producto3.jpeg",
        categoria: "impresión",
        variantes: [
            { tipo: "tamaño", valor: "Mini", precioExtra: 0 },
            { tipo: "tamaño", valor: "Estándar", precioExtra: 3000 },
            { tipo: "color", valor: "Blanco", precioExtra: 0 },
            { tipo: "color", valor: "Negro", precioExtra: 0 }
        ]
    },
    {
        id: 4,
        nombre: "Monitor",
        descripcion: "Pantalla de 21,45'' con frecuencia de actualización de 100 Hz",
        precio: 3099.00,
        imagen: "img/producto4.jpg",
        categoria: "ciencias",
        variantes: [
            { tipo: "resolucion", valor: "HD", precioExtra: 0 },
            { tipo: "resolucion", valor: "FULL HD", precioExtra: 600 },
            { tipo: "resolucion", valor: "4K", precioExtra: 1200 }
        ]
    },
    {
        id: 5,
        nombre: "Teclado",
        descripcion: "Teclado mecánico con teclas programables RGB",
        precio: 1899.00,
        imagen: "img/producto5.jpg",
        categoria: "accesorios",
        variantes: [
            { tipo: "idioma", valor: "Español", precioExtra: 0 },
            { tipo: "idioma", valor: "Inglés", precioExtra: 0 },
            { tipo: "switch", valor: "Azul", precioExtra: 0 },
            { tipo: "switch", valor: "Rojo", precioExtra: 200 }
        ]
    },
    {
        id: 6,
        nombre: "Dron",
        descripcion: "Dron programable para aprender principios de vuelo",
        precio: 4599.00,
        imagen: "img/producto6.jpg",
        categoria: "robotica",
        variantes: [
            { tipo: "cámara", valor: "Sin cámara", precioExtra: 0 },
            { tipo: "cámara", valor: "HD", precioExtra: 800 },
            { tipo: "cámara", valor: "4K", precioExtra: 1500 }
        ]
    },
    {
        id: 7,
        nombre: "Cámara de Seguridad",
        descripcion: "Cámara marca Steren, modelo CCTV-233 con ranura para memoria",
        precio: 999.00,
        imagen: "img/producto7.jpg",
        categoria: "smarthome",
        variantes: [
            { tipo: "cantidad", valor: "1 pack", precioExtra: 0 },
            { tipo: "cantidad", valor: "2 pack", precioExtra: 700 },
        ]
    },
    {
        id: 8,
        nombre: "SAMSUNG Celular Galaxy a35",
        descripcion: "Smartphone marca Samsung Galaxy a35 5G.",
        precio: 6299.00,
        imagen: "img/producto8.jpg",
        categoria: "display",
        variantes: [
            { tipo: "capacidad", valor: "128GB", precioExtra: 0 },
            { tipo: "capacidad", valor: "256GB", precioExtra: 5000 },
            { tipo: "color", valor: "Negro", precioExtra: 0 },
            { tipo: "color", valor: "Rosa", precioExtra: 0 }
        ]
    },
    {
        id: 9,
        nombre: "Calculadora Gráfica",
        descripcion: "Calculadora científica con pantalla a color",
        precio: 899.00,
        imagen: "img/producto9.png",
        categoria: "matematicas",
        variantes: [
            { tipo: "memoria", valor: "8MB", precioExtra: 0 },
            { tipo: "memoria", valor: "16MB", precioExtra: 200 }
        ]
    },
    {
        id: 10,
        nombre: "Auriculares con Micrófono",
        descripcion: "Auriculares cómodos para clases virtuales",
        precio: 599.00,
        imagen: "img/producto10.jpg",
        categoria: "accesorios",
        variantes: [
            { tipo: "conexión", valor: "USB", precioExtra: 0 },
            { tipo: "conexión", valor: "Bluetooth", precioExtra: 300 },
            { tipo: "color", valor: "Negro", precioExtra: 0 },
            { tipo: "color", valor: "Azul", precioExtra: 0 }
        ]
    },
    {
        id: 11,
        nombre: "Proyector Portátil",
        descripcion: "Proyector LED compacto para presentaciones",
        precio: 7999.00,
        imagen: "img/producto11.jpg",
        categoria: "display",
        variantes: [
            { tipo: "resolución", valor: "HD", precioExtra: 0 },
            { tipo: "resolución", valor: "Full HD", precioExtra: 2000 },
            { tipo: "conectividad", valor: "HDMI", precioExtra: 0 },
            { tipo: "conectividad", valor: "WiFi", precioExtra: 800 }
        ]
    },
    {
        id: 12,
        nombre: "Kit para Soldar",
        descripcion: "Kit de soldadura seguro para estudiantes",
        precio: 1299.00,
        imagen: "img/producto12.png",
        categoria: "herramientas",
        variantes: [
            { tipo: "accesorios", valor: "Básico", precioExtra: 0 },
            { tipo: "accesorios", valor: "Completo", precioExtra: 400 }
        ]
    }
];

// Función para cargar productos en la página
function cargarProductos() {
    const container = document.getElementById('productos-container');
    if (!container) return;

    container.innerHTML = '';

    productos.forEach(producto => {
        const productCard = crearTarjetaProducto(producto);
        container.appendChild(productCard);
    });
}

// Función para crear una tarjeta de producto
function crearTarjetaProducto(producto) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 mb-4';

    col.innerHTML = `
        <div class="card product-card h-100">
            <div class="product-image">
                <img src="${producto.imagen}" alt="${producto.nombre}" class="product-img">
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="product-title">${producto.nombre}</h5>
                <p class="product-description">${producto.descripcion}</p>
                
                <!-- Variantes del producto -->
                <div class="variant-selector" id="variants-${producto.id}">
                    ${crearSelectoresVariantes(producto)}
                </div>
                
                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="product-price" id="price-${producto.id}">$${producto.precio.toFixed(2)}</span>
                        <small class="text-muted">${producto.categoria}</small>
                    </div>
                    <button class="btn btn-success btn-add-to-cart w-100" 
                            onclick="agregarAlCarrito(${producto.id})">
                        <i class="fas fa-cart-plus me-2"></i>Agregar al Carrito
                    </button>
                </div>
            </div>
        </div>
    `;

    return col;
}

// Función para crear selectores de variantes
function crearSelectoresVariantes(producto) {
    const variantesPorTipo = {};
    
    // Agrupar variantes por tipo
    producto.variantes.forEach(variante => {
        if (!variantesPorTipo[variante.tipo]) {
            variantesPorTipo[variante.tipo] = [];
        }
        variantesPorTipo[variante.tipo].push(variante);
    });

    let html = '';
    Object.keys(variantesPorTipo).forEach(tipo => {
        html += `
            <div class="mb-2">
                <small class="text-muted text-capitalize">${tipo}:</small><br>
                <div class="variant-options" data-tipo="${tipo}" data-producto="${producto.id}">
                    ${variantesPorTipo[tipo].map((variante, index) => `
                        <span class="variant-option ${index === 0 ? 'active' : ''}" 
                              data-valor="${variante.valor}" 
                              data-precio="${variante.precioExtra}"
                              onclick="seleccionarVariante(this, ${producto.id})">
                            ${variante.valor}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    });

    return html;
}

// Función para seleccionar variante
function seleccionarVariante(elemento, productoId) {
    // Remover clase active de hermanos
    const hermanos = elemento.parentNode.querySelectorAll('.variant-option');
    hermanos.forEach(h => h.classList.remove('active'));
    
    // Agregar clase active al elemento seleccionado
    elemento.classList.add('active');
    
    // Actualizar precio
    actualizarPrecioProducto(productoId);
}

// Función para actualizar precio del producto
function actualizarPrecioProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    let precioTotal = producto.precio;
    
    // Sumar precios de variantes seleccionadas
    const variantesContainer = document.getElementById(`variants-${productoId}`);
    const variantesActivas = variantesContainer.querySelectorAll('.variant-option.active');
    
    variantesActivas.forEach(variante => {
        precioTotal += parseFloat(variante.dataset.precio) || 0;
    });

    // Actualizar precio en la interfaz
    const precioElemento = document.getElementById(`price-${productoId}`);
    if (precioElemento) {
        precioElemento.textContent = `$${precioTotal.toFixed(2)}`;
    }
}

// Función para obtener variantes seleccionadas de un producto
function obtenerVariantesSeleccionadas(productoId) {
    const variantes = {};
    const variantesContainer = document.getElementById(`variants-${productoId}`);
    
    if (variantesContainer) {
        const grupos = variantesContainer.querySelectorAll('.variant-options');
        grupos.forEach(grupo => {
            const tipo = grupo.dataset.tipo;
            const seleccionada = grupo.querySelector('.variant-option.active');
            if (seleccionada) {
                variantes[tipo] = {
                    valor: seleccionada.dataset.valor,
                    precioExtra: parseFloat(seleccionada.dataset.precio) || 0
                };
            }
        });
    }
    
    return variantes;
}

// Función para agregar producto al carrito
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    const variantesSeleccionadas = obtenerVariantesSeleccionadas(productoId);
    let precioFinal = producto.precio;
    
    // Calcular precio con variantes
    Object.values(variantesSeleccionadas).forEach(variante => {
        precioFinal += variante.precioExtra;
    });

    // Crear descripción de variantes
    const descripcionVariantes = Object.entries(variantesSeleccionadas)
        .map(([tipo, variante]) => `${tipo}: ${variante.valor}`)
        .join(', ');

    const item = {
        id: productoId,
        nombre: producto.nombre,
        precio: precioFinal,
        imagen: producto.imagen,
        icono: producto.icono,
        variantes: variantesSeleccionadas,
        descripcionVariantes: descripcionVariantes,
        cantidad: 1
    };

    // Agregar al carrito usando la función del carrito.js
    if (typeof agregarItemAlCarrito === 'function') {
        agregarItemAlCarrito(item);
        
        // Mostrar feedback visual
        mostrarNotificacion('Producto agregado al carrito', 'success');
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    notificacion.style.cssText = 'top: 100px; right: 20px; z-index: 1050; min-width: 300px;';
    
    notificacion.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notificacion);

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 3000);
}

// Cargar productos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
});