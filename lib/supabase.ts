import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Cliente con Service Role (solo para servidor)
let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseAdminInstance) {
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
        }
        supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return supabaseAdminInstance;
}

// Exportar instancia para compatibilidad hacia atrás
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get: (target, prop) => {
        const client = getSupabaseAdmin();
        return (client as any)[prop];
    }
});

// Cliente con Anon Key
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClientInstance) {
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars.');
        }
        supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseClientInstance;
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
    get: (target, prop) => {
        const client = getSupabaseClient();
        return (client as any)[prop];
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
