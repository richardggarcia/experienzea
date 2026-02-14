import { NextRequest, NextResponse } from "next/server";
import { getUploadUrl, generateFileKey } from "@/lib/r2";

export async function POST(request: NextRequest) {
    try {
        const { assetId, type, filename, contentType } = await request.json();

        if (!assetId || !type || !filename || !contentType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Generar key única para el archivo
        const key = generateFileKey(assetId, type, filename);

        console.log("📝 Generando URL para:", { assetId, type, filename, key });

        // Obtener URL firmada para subir
        const uploadUrl = await getUploadUrl(key, contentType);

        console.log("✅ URL generada:", uploadUrl.substring(0, 80) + "...");

        return NextResponse.json({
            uploadUrl,
            key,
            publicUrl: `/api/download?key=${encodeURIComponent(key)}`,
        });
    } catch (error: any) {
        console.error("❌ Error generating upload URL:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL", details: error.message },
            { status: 500 }
        );
    }
}
