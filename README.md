# OmbuLedger MVP

Plataforma que conecta productores agropecuarios locales con consumidores, con microfinanciamiento usando collateral real.

## Stack Actual (MVP)

- HTML5
- CSS3 (con variables CSS)
- JavaScript (Vanilla)

## Stack Futuro

- React + Vite
- Stellar SDK
- Freighter Wallet Integration

## Estructura

```
/agro
├── index.html      # Página principal
├── styles.css      # Estilos
├── app.js          # Lógica de la aplicación
├── README.md       # Este archivo
└── /src            # (Futuro) Código React
```

## Funcionalidades

### Ticker de Precios
- Barra animada con precios fluctuando ±3% cada 5 segundos
- Indicadores visuales (↑ verde, ↓ rojo)
- Sincronizado con precios del marketplace

### Calculadora de Préstamos
- LTV máximo 60% del colateral
- Sistema francés de amortización
- Tasa 35% anual
- Disclaimer de validación física

### Marketplace
- 5 productos locales
- Ciclo de compra animado (4 segundos)
- Gestión de stock en tiempo real

### Wallet (Mock)
- Botón de conexión en header
- Modal con opciones de wallet
- Preparado para integración con Freighter

## Cómo correr

Simplemente abrir `index.html` en el navegador, o usar un servidor local:

```bash
npx serve .
```

## Productos

| Producto | Precio | Productor |
|----------|--------|-----------|
| ☕ Café de especialidad | $2.500/kg | Juan Pérez |
| 🌱 Soja orgánica | $28/kg | Cooperativa San Martín |
| 🌽 Maíz fresco | $19/kg | Familia González |
| 🥚 Huevos de campo | $350/maple | Doña María |
| 🥛 Leche pasteurizada | $180/litro | Rancho Los Álamos |

## Próximos Pasos

1. Inicializar React con Vite
2. Integrar Stellar SDK
3. Conectar Freighter wallet
4. Smart contracts para préstamos
