# ExperienZea - Protocolo de Préstamos con RWA

![ExperienZea](https://img.shields.io/badge/ExperienZea-Pr%C3%A9stamos%20RWA-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Impacta](https://img.shields.io/badge/Impacta-Bootcamp-purple)
![Stellar](https://img.shields.io/badge/Stellar-Blockchain-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)

**Proyecto desarrollado para el Impacta Bootcamp - Blockchain Stellar**

**Tu Activo Real = Liquidez Inmediata**

ExperienZea es una plataforma DeFi (Finanzas Descentralizadas) que permite tokenizar activos reales (tractores, vehículos, inmuebles) y usarlos como garantía para obtener préstamos en stablecoins (USDC).

## 🚀 Características Principales

### Para Solicitantes
- 🔐 **Conexión con Freighter Wallet** - Billetera nativa de Stellar
- 📄 **Carga de documentos** - Seguro y título de propiedad
- 💰 **Simulador de préstamos** - Calcula tu poder de fuego (LTV 70%)
- 📊 **Seguimiento de estado** - Ve el progreso de tu solicitud en tiempo real
- 💾 **Perfil persistente** - Datos guardados para futuras solicitudes

### Para Administradores (ExperienZea)
- 🔒 **Autenticación segura** - Inicio de sesión con correo/contraseña vía NextAuth.js
- 👁️ **Revisión de documentos** - Vista previa de imágenes antes de aprobar
- ✅ **Flujo de aprobación** - Aprueba → Tokeniza → Crea Custodia (Escrow) → Envía fondos
- 📈 **Panel completo** - Estadísticas de activos y préstamos

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Solicitante   │     │   ExperienZea   │     │   Cadena de     │
│   (Freighter)   │────▶│ (Administrador) │────▶│  bloques        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Documentos    │     │   Supabase DB   │     │   Trustless     │
│   (Cloudflare   │     │   (PostgreSQL)  │     │ Work (Escrow)   │
│      R2)        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │   NFT del Activo │
                                                    │   (Soroban)     │
                                                    └─────────────────┘
```

## 🛠️ Tecnologías Utilizadas

- **Interfaz web**: Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Autenticación**: NextAuth.js (Administrador), billetera Freighter (Solicitantes)
- **Base de Datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Cloudflare R2 (documentos)
- **Blockchain**: Red Stellar (Testnet)
- **Despliegue**: Vercel

## 📋 Flujo de Trabajo

### 1. Solicitud de Préstamo
1. Solicitante conecta su billetera Freighter
2. Completa datos del activo y carga documentos
3. Envía a revisión

### 2. Revisión y Aprobación
1. Administrador revisa documentos en el panel
2. Marca la casilla de confirmación
3. Aprueba el activo

### 3. Tokenización
1. Administrador tokeniza el activo (emite NFT)
2. El activo pasa a estado "Tokenizado"

### 4. Creación de Escrow
1. Administrador crea escrow en Trustless Work
2. Se genera un ID de contrato único

### 5. Fondeo
1. Administrador envía fondos USDC al escrow
2. Solicitante recibe los fondos

## 🚀 Cómo Empezar

### Prerrequisitos
- Node.js 18+
- Cuenta en Supabase
- Cuenta en Cloudflare (para R2)
- Billetera Freighter instalada (para pruebas)

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/richardggarcia/experienzea.git
cd experienzea
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local`:
```env
# NextAuth
NEXTAUTH_SECRET=tu_secreto_aqui
NEXTAUTH_URL=http://localhost:3000

# Credenciales de administrador
ADMIN_EMAIL=admin@experienzea.com
ADMIN_PASSWORD=tu_password_seguro_aqui

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=tu_account_id
CLOUDFLARE_ACCESS_KEY_ID=tu_access_key
CLOUDFLARE_SECRET_ACCESS_KEY=tu_secret_key
R2_BUCKET_NAME=experienzea-docs

# Trustless Work (opcional para pruebas)
NEXT_PUBLIC_TW_BASE_URL=https://dev.api.trustlesswork.com
NEXT_PUBLIC_TW_API_KEY=tu_api_key
NEXT_PUBLIC_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA
NEXT_PUBLIC_USDC_SYMBOL=USDC
```

4. **Configurar base de datos en Supabase**
Ejecutar en el SQL Editor de Supabase:
```sql
create table assets (
    id uuid default gen_random_uuid() primary key,
    type text not null,
    name text not null,
    value integer not null,
    owner text not null,
    owner_wallet text,
    status text default 'pending_review',
    contract_id text,
    documents jsonb default '{}',
    created_at timestamp default now()
);

-- Políticas básicas
alter table assets enable row level security;
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

6. **Abrir en el navegador**
- Inicio: http://localhost:3000
- Selector de portal: http://localhost:3000/dashboard
- Solicitante: http://localhost:3000/solicitante
- Administrador: http://localhost:3000/company/login

## 👥 Credenciales de Demostración

### Administrador
- Configura en `.env.local`:
  - `ADMIN_EMAIL` (predeterminado: admin@experienzea.com)
  - `ADMIN_PASSWORD` (tu contraseña segura)

### Solicitante
- Conectar con cualquier billetera Freighter (Stellar Testnet)

## 📝 Estructura del Proyecto

```
experienzea/
├── app/                    # Interfaz Next.js
│   ├── api/              # Rutas API
│   │   ├── assets/       # CRUD de activos
│   │   ├── auth/         # NextAuth
│   │   ├── download/     # Descarga de documentos
│   │   └── upload/       # Carga de archivos a R2
│   ├── solicitante/      # Panel del solicitante
│   ├── company/          # Panel de admin
│   │   ├── dashboard/
│   │   └── login/
│   ├── components/       # Proveedores
│   ├── dashboard/        # Selector de rol
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Inicio
├── components/           # Componentes reutilizables
│   ├── FileUpload.tsx
│   ├── LoanCalculator.tsx
│   └── LottieHero.tsx
├── contracts/            # Contratos inteligentes (Rust/Soroban)
│   └── asset-nft/        # Contrato NFT para tokenizar activos
│       ├── src/
│       │   ├── lib.rs    # Código del contrato
│       │   └── test.rs   # Pruebas
│       └── Cargo.toml
├── hooks/
│   └── useWallet.ts      # Hook de Freighter
├── lib/
│   ├── db.ts             # Base de datos simulada (desarrollo)
│   ├── r2.ts             # Configuración R2
│   └── supabase.ts       # Cliente Supabase
├── scripts/              # Scripts de utilidad
│   └── deploy-nft.sh     # Despliegue del contrato NFT
├── types/
│   └── next-auth.d.ts    # Tipos de NextAuth
└── public/               # Recursos estáticos
```

## 🔒 Seguridad

- **Autenticación dual**: NextAuth para administrador, wallet para solicitantes
- **Privacidad multiusuario**: Cada solicitante solo ve sus activos (filtrado por billetera)
- **Documentos protegidos**: URLs firmadas de Cloudflare R2 (expiran en 1 hora)
- **Verificación obligatoria**: El administrador debe ver documentos antes de aprobar

## 🌐 Despliegue en Vercel

1. **Conectar repositorio** en Vercel
2. **Agregar variables de entorno** en Configuración → Variables de Entorno
3. **Configurar dominio** (opcional): Configuración → Dominios
4. **Despliegue automático** en cada envío a `main`

## 🧪 Pruebas

### Flujo completo de prueba:
1. Ir a `/dashboard`, elegir "Soy Solicitante" y conectar billetera
2. Crear solicitud con documentos
3. Ir a `/company/login` e ingresar como admin
4. Ver documentos, marcar casilla y aprobar
5. Tokenizar activo
6. Crear escrow
7. Enviar fondos
8. Verificar estado en panel del solicitante

## 🤝 Contribuir

1. Hacer fork del repositorio
2. Crear rama de funcionalidad: `git checkout -b feature/nueva-funcionalidad`
3. Crear commit de cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Subir la rama: `git push origin feature/nueva-funcionalidad`
5. Crear una solicitud de extracción

## 📄 Licencia

Licencia MIT - ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Stellar](https://stellar.org) - Infraestructura blockchain
- [Trustless Work](https://trustlesswork.com) - Contratos inteligentes de escrow
- [Freighter](https://freighter.app) - Billetera de Stellar
- [Supabase](https://supabase.com) - Base de datos y autenticación
- [Vercel](https://vercel.com) - Alojamiento

---

**ExperienZea** - Democratizando el acceso a liquidez con activos reales.

---

## 🎓 Impacta Bootcamp

Este proyecto fue desarrollado como parte del **Impacta Bootcamp** de Stellar blockchain.

Queremos agradecer especialmente al **equipo de Trustless Work** por el acompañamiento durante el proceso:
- soporte técnico rápido y claro
- excelente disposición para responder dudas
- guía práctica para integrar el flujo de escrow en Stellar

Tecnologías aplicadas:
- ✅ Stellar Blockchain (Testnet)
- ✅ Contratos inteligentes en Soroban
- ✅ Trustless Work Escrow
- ✅ Integración con Freighter Wallet
