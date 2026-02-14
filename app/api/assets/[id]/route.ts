import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/assets/[id] - Actualizar activo
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const updates = await request.json();
        
        const { data, error } = await supabaseAdmin
            .from('assets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("❌ Error updating asset:", error);
            return NextResponse.json(
                { error: "Error updating asset" },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Asset no encontrado" },
                { status: 404 }
            );
        }

        console.log("✅ Asset actualizado:", id, updates);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error updating asset" },
            { status: 500 }
        );
    }
}

// DELETE /api/assets/[id] - Eliminar activo
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const { error } = await supabaseAdmin
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("❌ Error deleting asset:", error);
            return NextResponse.json(
                { error: "Error deleting asset" },
                { status: 500 }
            );
        }

        console.log("✅ Asset eliminado:", id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Error:", error);
        return NextResponse.json(
            { error: "Error deleting asset" },
            { status: 500 }
        );
    }
}
