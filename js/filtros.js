// Lógica para el sistema de filtros
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar el rango de precios
  inicializarRangoPrecios();

  // Toggle de filtros en móviles
  document.getElementById('toggleFilters').addEventListener('click', function() {
    const filtersContainer = document.getElementById('filtersContainer');
    filtersContainer.classList.toggle('show');
  });

  // Aplicar filtros
  document.getElementById('applyFilters').addEventListener('click', aplicarFiltros);
  document.getElementById('resetFilters').addEventListener('click', resetearFiltros);

  // Aplicar filtros al cambiar algunos valores
  document.getElementById('sortBy').addEventListener('change', aplicarFiltros);
  document.getElementById('categoryFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('priceRange').addEventListener('input', function() {
    document.getElementById('minPrice').textContent = `$${parseInt(this.value).toLocaleString()}`;
  });
  document.getElementById('searchInput').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') aplicarFiltros();
  });

  // Inicializar con todos los productos visibles
  aplicarFiltros();
});

function inicializarRangoPrecios() {
  const priceRange = document.getElementById('priceRange');
  const maxPrice = document.getElementById('maxPrice');

  // Establecer valor máximo según los productos
  const maxProductPrice = Math.max(...productos.map(p => p.precio));
  priceRange.max = maxProductPrice;
  priceRange.value = maxProductPrice;
  maxPrice.textContent = `$${maxProductPrice.toLocaleString()}`;
}

function aplicarFiltros() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const priceLimit = parseInt(document.getElementById('priceRange').value);
  const sortBy = document.getElementById('sortBy').value;

  let productosFiltrados = [...productos];

  // Filtrar por término de búsqueda
  if (searchTerm) {
    productosFiltrados = productosFiltrados.filter(producto =>
      producto.nombre.toLowerCase().includes(searchTerm) ||
      producto.descripcion.toLowerCase().includes(searchTerm) ||
      producto.categoria.toLowerCase().includes(searchTerm)
    );
  }

  // Filtrar por categoría
  if (category) {
    productosFiltrados = productosFiltrados.filter(producto =>
      producto.categoria === category
    );
  }

  // Filtrar por precio
  productosFiltrados = productosFiltrados.filter(producto =>
    producto.precio <= priceLimit
  );

  // Ordenar productos
  switch (sortBy) {
    case 'price-asc':
      productosFiltrados.sort((a, b) => a.precio - b.precio);
      break;
    case 'price-desc':
      productosFiltrados.sort((a, b) => b.precio - a.precio);
      break;
    case 'name-asc':
      productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
      break;
    case 'name-desc':
      productosFiltrados.sort((a, b) => b.nombre.localeCompare(a.nombre));
      break;
  }

  // Mostrar u ocultar mensaje de no resultados
  const noResults = document.getElementById('noResults');
  if (productosFiltrados.length === 0) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
  }

  // Renderizar productos filtrados
  renderizarProductosFiltrados(productosFiltrados);
  actualizarContadorProductos(productosFiltrados.length);
}

function renderizarProductosFiltrados(productosArray) {
  const container = document.getElementById('productos-container');
  container.innerHTML = '';

  if (productosArray.length === 0) {
    return;
  }

  productosArray.forEach(producto => {
    const productCard = crearTarjetaProducto(producto);
    container.appendChild(productCard);
  });
}

function resetearFiltros() {
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('sortBy').value = 'default';

  // Restablecer rango de precios
  const maxProductPrice = Math.max(...productos.map(p => p.precio));
  document.getElementById('priceRange').value = maxProductPrice;
  document.getElementById('minPrice').textContent = '$0';
  document.getElementById('maxPrice').textContent = `$${maxProductPrice.toLocaleString()}`;

  document.getElementById('noResults').style.display = 'none';
  renderizarProductosFiltrados(productos);
  actualizarContadorProductos(productos.length);
}

function actualizarContadorProductos(cantidad) {
  document.getElementById('productsCount').textContent = cantidad;
}

// Función para crear una tarjeta de producto (similar a la de productos.js)
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
                            <small class="text-muted text-capitalize">${producto.categoria}</small>
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

// Función para crear selectores de variantes (similar a la de productos.js)
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

