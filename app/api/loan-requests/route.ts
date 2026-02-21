import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// GET /api/loan-requests - Listar solicitudes de préstamo
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    let query = supabaseAdmin
        .from("loan_requests")
        .select("*")
        .order("created_at", { ascending: false });

    if (wallet) {
        query = query.eq("borrower_wallet", wallet);
    }

    const { data, error } = await query;

    if (error) {
        console.error("❌ Error fetching loan requests:", error);
        return NextResponse.json(
            { error: "Error fetching loan requests" },
            { status: 500 }
        );
    }

    return NextResponse.json(data);
}

// POST /api/loan-requests - Crear solicitud de préstamo unificada
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            borrower_wallet,
            borrower_name,
            amount_requested,
            collateral_value,
            ltv_ratio,
            asset_ids, // Array de IDs de garantías seleccionadas
        } = body;

        if (!borrower_wallet || !amount_requested || !asset_ids?.length) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        const loanId = uuidv4();

        const { data, error } = await supabaseAdmin
            .from("loan_requests")
            .insert({
                id: loanId,
                borrower_wallet,
                borrower_name: borrower_name || "",
                amount_requested,
                collateral_value,
                ltv_ratio: ltv_ratio || 0.7,
                asset_ids, // JSONB array
                status: "pending", // pending → approved → escrow_created → funded
            })
            .select()
            .single();

        if (error) {
            console.error("❌ Error creating loan request:", error);
            return NextResponse.json(
                { error: "Error creating loan request" },
                { status: 500 }
            );
        }

        console.log(
            `✅ Loan request creada: ${loanId} | $${amount_requested} | ${asset_ids.length} garantía(s)`
        );
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error creating loan request" },
            { status: 500 }
        );
    }
}
