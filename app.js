/* ============================================
   OmbuLedger - MVP Application Logic
   ============================================ */

// Product data with corrected prices (local producers, not industrial)
const productos = {
    cafe: {
        nombre: 'Café',
        base: 2500,
        var: 0.03,
        unidad: 'kg',
        stock: 12
    },
    soja: {
        nombre: 'Soja',
        base: 28,
        var: 0.02,
        unidad: 'kg',
        stock: 50
    },
    maiz: {
        nombre: 'Maíz',
        base: 19,
        var: 0.025,
        unidad: 'kg',
        stock: 30
    },
    huevos: {
        nombre: 'Huevos',
        base: 350,
        var: 0.01,
        unidad: 'maple',
        stock: 50
    },
    leche: {
        nombre: 'Leche',
        base: 180,
        var: 0.015,
        unidad: 'litro',
        stock: 200
    },
    dulce: {
        nombre: 'Dulce de Leche',
        base: 2200,
        var: 0.02,
        unidad: 'kg',
        stock: 25
    }
};

// Current prices (start at base)
let preciosActuales = {};
for (let key in productos) {
    preciosActuales[key] = productos[key].base;
}

// Current purchase state
let compraActual = null;

// Wallet state
let walletConnected = false;
let walletAddress = null;

/* ============================================
   TICKER - Initialize & Update
   ============================================ */
function initTicker() {
    const ticker = document.getElementById('ticker');
    if (!ticker) return;

    let html = '';

    // Duplicate for infinite loop effect
    for (let i = 0; i < 2; i++) {
        for (let key in productos) {
            const p = productos[key];
            const v = (Math.random() * 4 - 2).toFixed(1);
            const cls = v >= 0 ? 'var-up' : 'var-down';
            const arrow = v >= 0 ? '↑' : '↓';
            html += `
                <div class="ticker-item">
                    <span class="ticker-name">${p.nombre}</span>
                    <span class="ticker-price" data-ticker-price="${key}">$${p.base.toLocaleString('es-AR')}/${p.unidad}</span>
                    <span class="ticker-var ${cls}" data-ticker-var="${key}">${arrow} ${Math.abs(v)}%</span>
                </div>
            `;
        }
    }
    ticker.innerHTML = html;
}

// Update prices every 5 seconds
function startPriceUpdates() {
    setInterval(() => {
        for (let key in productos) {
            // Random fluctuation ±3%
            const cambio = (Math.random() - 0.5) * productos[key].var * 2;
            const nuevo = productos[key].base * (1 + cambio);
            preciosActuales[key] = nuevo;

            const porc = (cambio * 100).toFixed(1);
            const positivo = cambio >= 0;

            // Update ticker (all instances with data attribute)
            document.querySelectorAll(`[data-ticker-price="${key}"]`).forEach(el => {
                el.textContent = `$${nuevo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/${productos[key].unidad}`;
            });

            document.querySelectorAll(`[data-ticker-var="${key}"]`).forEach(el => {
                el.className = `ticker-var ${positivo ? 'var-up' : 'var-down'}`;
                el.textContent = `${positivo ? '↑' : '↓'} ${Math.abs(porc)}%`;
            });

            // Update product card price
            const cardPrice = document.getElementById(`precio-${key}`);
            if (cardPrice) {
                cardPrice.textContent = `$${nuevo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/${productos[key].unidad}`;
            }
        }
    }, 5000);
}

/* ============================================
   LOAN CALCULATOR
   ============================================ */
function sugerirValor() {
    const tipo = document.getElementById('colateral').value;
    const valores = {
        tractor: 8000,
        tierra: 25000,
        cosecha: 5000,
        ganado: 15000
    };
    if (valores[tipo]) {
        document.getElementById('valor').value = valores[tipo];
    }
}

function calcular() {
    const monto = parseFloat(document.getElementById('monto').value);
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('colateral').value;
    const plazo = parseInt(document.getElementById('plazo').value);
    const res = document.getElementById('resultado');

    if (!monto || !valor || !tipo) {
        mostrarToast('Completá todos los campos');
        return;
    }

    // LTV: Maximum 60%
    const max = valor * 0.60;
    // 35% annual rate to monthly
    const tasa = 0.35 / 12;

    if (monto <= max) {
        // French amortization system
        const cuota = (monto * tasa * Math.pow(1 + tasa, plazo)) / (Math.pow(1 + tasa, plazo) - 1);
        const totalInt = (cuota * plazo) - monto;

        const tipoLabel = {
            tractor: 'tractor',
            tierra: 'tierra',
            cosecha: 'cosecha',
            ganado: 'ganado'
        }[tipo];

        res.className = 'result-box result-success';
        res.innerHTML = `
            <div class="result-header">✅ Pre-aprobado</div>
            <div class="result-body">
                Podemos financiarte <span class="result-highlight">$${monto.toLocaleString('es-AR')}</span> con tu ${tipoLabel} como garantía.
                <div class="detail-box">
                    <strong>Detalle del préstamo:</strong><br>
                    Cuota mensual: $${cuota.toFixed(0).toLocaleString('es-AR')}<br>
                    Plazo: ${plazo} meses<br>
                    Intereses totales: $${totalInt.toFixed(0).toLocaleString('es-AR')}<br>
                    <span style="color: #6b7280; font-size: 13px;">Tasa: 35% anual (sistema francés)</span>
                </div>
                <button class="btn btn-primary" style="margin-top: 16px;" onclick="solicitarValidacion('${tipoLabel}')">
                    Solicitar validación
                </button>
            </div>
        `;
    } else {
        res.className = 'result-box result-error';
        res.innerHTML = `
            <div class="result-header">❌ Necesitás más garantía</div>
            <div class="result-body">
                Con tu ${tipo} de $${valor.toLocaleString('es-AR')}, el máximo es $${max.toFixed(0).toLocaleString('es-AR')}.<br><br>
                Para $${monto.toLocaleString('es-AR')} necesitás garantía de ~$${(monto / 0.6).toFixed(0).toLocaleString('es-AR')}.
            </div>
        `;
    }
    res.style.display = 'block';
}

function solicitarValidacion(tipo) {
    mostrarToast(`Solicitud enviada. Te contactaremos en 24hs para validar el ${tipo}.`);
}

/* ============================================
   PURCHASE CYCLE
   ============================================ */
function iniciarCompra(productKey) {
    const producto = productos[productKey];

    if (producto.stock <= 0) {
        mostrarToast('Sin stock disponible');
        return;
    }

    compraActual = {
        key: productKey,
        nombre: producto.nombre,
        precio: preciosActuales[productKey]
    };

    // Show modal
    const modal = document.getElementById('modalCiclo');
    modal.classList.add('active');

    // Reset steps
    document.querySelectorAll('.cycle-step').forEach(s => {
        s.classList.remove('active', 'completed');
    });
    document.getElementById('step1').classList.add('active');
    document.getElementById('btnCloseModal').classList.remove('show');
    document.querySelector('.modal-title').textContent = 'Procesando compra';
    document.querySelector('.modal-subtitle').textContent = 'Conectando con el productor...';

    // Simulate steps (4 seconds total)
    setTimeout(() => {
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step1').classList.add('completed');
        document.getElementById('step2').classList.add('active');
    }, 1500);

    setTimeout(() => {
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step2').classList.add('completed');
        document.getElementById('step3').classList.add('active');
    }, 3000);

    setTimeout(() => {
        document.getElementById('step3').classList.remove('active');
        document.getElementById('step3').classList.add('completed');
        document.querySelector('.modal-subtitle').textContent = '¡Compra exitosa!';
        document.querySelector('.modal-title').textContent = 'Transacción completada';
        document.getElementById('btnCloseModal').classList.add('show');

        // Update stock
        actualizarStock();
    }, 4500);
}

function actualizarStock() {
    if (!compraActual) return;

    const key = compraActual.key;
    const producto = productos[key];

    // Reduce stock based on product type
    const restar = key === 'leche' ? 10 : key === 'huevos' ? 5 : 1;
    producto.stock = Math.max(0, producto.stock - restar);

    // Update UI
    const stockEl = document.getElementById(`stock-${key}`);
    const btnEl = document.getElementById(`btn-${key}`);

    if (stockEl) {
        if (producto.stock <= 0) {
            stockEl.textContent = 'Agotado';
            stockEl.classList.add('agotado');
            if (btnEl) {
                btnEl.disabled = true;
                btnEl.textContent = 'Sin stock';
            }
        } else {
            stockEl.textContent = `Stock: ${producto.stock} ${producto.unidad}${producto.stock > 1 && producto.unidad !== 'kg' ? 's' : ''}`;
        }
    }
}

function cerrarModal() {
    document.getElementById('modalCiclo').classList.remove('active');
    if (compraActual) {
        mostrarToast(`¡Compra de ${compraActual.nombre} confirmada!`);
    }
    compraActual = null;
}

/* ============================================
   WALLET - Freighter Connection
   ============================================ */

function updateWalletUI() {
    const btn = document.getElementById('btnWallet');
    if (btn) {
        if (walletConnected && walletAddress) {
            const shortAddress = walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);
            btn.innerHTML = `<span>⭐</span> ${shortAddress} · Desconectar`;
            btn.classList.add('connected');
            btn.setAttribute('onclick', 'desconectarWallet()');
        } else {
            btn.innerHTML = `<span>🔗</span> Conectar Wallet`;
            btn.classList.remove('connected');
            btn.setAttribute('onclick', 'conectarFreighterDirecto()');
        }
    }
}

function desconectarWallet() {
    walletConnected = false;
    walletAddress = null;
    updateWalletUI();
    mostrarToast('Wallet desconectada');
}

// Direct Freighter connection
async function conectarFreighterDirecto() {
    
    // Re-scan for Freighter
    const freighter = findFreighter();

    // Check if Freighter is installed
    if (!freighter) {
        mostrarToast('⚠️ Freighter no detectado. Instalá la extensión.');
        return;
    }

    // Freighter is installed, proceed
    try {
        mostrarToast('⏳ Conectando con Freighter...');
        
        // Detect if Freighter is available in this environment
        if (typeof freighter.isConnected === 'function') {
            try {
                const connectedRes = await freighter.isConnected();
                if (connectedRes && connectedRes.error && /not available/i.test(connectedRes.error)) {
                    mostrarToast('⚠️ Freighter no disponible en este dispositivo.');
                    return;
                }
                if (connectedRes && connectedRes.isConnected === false) {
                    mostrarToast('⚠️ Instalá Freighter para continuar.');
                    return;
                }
            } catch (e) {
                mostrarToast('⚠️ Freighter no disponible en este dispositivo.');
                return;
            }
        }

        // Request permission first to trigger Freighter popup
        if (typeof freighter.isAllowed === 'function') {
            const allowedRes = await freighter.isAllowed();
            const isAllowed = !!(allowedRes && allowedRes.isAllowed);
            if (allowedRes && allowedRes.error && /not available/i.test(allowedRes.error)) {
                mostrarToast('⚠️ Freighter no disponible en este dispositivo.');
                return;
            }
            if (!isAllowed) {
                if (typeof freighter.setAllowed === 'function') {
                    await freighter.setAllowed();
                } else if (typeof freighter.requestAccess === 'function') {
                    await freighter.requestAccess();
                }
            }
        }

        // Method 1: Try getAddress (most common)
        let publicKey = null;
        
        try {
            const res = await freighter.getAddress();
            publicKey = (res && typeof res === 'object') ? res.address : res;
        } catch (e1) {
            
            // Method 2: Try getPublicKey
            try {
                publicKey = await freighter.getPublicKey();
            } catch (e2) {
                
                // Method 3: Try requestAccess
                try {
                    publicKey = await freighter.requestAccess();
                } catch (e3) {
                    throw new Error('No se pudo obtener acceso. ¿Rechazaste el permiso?');
                }
            }
        }

        if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
            mostrarToast('❌ No se pudo obtener la dirección');
            return;
        }

        // Success!
        walletConnected = true;
        walletAddress = publicKey;

        updateWalletUI();
        const shortAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
        mostrarToast('✅ Wallet conectada: ' + shortAddress);

    } catch (error) {
        
        if (error.message && error.message.includes('rejected')) {
            mostrarToast('⚠️ Rechazaste la conexión. Intentá de nuevo.');
        } else if (error.message && error.message.includes('not installed')) {
            mostrarToast('⚠️ Freighter no detectado. Instalalo y recargá.');
        } else {
            mostrarToast('❌ Error: ' + (error.message || 'Intentá de nuevo'));
        }
    }
}

/* ============================================
   DEMAND PUBLISHING
   ============================================ */
function publicarDemanda() {
    const negocio = document.getElementById('demandaNegocio').value.trim();
    const producto = document.getElementById('demandaProducto').value;
    const cantidad = document.getElementById('demandaCantidad').value;
    const unidad = document.getElementById('demandaUnidad').value;

    if (!negocio || !producto || !cantidad) {
        mostrarToast('Completá todos los campos');
        return;
    }

    // Get emoji for product
    const emojis = {
        cafe: '☕',
        soja: '🌱',
        maiz: '🌽',
        huevos: '🥚',
        leche: '🥛',
        dulce: '🥄'
    };

    const productoNombre = productos[producto].nombre;
    const emoji = emojis[producto] || '📦';

    // Create new demand item
    const demandGrid = document.querySelector('.demand-grid');
    const newItem = document.createElement('div');
    newItem.className = 'demand-item demand-new';
    newItem.innerHTML = `${emoji} ${negocio} busca ${cantidad} ${unidad} de ${productoNombre.toLowerCase()}`;

    // Add to beginning
    demandGrid.insertBefore(newItem, demandGrid.firstChild);

    // Clear form
    document.getElementById('demandaNegocio').value = '';
    document.getElementById('demandaCantidad').value = '';

    // Show toast
    mostrarToast('¡Demanda publicada! Los productores te contactarán');

    // Animate
    setTimeout(() => newItem.classList.remove('demand-new'), 100);
}

/* ============================================
   PRODUCT PUBLISHING (Producers)
   ============================================ */
function publicarProducto() {
    // Check if wallet is connected
    if (!walletConnected) {
        mostrarToast('Conectá tu wallet para publicar productos');
        conectarFreighterDirecto();
        return;
    }

    const nombre = document.getElementById('productoNombre').value.trim();
    const productor = document.getElementById('productoProductor').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const unidad = document.getElementById('productoUnidad').value;
    const stock = parseInt(document.getElementById('productoStock').value);

    if (!nombre || !productor || !precio || !stock) {
        mostrarToast('Completá todos los campos');
        return;
    }

    // Generate unique key
    const key = nombre.toLowerCase().replace(/\s/g, '_') + '_' + Date.now();

    // Add to products object
    productos[key] = {
        nombre: nombre,
        base: precio,
        var: 0.02,
        unidad: unidad,
        stock: stock
    };
    preciosActuales[key] = precio;

    // Create product card HTML
    const productsGrid = document.querySelector('.products-grid');
    const newCard = document.createElement('div');
    newCard.className = 'product-card product-new';
    newCard.id = `card-${key}`;
    newCard.innerHTML = `
        <div class="product-image" style="background: #f0fdf4;">🌾</div>
        <div class="product-info">
            <div class="product-name">${nombre}</div>
            <div class="product-origin">📍 ${productor}</div>
            <div class="product-price" id="precio-${key}">$${precio.toLocaleString('es-AR')}/${unidad}</div>
            <div class="product-stock" id="stock-${key}">Stock: ${stock} ${unidad}</div>
            <button class="btn-buy" id="btn-${key}" onclick="iniciarCompra('${key}')">Comprar ahora</button>
            <button class="btn-delete" onclick="eliminarProducto('${key}')">🗑️ Eliminar</button>
        </div>
    `;

    // Add to beginning of grid
    productsGrid.insertBefore(newCard, productsGrid.firstChild);

    // Clear form
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoProductor').value = '';
    document.getElementById('productoPrecio').value = '';
    document.getElementById('productoStock').value = '';

    // Show success
    mostrarToast('¡Producto publicado! Se eliminará en 5 minutos (demo)');

    // Animate
    setTimeout(() => newCard.classList.remove('product-new'), 100);

    // Auto-delete after 5 minutes (demo mode)
    setTimeout(() => {
        eliminarProducto(key);
    }, 5 * 60 * 1000); // 5 minutes
}

function eliminarProducto(key) {
    const card = document.getElementById(`card-${key}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
        delete productos[key];
        delete preciosActuales[key];
    }
}

/* ============================================
   OFFER SYSTEM (For Demands)
   ============================================ */
let ofertaActual = {};

function abrirOfertaModal(producto, negocio, cantidad, unidad) {
    // Check if wallet is connected
    if (!walletConnected) {
        mostrarToast('Conectá tu wallet para hacer ofertas');
        conectarFreighterDirecto();
        return;
    }

    ofertaActual = { producto, negocio, cantidad, unidad };

    document.getElementById('ofertaDescripcion').textContent = `Oferta para ${negocio}`;
    document.getElementById('ofertaUnidadLabel').textContent = unidad === 'maples' ? 'maple' : unidad;
    document.getElementById('ofertaProducto').value = '';
    document.getElementById('ofertaPrecio').value = '';
    document.getElementById('ofertaTotal').textContent = '$0';

    document.getElementById('modalOferta').classList.add('active');

    // Add price input listener for real-time total calculation
    document.getElementById('ofertaPrecio').oninput = calcularTotalOferta;
}

function cerrarOfertaModal() {
    document.getElementById('modalOferta').classList.remove('active');
}

function calcularTotalOferta() {
    const precio = parseFloat(document.getElementById('ofertaPrecio').value) || 0;
    const total = precio * ofertaActual.cantidad;
    document.getElementById('ofertaTotal').textContent = `$${total.toLocaleString('es-AR')}`;
}

function enviarOferta() {
    const producto = document.getElementById('ofertaProducto').value.trim();
    const precio = parseFloat(document.getElementById('ofertaPrecio').value);

    if (!producto || !precio) {
        mostrarToast('Completá todos los campos');
        return;
    }

    const total = precio * ofertaActual.cantidad;

    // Close modal
    cerrarOfertaModal();

    // Show success toast
    mostrarToast(`✅ Oferta enviada a ${ofertaActual.negocio} - Pendiente de aceptación`);

    // In a real app, this would send to backend and create smart contract
}

/* ============================================
   TOAST Notifications
   ============================================ */
function mostrarToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

/* ============================================
   FREIGHTER DETECTION
   ============================================ */
// Check all possible ways Freighter might be available
function findFreighter() {
    // Check standard locations
    if (window.freighter && typeof window.freighter === 'object') {
        return window.freighter;
    }
    if (window.freighterApi && typeof window.freighterApi === 'object') {
        return window.freighterApi;
    }
    
    // NOT scanning other window objects - avoid false positives from other extensions
    
    return null;
}

// Check if Freighter is available
function checkFreighter() {
    const freighter = findFreighter();
    if (freighter && !window.freighter) {
        window.freighter = freighter; // Assign to standard location
    }
    return freighter !== null;
}

// Listen for Freighter injection
window.addEventListener('freighter:loaded', () => {
    checkFreighter();
});

// Poll for Freighter
let freighterPollCount = 0;
const freighterPoll = setInterval(() => {
    freighterPollCount++;
    
    if (checkFreighter()) {
        clearInterval(freighterPoll);
    } else if (freighterPollCount > 30) { // Stop after 15 seconds
        clearInterval(freighterPoll);
    }
}, 500);

// Initial check
setTimeout(() => {
    checkFreighter();
}, 100);

/* ============================================
   INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    startPriceUpdates();
    sugerirValor();
    
    // Check Freighter status after a delay (extension loads async)
    setTimeout(() => {
        checkFreighter();
    }, 2000);
});

// Make functions globally available
window.sugerirValor = sugerirValor;
window.calcular = calcular;
window.solicitarValidacion = solicitarValidacion;
window.iniciarCompra = iniciarCompra;
window.cerrarModal = cerrarModal;
window.conectarFreighterDirecto = conectarFreighterDirecto;
window.desconectarWallet = desconectarWallet;
window.mostrarToast = mostrarToast;
window.publicarDemanda = publicarDemanda;
window.publicarProducto = publicarProducto;
window.eliminarProducto = eliminarProducto;
window.abrirOfertaModal = abrirOfertaModal;
window.cerrarOfertaModal = cerrarOfertaModal;
window.enviarOferta = enviarOferta;
