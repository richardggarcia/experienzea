import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente con Service Role (solo para servidor - tiene acceso total)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Cliente con Anon Key (para operaciones de cliente)
export const supabaseClient = createClient(
    supabaseUrl, 
    process.env.SUPABASE_ANON_KEY!
);

// Tipos
export interface Asset {
    id: string;
    type: 'tractor' | 'car' | 'house';
    name: string;
    value: number;
    owner: string;
    owner_wallet?: string;
    status: 'pending_review' | 'approved' | 'tokenized' | 'funding_requested';
    contract_id?: string;
    documents?: {
        insurance?: string;
        property?: string;
    };
    created_at?: string;
}
