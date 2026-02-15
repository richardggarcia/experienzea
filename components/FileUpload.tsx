"use client";

import { useState, useRef } from "react";
import { Upload, File, X, Check, Loader2 } from "lucide-react";

interface FileUploadProps {
    assetId: string;
    type: "insurance" | "property";
    label: string;
    accept?: string;
    onUploadComplete?: (url: string, key: string) => void;
}

export default function FileUpload({
    assetId,
    type,
    label,
    accept = "image/*,.pdf",
    onUploadComplete,
}: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validar assetId
        if (!assetId || assetId === "temp-" || assetId.startsWith("temp-undefined")) {
            setError("Error: ID de activo no válido. Cerrá y volvé a abrir el formulario.");
            console.error("❌ AssetId inválido:", assetId);
            return;
        }

        // Validar tamaño (10MB max)
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError("El archivo es muy grande. Máximo 10MB.");
            return;
        }

        setFile(selectedFile);
        setError("");
        setUploading(true);

        try {
            console.log("📤 Solicitando URL de upload para:", {
                assetId,
                type,
                filename: selectedFile.name,
                contentType: selectedFile.type
            });

            // 1. Obtener URL firmada del servidor
            const response = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId,
                    type,
                    filename: selectedFile.name,
                    contentType: selectedFile.type || "application/octet-stream",
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${response.status}`);
            }

            const { uploadUrl, key, publicUrl } = await response.json();
            console.log("✅ URL obtenida, subiendo a R2...");

            // 2. Subir archivo directamente a R2
            console.log("🌐 Subiendo a:", uploadUrl.substring(0, 60) + "...");
            
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: selectedFile,
                headers: {
                    "Content-Type": selectedFile.type || "application/octet-stream",
                },
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error("❌ Error de R2:", uploadResponse.status, errorText);
                throw new Error(`Error de upload: ${uploadResponse.status}`);
            }

            console.log("✅ Upload exitoso!");
            setUploaded(true);
            onUploadComplete?.(publicUrl, key);
        } catch (err: any) {
            console.error("❌ Upload error:", err);
            if (err.message?.includes("Failed to fetch")) {
                setError("Error de conexión con el servidor de archivos. Si estás en producción, contactá al administrador para verificar la configuración CORS.");
            } else {
                setError(err.message || "Error al subir el archivo. Intentá de nuevo.");
            }
            setFile(null);
            setUploaded(false);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setFile(null);
        setUploaded(false);
        setError("");
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400 mb-2">
                {label}
            </label>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading || uploaded}
            />

            {!file ? (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer transition-all bg-slate-950/50"
                >
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                        Click para seleccionar archivo
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                        JPG, PNG, PDF (máx. 10MB)
                    </p>
                </div>
            ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            {uploaded ? (
                                <Check className="w-5 h-5 text-green-500" />
                            ) : uploading ? (
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            ) : (
                                <File className="w-5 h-5 text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                                {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                {uploading && " - Subiendo..."}
                                {uploaded && " - Subido ✓"}
                            </p>
                        </div>
                        {!uploading && (
                            <button
                                onClick={handleRemove}
                                className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-2 bg-red-500/10 p-2 rounded">
                    <X className="w-3 h-3" /> {error}
                </p>
            )}
        </div>
    );
}
