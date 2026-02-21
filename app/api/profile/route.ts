import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('wallet_address', wallet)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ profile: null }, { status: 200 }); // Not found is expected for new users
            }
            throw error;
        }

        return NextResponse.json({ profile: data }, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error fetching profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet_address, full_name, cuit_cuil, company_type, industry, has_collateral, email, phone } = body;

        if (!wallet_address || !full_name || !cuit_cuil || !company_type || !industry || has_collateral === undefined || !email || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .insert([{
                wallet_address,
                full_name,
                cuit_cuil,
                company_type,
                industry,
                has_collateral,
                email,
                phone
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ Error creating profile:", error);
            // Handle unique constraint violations explicitly to return better error messages
            if (error.code === '23505') {
                if (error.message.includes('cuit_cuil')) return NextResponse.json({ error: "El CUIT/CUIL ingresado ya se encuentra registrado" }, { status: 409 });
                if (error.message.includes('email')) return NextResponse.json({ error: "El email ingresado ya se encuentra registrado" }, { status: 409 });
                if (error.message.includes('phone')) return NextResponse.json({ error: "El número de teléfono ya se encuentra registrado" }, { status: 409 });
                if (error.message.includes('wallet_address')) return NextResponse.json({ error: "Esta wallet ya está registrada." }, { status: 409 });
            }
            return NextResponse.json({ error: "Error creating profile" }, { status: 500 });
        }

        return NextResponse.json({ profile: data }, { status: 201 });
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
