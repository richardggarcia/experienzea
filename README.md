# ExperienZea - RWA Lending Protocol

![ExperienZea](https://img.shields.io/badge/ExperienZea-RWA%20Lending-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**Tu Activo Real = Liquidez Inmediata**

ExperienZea es una plataforma DeFi (Finanzas Descentralizadas) que permite tokenizar activos reales (tractores, vehículos, inmuebles) y usarlos como garantía para obtener préstamos en stablecoins (USDC).

## 🚀 Características Principales

### Para Solicitantes (Borrowers)
- 🔐 **Conexión con Freighter Wallet** - Wallet nativa de Stellar
- 📄 **Carga de documentos** - Seguro y título de propiedad
- 💰 **Simulador de préstamos** - Calcula tu poder de fuego (LTV 70%)
- 📊 **Seguimiento de estado** - Ve el progreso de tu solicitud en tiempo real
- 💾 **Perfil persistente** - Datos guardados para futuras solicitudes

### Para Administradores (ExperienZea)
- 🔒 **Autenticación segura** - Login con email/password vía NextAuth.js
- 👁️ **Revisión de documentos** - Vista previa de imágenes antes de aprobar
- ✅ **Flujo de aprobación** - Aprueba → Tokeniza → Crea Escrow → Envía fondos
- 📈 **Dashboard completo** - Estadísticas de activos y préstamos

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Solicitante   │     │   ExperienZea   │     │   Blockchain    │
│   (Freighter)   │────▶│    (Admin)      │────▶│   (Stellar)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Documentos    │     │   Supabase DB   │     │   Trustless     │
│   (Cloudflare   │     │   (PostgreSQL)  │     │   Work Escrow   │
│      R2)        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Autenticación**: NextAuth.js (Admin), Freighter Wallet (Solicitantes)
- **Base de Datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Cloudflare R2 (documentos)
- **Blockchain**: Stellar Network (Testnet)
- **Despliegue**: Vercel

## 📋 Flujo de Trabajo

### 1. Solicitud de Préstamo
1. Solicitante conecta su wallet Freighter
2. Completa datos del activo y carga documentos
3. Envía a revisión

### 2. Revisión y Aprobación
1. Admin revisa documentos en el panel
2. Marca checkbox de confirmación
3. Aprueba el activo

### 3. Tokenización
1. Admin tokeniza el activo (mintea NFT)
2. El activo pasa a estado "Tokenizado"

### 4. Creación de Escrow
1. Admin crea escrow en Trustless Work
2. Se genera un contract ID único

### 5. Fondeo
1. Admin envía fondos USDC al escrow
2. Solicitante recibe los fondos

## 🚀 Cómo Empezar

### Prerrequisitos
- Node.js 18+
- Cuenta en Supabase
- Cuenta en Cloudflare (para R2)
- Wallet Freighter instalada (para testing)

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

# Admin Credentials
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

# Trustless Work (opcional para testing)
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
- Landing: http://localhost:3000
- Solicitante: http://localhost:3000/borrower
- Admin: http://localhost:3000/company/login

## 👥 Credenciales de Demo

### Admin
- Configura en `.env.local`:
  - `ADMIN_EMAIL` (default: admin@experienzea.com)
  - `ADMIN_PASSWORD` (tu password seguro)

### Solicitante
- Conectar con cualquier wallet Freighter (Stellar Testnet)

## 📝 Estructura del Proyecto

```
experienzea/
├── app/
│   ├── api/              # API Routes
│   │   ├── assets/       # CRUD de activos
│   │   ├── auth/         # NextAuth
│   │   ├── download/     # Descarga de documentos
│   │   └── upload/       # Upload a R2
│   ├── borrower/         # Dashboard del solicitante
│   ├── company/          # Panel de admin
│   │   ├── dashboard/
│   │   └── login/
│   ├── components/       # Providers
│   ├── dashboard/        # Selector de rol
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Landing
├── components/           # Componentes reutilizables
│   ├── FileUpload.tsx
│   ├── LoanCalculator.tsx
│   └── LottieHero.tsx
├── hooks/
│   └── useWallet.ts      # Hook para Freighter
├── lib/
│   ├── db.ts             # Mock DB (desarrollo)
│   ├── r2.ts             # Configuración R2
│   └── supabase.ts       # Cliente Supabase
├── types/
│   └── next-auth.d.ts    # Tipos de NextAuth
└── public/               # Assets estáticos
```

## 🔒 Seguridad

- **Autenticación dual**: NextAuth para admin, wallet para solicitantes
- **Privacidad multiusuario**: Cada solicitante solo ve sus activos (filtrado por wallet)
- **Documentos protegidos**: URLs firmadas de Cloudflare R2 (expiran en 1 hora)
- **Verificación obligatoria**: Admin debe ver documentos antes de aprobar

## 🌐 Despliegue en Vercel

1. **Conectar repositorio** en Vercel
2. **Agregar variables de entorno** en Settings → Environment Variables
3. **Configurar dominio** (opcional): Settings → Domains
4. **Deploy automático** en cada push a `main`

## 🧪 Testing

### Flujo completo de prueba:
1. Ir a `/borrower` y conectar wallet
2. Crear solicitud con documentos
3. Ir a `/company/login` e ingresar como admin
4. Ver documentos, marcar checkbox y aprobar
5. Tokenizar activo
6. Crear escrow
7. Enviar fondos
8. Verificar estado en dashboard del solicitante

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- [Stellar](https://stellar.org) - Blockchain infrastructure
- [Trustless Work](https://trustlesswork.com) - Escrow smart contracts
- [Freighter](https://freighter.app) - Stellar wallet
- [Supabase](https://supabase.com) - Database & Auth
- [Vercel](https://vercel.com) - Hosting

---

**ExperienZea** - Democratizando el acceso a liquidez con activos reales.
