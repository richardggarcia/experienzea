import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/loan-requests/[id] - Actualizar solicitud de préstamo
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const updates = await request.json();

        const { data, error } = await supabaseAdmin
            .from("loan_requests")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("❌ Error updating loan request:", error);
            return NextResponse.json(
                { error: "Error updating loan request" },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Loan request no encontrado" },
                { status: 404 }
            );
        }

        console.log("✅ Loan request actualizado:", id, updates);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error updating loan request" },
            { status: 500 }
        );
    }
}

// DELETE /api/loan-requests/[id] - Eliminar solicitud de préstamo
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from("loan_requests")
            .select("id,status")
            .eq("id", id)
            .single();

        if (fetchError) {
            console.error("❌ Error fetching loan request:", fetchError);
            return NextResponse.json(
                { error: "Error fetching loan request" },
                { status: 500 }
            );
        }

        if (!existing) {
            return NextResponse.json(
                { error: "Loan request no encontrado" },
                { status: 404 }
            );
        }

        // Para evitar inconsistencias, solo permitimos borrar solicitudes aún pendientes
        if (existing.status !== "pending") {
            return NextResponse.json(
                { error: "Solo se pueden borrar solicitudes en estado pending" },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("loan_requests")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("❌ Error deleting loan request:", error);
            return NextResponse.json(
                { error: "Error deleting loan request" },
                { status: 500 }
            );
        }

        console.log("✅ Loan request eliminada:", id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error deleting loan request" },
            { status: 500 }
        );
    }
}
