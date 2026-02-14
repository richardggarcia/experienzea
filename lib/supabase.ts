import { createClient } from '@supabase/supabase-js';

// Variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificar que existan las variables
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidas. Las operaciones de base de datos fallarán.');
}

// Cliente con Service Role (solo para servidor - tiene acceso total)
// Lazy initialization para evitar errores en build
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
    get(target, prop) {
        if (!_supabaseAdmin) {
            if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
            }
            _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }
        // @ts-ignore
        return _supabaseAdmin[prop];
    }
});

// Cliente con Anon Key (para operaciones de cliente)
let _supabaseClient: ReturnType<typeof createClient> | null = null;
export const supabaseClient = new Proxy({} as ReturnType<typeof createClient>, {
    get(target, prop) {
        if (!_supabaseClient) {
            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars.');
            }
            _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        }
        // @ts-ignore
        return _supabaseClient[prop];
    }
});

// Tipos
export interface Asset {
    id: string;
    type: 'tractor' | 'car' | 'house';
    name: string;
    value: number;
    owner: string;
    owner_wallet?: string;
    status: 'pending_review' | 'approved' | 'tokenized' | 'funding_requested' | 'funded';
    contract_id?: string;
    documents?: {
        insurance?: string;
        property?: string;
    };
    created_at?: string;
}
