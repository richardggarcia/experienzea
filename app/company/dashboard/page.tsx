"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
    LogOut,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Coins,
    Tractor,
    Building2,
    Car,
    FileText,
    Wallet,
    Rocket,
    Check,
    X,
    Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Asset Type desde Supabase
interface Asset {
    id: string;
    type: "tractor" | "car" | "house";
    name: string;
    value: number;
    owner: string;
    ownerWallet?: string;
    owner_wallet?: string;
    status: "pending_review" | "approved" | "tokenized" | "funding_requested" | "funded";
    contractId?: string;
    contract_id?: string;
    submittedAt?: string;
    created_at?: string;
    documents?: {
        insurance?: string;
        property?: string;
        insuranceFront?: string;
        insuranceBack?: string;
        propertyTitle?: string;
    };
}

// Mock inicial para demo
const MOCK_ASSETS: Asset[] = [
    {
        id: "1",
        type: "tractor",
        name: "John Deere 5075E",
        value: 45000,
        owner: "Juan Pérez",
        ownerWallet: "G...ABC123",
        status: "pending_review",
        submittedAt: "2024-01-15T10:30:00",
    },
    {
        id: "2",
        type: "car",
        name: "Toyota Hilux 2023",
        value: 35000,
        owner: "María González",
        ownerWallet: "G...XYZ789",
        status: "pending_review",
        submittedAt: "2024-01-15T09:15:00",
    },
];

export default function CompanyDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { address, connect, disconnect, isConnecting } = useWallet();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [docsReviewed, setDocsReviewed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Cargar assets desde Supabase
    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const response = await fetch('/api/assets');
            if (response.ok) {
                const data = await response.json();
                setAssets(data);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Redirect si no está autenticado
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/company/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!session) return null;

    const handleApprove = async (id: string) => {
        setIsProcessing(id);
        try {
            const response = await fetch(`/api/assets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            if (response.ok) {
                await fetchAssets(); // Recargar datos
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("¿Estás seguro de rechazar este activo?")) return;
        setAssets(assets.filter((a) => a.id !== id));
    };

    const handleTokenize = async (id: string) => {
        if (!address) {
            alert("Primero conectá la wallet de la empresa");
            return;
        }
        setIsProcessing(id);
        // Simular mint del NFT
        setTimeout(() => {
            setAssets(
                assets.map((a) =>
                    a.id === id ? { ...a, status: "tokenized" } : a
                )
            );
            setIsProcessing(null);
        }, 2000);
    };

    const handleCreateEscrow = async (id: string) => {
        if (!address) {
            alert("Primero conectá la wallet de la empresa");
            return;
        }
        setIsProcessing(id);
        try {
            const contractId = `TW-${Date.now().toString(36).toUpperCase()}`;
            const response = await fetch(`/api/assets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'funding_requested',
                    contract_id: contractId
                })
            });
            if (response.ok) {
                await fetchAssets();
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleSendFunds = async (id: string) => {
        if (!address) {
            alert("Primero conectá la wallet de la empresa");
            return;
        }
        
        if (!confirm("¿Confirmás el envío de fondos al solicitante? Esta acción simula la transferencia de USDC.")) {
            return;
        }
        
        setIsProcessing(id);
        try {
            const response = await fetch(`/api/assets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'funded'
                })
            });
            if (response.ok) {
                await fetchAssets();
                alert("✅ Fondos enviados correctamente al solicitante");
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsProcessing(null);
        }
    };

    const getIcon = (type: Asset["type"]) => {
        switch (type) {
            case "tractor":
                return <Tractor className="w-6 h-6" />;
            case "house":
                return <Building2 className="w-6 h-6" />;
            case "car":
                return <Car className="w-6 h-6" />;
        }
    };

    const getStatusBadge = (status: Asset["status"]) => {
        switch (status) {
            case "pending_review":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> PENDIENTE
                    </div>
                );
            case "approved":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> APROBADO
                    </div>
                );
            case "tokenized":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-500 border-purple-500/20 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> TOKENIZADO
                    </div>
                );
            case "funding_requested":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-orange-500/10 text-orange-500 border-orange-500/20 flex items-center gap-1">
                        <Rocket className="w-3 h-3" /> FONDOS ENVIADOS
                    </div>
                );
            case "funded":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                    </div>
                );
        }
    };

    const pendingCount = assets.filter((a) => a.status === "pending_review").length;
    const approvedCount = assets.filter((a) => a.status === "approved").length;
    const tokenizedCount = assets.filter((a) => a.status === "tokenized").length;
    const fundedCount = assets.filter((a) => a.status === "funding_requested" || a.status === "funded").length;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50">
            {/* Header */}
            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/[0.05] px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(234,88,12,0.3)]">
                            E
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">
                                ExperienZea
                            </span>
                            <span className="text-slate-500 text-sm ml-2">
                                | Panel de Control
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Wallet de la Empresa */}
                        {address ? (
                            <span className="hidden md:flex items-center gap-2 text-xs bg-green-500/10 text-green-400 px-4 py-2 rounded-full font-mono border border-green-500/20">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                {address.substring(0, 6)}...{address.substring(address.length - 4)}
                                <span className="text-green-600">(Empresa)</span>
                            </span>
                        ) : (
                            <button
                                onClick={() => connect()}
                                disabled={isConnecting}
                                className="hidden md:flex items-center gap-2 text-xs bg-orange-500/10 text-orange-400 px-4 py-2 rounded-full font-mono border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                            >
                                <Wallet className="w-3 h-3" />
                                {isConnecting ? "Conectando..." : "Conectar Wallet Empresa"}
                            </button>
                        )}

                        {/* User menu */}
                        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-white">
                                    {session.user?.name}
                                </p>
                                <p className="text-xs text-slate-500">Administrador</p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/company/login" })}
                                className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/[0.05]">
                        <p className="text-yellow-500 text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {pendingCount}
                        </p>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">
                            Pendientes
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/[0.05]">
                        <p className="text-blue-500 text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {approvedCount}
                        </p>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">
                            Aprobados
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/[0.05]">
                        <p className="text-purple-500 text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {tokenizedCount}
                        </p>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">
                            Tokenizados
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/[0.05]">
                        <p className="text-green-500 text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {fundedCount}
                        </p>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">
                            En Fondeo
                        </p>
                    </div>
                </div>

                {/* Mobile Wallet Button */}
                {!address && (
                    <div className="md:hidden mb-6">
                        <button
                            onClick={() => connect()}
                            disabled={isConnecting}
                            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <Wallet className="w-5 h-5" />
                            {isConnecting ? "Conectando..." : "Conectar Wallet Empresa"}
                        </button>
                    </div>
                )}

                {/* Assets Table */}
                <div className="bg-slate-900/50 rounded-3xl border border-white/[0.05] overflow-hidden">
                    <div className="p-6 border-b border-white/[0.05]">
                        <h2 className="text-xl font-bold font-[family-name:var(--font-syne)]">
                            Activos Registrados
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Gestión de garantías y tokenización
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 text-left">Activo</th>
                                    <th className="px-6 py-4 text-left">Titular</th>
                                    <th className="px-6 py-4 text-left">Valor</th>
                                    <th className="px-6 py-4 text-left">Estado</th>
                                    <th className="px-6 py-4 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05]">
                                <AnimatePresence>
                                    {assets.map((asset) => (
                                        <motion.tr
                                            key={asset.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-orange-400">
                                                        {getIcon(asset.type)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">
                                                            {asset.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            ID: {asset.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-white">{asset.owner}</p>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    {asset.ownerWallet || asset.owner_wallet}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-white font-bold">
                                                    ${asset.value.toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(asset.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {asset.status === "pending_review" && (
                                                        <>
                                                            <button
                                                                onClick={() => setSelectedAsset(asset)}
                                                                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                                                                title="Ver documentos"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                <span className="text-sm font-bold">Ver Docs</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(asset.id)}
                                                                className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                                                                title="Rechazar"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {asset.status === "approved" && (
                                                        <button
                                                            onClick={() => handleTokenize(asset.id)}
                                                            disabled={isProcessing === asset.id || !address}
                                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {isProcessing === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Coins className="w-4 h-4" />
                                                            )}
                                                            Tokenizar
                                                        </button>
                                                    )}

                                                    {asset.status === "tokenized" && (
                                                        <button
                                                            onClick={() => handleCreateEscrow(asset.id)}
                                                            disabled={isProcessing === asset.id || !address}
                                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {isProcessing === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Rocket className="w-4 h-4" />
                                                            )}
                                                            Crear Escrow
                                                        </button>
                                                    )}

                                                    {asset.status === "funding_requested" && (
                                                        <button
                                                            onClick={() => handleSendFunds(asset.id)}
                                                            disabled={isProcessing === asset.id || !address}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {isProcessing === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                            Enviar Fondos
                                                        </button>
                                                    )}

                                                    {asset.status === "funded" && (
                                                        <span className="text-xs text-green-500 font-mono">
                                                            ✓ Completado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Cargando activos...</p>
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400">No hay activos registrados</p>
                        </div>
                    ) : null}
                </div>
            </main>

            {/* Modal para ver documentos */}
            <AnimatePresence>
                {selectedAsset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
                        onClick={() => setSelectedAsset(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-lg border border-white/[0.1] max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
                                        Documentación
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {selectedAsset.name} - {selectedAsset.owner}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedAsset(null)}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Documento de Seguro */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-slate-400">
                                            Seguro del Activo
                                        </span>
                                        {selectedAsset.documents?.insurance && (
                                            <a 
                                                href={selectedAsset.documents.insurance} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                                            >
                                                <Download className="w-4 h-4" /> Descargar
                                            </a>
                                        )}
                                    </div>
                                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden">
                                        {selectedAsset.documents?.insurance ? (
                                            <img 
                                                src={selectedAsset.documents.insurance} 
                                                alt="Seguro"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-600 text-sm">Error cargando imagen</span>';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-slate-600 text-sm">
                                                No hay documento de seguro
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Título de Propiedad */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-slate-400">
                                            Título de Propiedad
                                        </span>
                                        {selectedAsset.documents?.property && (
                                            <a 
                                                href={selectedAsset.documents.property} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                                            >
                                                <Download className="w-4 h-4" /> Descargar
                                            </a>
                                        )}
                                    </div>
                                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden">
                                        {selectedAsset.documents?.property ? (
                                            selectedAsset.documents.property.endsWith('.pdf') ? (
                                                <div className="text-center">
                                                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                                                    <span className="text-slate-500 text-sm">Documento PDF</span>
                                                    <a 
                                                        href={selectedAsset.documents.property}
                                                        target="_blank"
                                                        rel="noopener noreferrer" 
                                                        className="block text-orange-400 text-sm mt-1 hover:underline"
                                                    >
                                                        Ver documento
                                                    </a>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={selectedAsset.documents.property} 
                                                    alt="Título de Propiedad"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-600 text-sm">Error cargando imagen</span>';
                                                    }}
                                                />
                                            )
                                        ) : (
                                            <span className="text-slate-600 text-sm">
                                                No hay título de propiedad
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Checkbox de confirmación */}
                                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={docsReviewed.has(selectedAsset.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(docsReviewed);
                                                if (e.target.checked) {
                                                    newSet.add(selectedAsset.id);
                                                } else {
                                                    newSet.delete(selectedAsset.id);
                                                }
                                                setDocsReviewed(newSet);
                                            }}
                                            className="mt-1 w-5 h-5 accent-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">
                                            Confirmo que revisé todos los documentos y son válidos
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
                                <button
                                    onClick={() => {
                                        handleApprove(selectedAsset.id);
                                        setSelectedAsset(null);
                                        setDocsReviewed(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(selectedAsset.id);
                                            return newSet;
                                        });
                                    }}
                                    disabled={isProcessing === selectedAsset.id || !docsReviewed.has(selectedAsset.id)}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing === selectedAsset.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    Aprobar Activo
                                </button>
                                <button
                                    onClick={() => {
                                        handleReject(selectedAsset.id);
                                        setSelectedAsset(null);
                                    }}
                                    className="flex-1 bg-red-600/20 text-red-400 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
