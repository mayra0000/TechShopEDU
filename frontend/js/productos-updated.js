// Global variables
let productos = [];
let categorias = [];

// Function to load products from API
async function cargarProductos(filtros = {}) {
    const container = document.getElementById('productos-container');
    if (!container) return;

    try {
        mostrarCargando(true);

        const response = await api.getProductos(filtros);

        if (response.success) {
            productos = response.productos;
            container.innerHTML = '';

            productos.forEach(producto => {
                const productCard = crearTarjetaProducto(producto);
                container.appendChild(productCard);
            });
        } else {
            mostrarError('Error cargando productos: ' + response.message);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error cargando productos: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Function to load categories
async function cargarCategorias() {
    try {
        const response = await api.getCategorias();

        if (response.success) {
            categorias = response.categorias;
            renderizarFiltrosCategorias();
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Function to create product card
function crearTarjetaProducto(producto) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 mb-4';

    col.innerHTML = `
        <div class="card product-card h-100">
            <div class="product-image">
                <img src="${producto.imagen}" alt="${producto.nombre}" class="product-img"
                     onerror="this.src='img/placeholder.jpg'">
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="product-title">${producto.nombre}</h5>
                <p class="product-description">${producto.descripcion}</p>
                
                <!-- Product variants -->
                <div class="variant-selector" id="variants-${producto.id}">
                    ${crearSelectoresVariantes(producto)}
                </div>
                
                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="product-price" id="price-${producto.id}">$${parseFloat(producto.precio).toFixed(2)}</span>
                        <small class="text-muted">${producto.categoria}</small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">Stock: ${producto.stock}</small>
                        ${producto.stock > 0 ?
            `<span class="badge bg-success">Disponible</span>` :
            `<span class="badge bg-danger">Agotado</span>`
        }
                    </div>
                    <button class="btn btn-success btn-add-to-cart w-100" 
                            onclick="agregarAlCarrito(${producto.id})"
                            ${producto.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus me-2"></i>
                        ${producto.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
                    </button>
                </div>
            </div>
        </div>
    `;

    return col;
}

// Function to create variant selectors
function crearSelectoresVariantes(producto) {
    if (!producto.variantes || producto.variantes.length === 0) {
        return '';
    }

    const variantesPorTipo = {};

    // Group variants by type
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
                              data-precio="${variante.precio_extra || 0}"
                              data-stock="${variante.stock || 0}"
                              onclick="seleccionarVariante(this, ${producto.id})"
                              ${(variante.stock || 0) <= 0 ? 'data-disabled="true"' : ''}>
                            ${variante.valor}
                            ${variante.precio_extra > 0 ? ` (+$${variante.precio_extra})` : ''}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    });

    return html;
}

// Function to select variant
function seleccionarVariante(elemento, productoId) {
    // Check if variant is disabled (out of stock)
    if (elemento.dataset.disabled === 'true') {
        mostrarNotificacion('Esta variante está agotada', 'warning');
        return;
    }

    const hermanos = elemento.parentNode.querySelectorAll('.variant-option');
    hermanos.forEach(h => h.classList.remove('active'));

    elemento.classList.add('active');
    actualizarPrecioProducto(productoId);
}

// Function to update product price based on selected variants
function actualizarPrecioProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    let precioTotal = parseFloat(producto.precio);

    // Add prices from selected variants
    const variantesContainer = document.getElementById(`variants-${productoId}`);
    if (variantesContainer) {
        const variantesActivas = variantesContainer.querySelectorAll('.variant-option.active');

        variantesActivas.forEach(variante => {
            precioTotal += parseFloat(variante.dataset.precio) || 0;
        });
    }

    // Update price in interface
    const precioElemento = document.getElementById(`price-${productoId}`);
    if (precioElemento) {
        precioElemento.textContent = `$${precioTotal.toFixed(2)}`;
    }
}

// Function to get selected variants for a product
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

// Function to add product to cart
async function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    // Check stock
    if (producto.stock <= 0) {
        mostrarNotificacion('Producto sin stock', 'error');
        return;
    }

    const variantesSeleccionadas = obtenerVariantesSeleccionadas(productoId);

    try {
        mostrarCargando(true);

        const response = await api.agregarAlCarrito(productoId, 1, variantesSeleccionadas);

        if (response.success) {
            mostrarNotificacion('Producto agregado al carrito', 'success');
            await actualizarContadorCarrito();
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

// Search functionality
async function buscarProductos(termino) {
    if (!termino || termino.length < 2) {
        await cargarProductos();
        return;
    }

    try {
        mostrarCargando(true);
        const response = await api.buscarProductos(termino);

        if (response.success) {
            productos = response.productos;
            const container = document.getElementById('productos-container');
            container.innerHTML = '';

            if (productos.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <h4>No se encontraron productos</h4>
                        <p class="text-muted">Intenta con otros términos de búsqueda</p>
                    </div>
                `;
            } else {
                productos.forEach(producto => {
                    const productCard = crearTarjetaProducto(producto);
                    container.appendChild(productCard);
                });
            }
        }
    } catch (error) {
        console.error('Error buscando productos:', error);
        mostrarError('Error en la búsqueda: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Filter by category
async function filtrarPorCategoria(categoria) {
    try {
        mostrarCargando(true);

        if (!categoria || categoria === 'todas') {
            await cargarProductos();
        } else {
            const response = await api.getProductosPorCategoria(categoria);

            if (response.success) {
                productos = response.productos;
                const container = document.getElementById('productos-container');
                container.innerHTML = '';

                productos.forEach(producto => {
                    const productCard = crearTarjetaProducto(producto);
                    container.appendChild(productCard);
                });
            }
        }
    } catch (error) {
        console.error('Error filtrando por categoría:', error);
        mostrarError('Error filtrando productos: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Render category filters (if you have a filter UI)
function renderizarFiltrosCategorias() {
    const filtrosContainer = document.getElementById('filtros-categorias');
    if (!filtrosContainer) return;

    let html = `
        <button class="btn btn-outline-primary me-2 mb-2" onclick="filtrarPorCategoria('todas')">
            Todas las categorías
        </button>
    `;

    categorias.forEach(categoria => {
        html += `
            <button class="btn btn-outline-primary me-2 mb-2" 
                    onclick="filtrarPorCategoria('${categoria.nombre}')">
                ${categoria.nombre} (${categoria.total_productos})
            </button>
        `;
    });

    filtrosContainer.innerHTML = html;
}

// Utility functions
function mostrarCargando(mostrar) {
    const existente = document.getElementById('loading-productos');

    if (mostrar && !existente) {
        const loading = document.createElement('div');
        loading.id = 'loading-productos';
        loading.className = 'text-center py-4';
        loading.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando productos...</span>
            </div>
        `;

        const container = document.getElementById('productos-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(loading);
        }
    } else if (!mostrar && existente) {
        existente.remove();
    }
}

function mostrarError(mensaje) {
    const container = document.getElementById('productos-container');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>${mensaje}
                </div>
            </div>
        `;
    }
}

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await cargarCategorias();
        await cargarProductos();

        // Setup search functionality if search input exists
        const searchInput = document.getElementById('buscar-productos');
        if (searchInput) {
            let timeoutId;
            searchInput.addEventListener('input', function() {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    buscarProductos(this.value.trim());
                }, 500);
            });
        }
    } catch (error) {
        console.error('Error inicializando productos:', error);
        mostrarError('Error cargando la página');
    }
});

// ... código anterior sin cambios hasta la función cargarProductos ...

// Function to load products from API
async function cargarProductos(filtros = {}) {
    const container = document.getElementById('productos-container');
    if (!container) return;

    try {
        mostrarCargando(true);

        // Si hay filtros aplicados, usar la función de filtrado
        if (Object.keys(filtros).length > 0) {
            await aplicarFiltrosIndividuales(filtros);
        } else {
            // Cargar todos los productos sin filtros
            const response = await api.getProductos();

            if (response.success) {
                productos = response.productos;
                container.innerHTML = '';

                if (productos.length === 0) {
                    document.getElementById('noResults').style.display = 'block';
                } else {
                    document.getElementById('noResults').style.display = 'none';
                    productos.forEach(producto => {
                        const productCard = crearTarjetaProducto(producto);
                        container.appendChild(productCard);
                    });
                }
                actualizarContadorResultados(productos.length);
            } else {
                mostrarError('Error cargando productos: ' + response.message);
            }
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error cargando productos: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Función para aplicar filtros individuales y combinar resultados
async function aplicarFiltrosIndividuales(filtros) {
    try {
        let productosFiltrados = [];

        // Obtener todos los productos primero para aplicar filtros locales
        const responseTodos = await api.getProductos();
        if (!responseTodos.success) {
            mostrarError('Error obteniendo productos: ' + responseTodos.message);
            return;
        }

        productosFiltrados = responseTodos.productos;

        // Aplicar filtro de búsqueda si existe
        if (filtros.busqueda && filtros.busqueda.length >= 2) {
            const responseBusqueda = await api.buscarProductos(filtros.busqueda);
            if (responseBusqueda.success) {
                // Intersectar con productos ya filtrados
                const idsBusqueda = responseBusqueda.productos.map(p => p.id);
                productosFiltrados = productosFiltrados.filter(p =>
                    idsBusqueda.includes(p.id)
                );
            }
        }

        // Aplicar filtro de categoría si existe
        if (filtros.categoria && filtros.categoria !== 'todas') {
            const responseCategoria = await api.getProductosPorCategoria(filtros.categoria);
            if (responseCategoria.success) {
                // Intersectar con productos ya filtrados
                const idsCategoria = responseCategoria.productos.map(p => p.id);
                productosFiltrados = productosFiltrados.filter(p =>
                    idsCategoria.includes(p.id)
                );
            }
        }

        // Aplicar filtro de precio máximo si existe (filtro local)
        if (filtros.precioMax && filtros.precioMax > 0) {
            productosFiltrados = productosFiltrados.filter(p =>
                parseFloat(p.precio) <= parseFloat(filtros.precioMax)
            );
        }

        // Aplicar ordenamiento si existe (ordenamiento local)
        if (filtros.orden && filtros.orden !== 'default') {
            productosFiltrados = ordenarProductosLocal(productosFiltrados, filtros.orden);
        }

        // Mostrar resultados
        productos = productosFiltrados;
        const container = document.getElementById('productos-container');
        container.innerHTML = '';

        if (productos.length === 0) {
            document.getElementById('noResults').style.display = 'block';
        } else {
            document.getElementById('noResults').style.display = 'none';
            productos.forEach(producto => {
                const productCard = crearTarjetaProducto(producto);
                container.appendChild(productCard);
            });
        }
        actualizarContadorResultados(productos.length);

    } catch (error) {
        console.error('Error aplicando filtros:', error);
        mostrarError('Error aplicando filtros: ' + api.getErrorMessage(error));
    }
}

// Función para ordenar productos localmente
function ordenarProductosLocal(productos, criterio) {
    const productosCopia = [...productos];

    switch (criterio) {
        case 'price-asc':
            return productosCopia.sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));
        case 'price-desc':
            return productosCopia.sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio));
        case 'name-asc':
            return productosCopia.sort((a, b) => a.nombre.localeCompare(b.nombre));
        case 'name-desc':
            return productosCopia.sort((a, b) => b.nombre.localeCompare(a.nombre));
        default:
            return productosCopia;
    }
}

// Search functionality
async function buscarProductos(termino) {
    if (!termino || termino.length < 2) {
        await aplicarFiltros();
        return;
    }

    try {
        mostrarCargando(true);
        const response = await api.buscarProductos(termino);

        if (response.success) {
            productos = response.productos;
            const container = document.getElementById('productos-container');
            container.innerHTML = '';

            if (productos.length === 0) {
                document.getElementById('noResults').style.display = 'block';
            } else {
                document.getElementById('noResults').style.display = 'none';
                productos.forEach(producto => {
                    const productCard = crearTarjetaProducto(producto);
                    container.appendChild(productCard);
                });
            }
            actualizarContadorResultados(productos.length);
        }
    } catch (error) {
        console.error('Error buscando productos:', error);
        mostrarError('Error en la búsqueda: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Function to load categories
async function cargarCategorias() {
    try {
        const response = await api.getCategorias();

        if (response.success) {
            categorias = response.categorias;
            renderizarFiltrosCategorias();
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Function to render category filters
function renderizarFiltrosCategorias() {
    const filtrosContainer = document.getElementById('filtros-categorias');
    const categoryFilter = document.getElementById('categoryFilter');

    if (filtrosContainer) {
        let html = `
            <button class="btn btn-outline-primary me-2 mb-2" onclick="filtrarPorCategoria('todas')">
                Todas las categorías
            </button>
        `;

        categorias.forEach(categoria => {
            html += `
                <button class="btn btn-outline-primary me-2 mb-2" 
                        onclick="filtrarPorCategoria('${categoria.nombre}')">
                    ${categoria.nombre} (${categoria.total_productos || 0})
                </button>
            `;
        });

        filtrosContainer.innerHTML = html;
    }

    if (categoryFilter) {
        let html = `<option value="todas">Todas las categorías</option>`;

        categorias.forEach(categoria => {
            html += `<option value="${categoria.nombre}">${categoria.nombre}</option>`;
        });

        categoryFilter.innerHTML = html;
    }
}

// Filter by category
async function filtrarPorCategoria(categoria) {
    try {
        mostrarCargando(true);

        if (!categoria || categoria === 'todas') {
            await aplicarFiltros();
        } else {
            const response = await api.getProductosPorCategoria(categoria);

            if (response.success) {
                productos = response.productos;
                const container = document.getElementById('productos-container');
                container.innerHTML = '';

                if (productos.length === 0) {
                    document.getElementById('noResults').style.display = 'block';
                } else {
                    document.getElementById('noResults').style.display = 'none';
                    productos.forEach(producto => {
                        const productCard = crearTarjetaProducto(producto);
                        container.appendChild(productCard);
                    });
                }
                actualizarContadorResultados(productos.length);
            }
        }
    } catch (error) {
        console.error('Error filtrando por categoría:', error);
        mostrarError('Error filtrando productos: ' + api.getErrorMessage(error));
    } finally {
        mostrarCargando(false);
    }
}

// Apply multiple filters
async function aplicarFiltros() {
    const categoria = document.getElementById('categoryFilter').value;
    const precioMax = document.getElementById('priceRange').value;
    const orden = document.getElementById('sortBy').value;
    const busqueda = document.getElementById('buscar-productos').value.trim();

    // Construir objeto de filtros
    const filtros = {};

    if (categoria && categoria !== 'todas') {
        filtros.categoria = categoria;
    }

    if (precioMax && precioMax > 0) {
        filtros.precioMax = precioMax;
    }

    if (orden && orden !== 'default') {
        filtros.orden = orden;
    }

    if (busqueda && busqueda.length >= 2) {
        filtros.busqueda = busqueda;
    }

    // Aplicar filtros
    await cargarProductos(filtros);
}

// Update results counter
function actualizarContadorResultados(cantidad) {
    const contador = document.getElementById('productsCount');
    if (contador) {
        contador.textContent = cantidad;
    }
}

// Reset filters
async function resetearFiltros() {
    document.getElementById('categoryFilter').value = 'todas';
    document.getElementById('priceRange').value = document.getElementById('priceRange').max;
    document.getElementById('sortBy').value = 'default';
    document.getElementById('buscar-productos').value = '';

    // Actualizar display de precios
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    const priceRange = document.getElementById('priceRange');

    if (minPrice && maxPrice && priceRange) {
        minPrice.textContent = '$0';
        maxPrice.textContent = `$${parseInt(priceRange.max).toLocaleString()}`;
    }

    await cargarProductos();
    document.getElementById('noResults').style.display = 'none';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await cargarCategorias();
        await cargarProductos();

        // Setup search functionality if search input exists
        const searchInput = document.getElementById('buscar-productos');
        if (searchInput) {
            let timeoutId;
            searchInput.addEventListener('input', function() {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    buscarProductos(this.value.trim());
                }, 500);
            });
        }

        // Setup price range slider
        const priceRange = document.getElementById('priceRange');
        const minPrice = document.getElementById('minPrice');
        const maxPrice = document.getElementById('maxPrice');

        if (priceRange && minPrice && maxPrice) {
            // Set initial values
            minPrice.textContent = '$0';
            maxPrice.textContent = `$${parseInt(priceRange.max).toLocaleString()}`;

            priceRange.addEventListener('input', function() {
                maxPrice.textContent = `$${parseInt(this.value).toLocaleString()}`;
            });

            priceRange.addEventListener('change', function() {
                aplicarFiltros();
            });
        }

        // Setup apply filters button
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', aplicarFiltros);
        }

        // Setup reset filters button
        const resetFiltersBtn = document.getElementById('resetFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetearFiltros);
        }

        // Setup category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                aplicarFiltros();
            });
        }

        // Setup sort filter
        const sortFilter = document.getElementById('sortBy');
        if (sortFilter) {
            sortFilter.addEventListener('change', function() {
                aplicarFiltros();
            });
        }

    } catch (error) {
        console.error('Error inicializando productos:', error);
        mostrarError('Error cargando la página');
    }
});

// ... el resto del código permanece igual ...
