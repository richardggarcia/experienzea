import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json(
                { error: "Missing key parameter" },
                { status: 400 }
            );
        }

        // Obtener URL firmada para descargar (válida 1 hora)
        const downloadUrl = await getDownloadUrl(key);

        // Redirigir a la URL firmada
        return NextResponse.redirect(downloadUrl);
    } catch (error) {
        console.error("Error generating download URL:", error);
        return NextResponse.json(
            { error: "Failed to generate download URL" },
            { status: 500 }
        );
    }
}
