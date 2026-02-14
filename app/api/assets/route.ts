import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/assets - Listar todos los activos
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Error fetching assets:", error);
        return NextResponse.json(
            { error: "Error fetching assets" },
            { status: 500 }
        );
    }

    return NextResponse.json(data);
}

// POST /api/assets - Crear nuevo activo
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const { data, error } = await supabaseAdmin
            .from('assets')
            .insert({
                id: body.id,
                type: body.type,
                name: body.name,
                value: body.value,
                owner: body.owner,
                owner_wallet: body.owner_wallet,
                status: 'pending_review',
                documents: body.documents || {}
            })
            .select()
            .single();

        if (error) {
            console.error("❌ Error creating asset:", error);
            return NextResponse.json(
                { error: "Error creating asset" },
                { status: 500 }
            );
        }

        console.log("✅ Asset creado:", data.id, data.name);
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error creating asset" },
            { status: 500 }
        );
    }
}
