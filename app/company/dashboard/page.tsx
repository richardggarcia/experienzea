"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
    useInitializeEscrow,
    useFundEscrow,
    useReleaseFunds,
    useSendTransaction,
    useGetEscrowsFromIndexerBySigner,
    useApproveMilestone,
} from "@trustless-work/escrow";
import * as freighterApi from "@stellar/freighter-api";
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
    Download,
    ShieldCheck
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

export default function CompanyDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { address, connect, disconnect, isConnecting } = useWallet();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [docsReviewed, setDocsReviewed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const { deployEscrow } = useInitializeEscrow();
    const { fundEscrow } = useFundEscrow();
    const { releaseFunds } = useReleaseFunds();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowsBySigner } = useGetEscrowsFromIndexerBySigner();
    const { approveMilestone } = useApproveMilestone();

    const usdcIssuer = process.env.NEXT_PUBLIC_USDC_ISSUER || "";
    const usdcSymbol = process.env.NEXT_PUBLIC_USDC_SYMBOL || "USDC";
    const testnetPassphrase = "Test SDF Network ; September 2015";

    const freighter = freighterApi.default ? freighterApi.default : freighterApi;

    const signAndSendXdr = async (unsignedXdr: string) => {
        const signed = await freighter.signTransaction(unsignedXdr, {
            networkPassphrase: testnetPassphrase,
        });

        const signedXdr =
            typeof signed === "string"
                ? signed
                : signed?.signedTxXdr;

        if (!signedXdr) {
            throw new Error("No se pudo firmar la transaccion");
        }

        return sendTransaction(signedXdr);
    };

    const waitForEscrowContractId = async (signer: string, engagementId: string) => {
        const attempts = 4;
        for (let i = 0; i < attempts; i += 1) {
            const escrows = await getEscrowsBySigner({
                signer,
                orderBy: "createdAt",
                orderDirection: "desc",
            });

            const match = escrows.find((escrow) => escrow.engagementId === engagementId);
            if (match?.contractId) {
                return match.contractId;
            }

            await new Promise((resolve) => setTimeout(resolve, 1200));
        }
        return "";
    };

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
            <div className="min-h-screen flex items-center justify-center bg-[#020617]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
                await fetchAssets();
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

    const handleCreateEscrow = async (asset: Asset) => {
        if (!address) {
            alert("Primero conectá la wallet de la empresa");
            return;
        }

        const borrowerWallet = asset.ownerWallet || asset.owner_wallet;
        if (!borrowerWallet) {
            alert("El solicitante no tiene wallet asociada");
            return;
        }

        if (!usdcIssuer) {
            alert("Falta configurar NEXT_PUBLIC_USDC_ISSUER en .env.local");
            return;
        }

        if (!process.env.NEXT_PUBLIC_TW_API_KEY) {
            alert("Falta configurar NEXT_PUBLIC_TW_API_KEY en .env.local");
            return;
        }

        setIsProcessing(asset.id);
        try {
            const payload = {
                signer: address,
                engagementId: asset.id,
                title: `Prestamo ${asset.name}`,
                roles: {
                    approver: address,
                    serviceProvider: borrowerWallet,
                    platformAddress: address,
                    releaseSigner: address,
                    disputeResolver: address,
                    receiver: borrowerWallet,
                },
                description: `Prestamo garantizado por ${asset.name}`,
                amount: asset.value,
                platformFee: 0,
                milestones: [{ description: "Desembolso del prestamo" }],
                trustline: {
                    symbol: usdcSymbol,
                    address: usdcIssuer,
                },
            };

            const response = await deployEscrow(payload, "single-release");

            if (response?.status === "FAILED") {
                console.error("Trustless Work: deployEscrow FAILED", response);
                throw new Error("Respuesta FAILED al crear escrow");
            }

            if (!response?.unsignedTransaction) {
                throw new Error("No se recibio la transaccion del escrow");
            }

            const sendResponse = await signAndSendXdr(response.unsignedTransaction);
            if (!sendResponse || sendResponse.status !== "SUCCESS") {
                console.error("Trustless Work: sendTransaction FAILED", sendResponse);
                throw new Error("No se pudo enviar la transaccion del escrow");
            }

            const contractId =
                (response as any).contractId ||
                (await waitForEscrowContractId(address, asset.id));
            if (!contractId) {
                throw new Error("No se recibio contractId del escrow");
            }

            const patchResponse = await fetch(`/api/assets/${asset.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "funding_requested",
                    contract_id: contractId,
                }),
            });

            if (patchResponse.ok) {
                await fetchAssets();
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error creando el escrow. Revisá la consola.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleSendFunds = async (asset: Asset) => {
        if (!address) {
            alert("Primero conectá la wallet de la empresa");
            return;
        }

        if (!asset.contractId && !asset.contract_id) {
            alert("Este activo no tiene escrow asociado");
            return;
        }

        if (!confirm("¿Confirmás el envío de fondos al solicitante? Esta acción fondea y libera USDC.")) {
            return;
        }

        setIsProcessing(asset.id);
        try {
            const contractId = asset.contractId || asset.contract_id || "";

            const fundResponse = await fundEscrow(
                {
                    amount: asset.value,
                    contractId,
                    signer: address,
                },
                "single-release"
            );

            if (fundResponse?.status === "FAILED") {
                console.error("Trustless Work: fundEscrow FAILED", fundResponse);
                throw new Error("Respuesta FAILED al fondear escrow");
            }

            if (!fundResponse?.unsignedTransaction) {
                throw new Error("No se recibio la transaccion de fondeo");
            }

            const fundSend = await signAndSendXdr(fundResponse.unsignedTransaction);
            if (!fundSend || fundSend.status !== "SUCCESS") {
                console.error("Trustless Work: sendTransaction (fund) FAILED", fundSend);
                throw new Error("No se pudo enviar la transaccion de fondeo");
            }

            const approveResponse = await approveMilestone(
                {
                    contractId,
                    milestoneIndex: "0",
                    approver: address,
                },
                "single-release"
            );

            if (approveResponse?.status === "FAILED") {
                console.error("Trustless Work: approveMilestone FAILED", approveResponse);
                throw new Error("Respuesta FAILED al aprobar milestone");
            }

            if (!approveResponse?.unsignedTransaction) {
                throw new Error("No se recibio la transaccion de aprobacion");
            }

            const approveSend = await signAndSendXdr(approveResponse.unsignedTransaction);
            if (!approveSend || approveSend.status !== "SUCCESS") {
                console.error("Trustless Work: sendTransaction (approve) FAILED", approveSend);
                throw new Error("No se pudo enviar la transaccion de aprobacion");
            }

            const releaseResponse = await releaseFunds(
                {
                    contractId,
                    releaseSigner: address,
                },
                "single-release"
            );

            if (releaseResponse?.status === "FAILED") {
                console.error("Trustless Work: releaseFunds FAILED", releaseResponse);
                throw new Error("Respuesta FAILED al liberar fondos");
            }

            if (!releaseResponse?.unsignedTransaction) {
                throw new Error("No se recibio la transaccion de liberacion");
            }

            const releaseSend = await signAndSendXdr(releaseResponse.unsignedTransaction);
            if (!releaseSend || releaseSend.status !== "SUCCESS") {
                console.error("Trustless Work: sendTransaction (release) FAILED", releaseSend);
                throw new Error("No se pudo enviar la transaccion de liberacion");
            }

            const response = await fetch(`/api/assets/${asset.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "funded",
                }),
            });
            if (response.ok) {
                await fetchAssets();
                alert("✅ Fondos enviados correctamente al solicitante");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error enviando fondos. Revisá la consola.");
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
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" /> PENDIENTE
                    </div>
                );
            case "approved":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> APROBADO
                    </div>
                );
            case "tokenized":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-500 border-purple-500/20 flex items-center gap-1 w-fit">
                        <Coins className="w-3 h-3" /> TOKENIZADO
                    </div>
                );
            case "funding_requested":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1 w-fit">
                        <Rocket className="w-3 h-3" /> ESCROW CREADO
                    </div>
                );
            case "funded":
                return (
                    <div className="px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                    </div>
                );
        }
    };

    const pendingCount = assets.filter((a) => a.status === "pending_review").length;
    const approvedCount = assets.filter((a) => a.status === "approved").length;
    const tokenizedCount = assets.filter((a) => a.status === "tokenized").length;
    const fundedCount = assets.filter((a) => a.status === "funding_requested" || a.status === "funded").length;

    // Componente de acciones reutilizable para tabla y cards
    const AssetActions = ({ asset }: { asset: Asset }) => (
        <div className="flex flex-wrap items-center gap-2">
            {asset.status === "pending_review" && (
                <>
                    <button
                        onClick={() => setSelectedAsset(asset)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        title="Ver documentos"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-bold">Ver Docs</span>
                    </button>
                    <button
                        onClick={() => handleReject(asset.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors"
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
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    onClick={() => handleCreateEscrow(asset)}
                    disabled={isProcessing === asset.id || !address}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-bold text-sm hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    onClick={() => handleSendFunds(asset)}
                    disabled={isProcessing === asset.id || !address}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg font-bold text-sm hover:from-green-500 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <span className="text-xs text-green-500 font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completado
                </span>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-slate-50 relative overflow-hidden font-sans">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.03] blur-[150px] rounded-full pointer-events-none"></div>

            {/* Header */}
            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/[0.05] px-4 md:px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.3)] shrink-0">
                            E
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center md:gap-2 leading-tight">
                            <span className="text-lg md:text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">
                                ExperienZea
                            </span>
                            <span className="text-slate-500 text-xs md:text-sm hidden md:inline">
                                | Panel de Control
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Wallet de la Empresa */}
                        {address ? (
                            <span className="flex items-center gap-2 text-[10px] md:text-xs bg-green-500/10 text-green-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-green-500/20">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                                {address.substring(0, 4)}...{address.substring(address.length - 4)}
                            </span>
                        ) : (
                            <button
                                onClick={() => connect()}
                                disabled={isConnecting}
                                className="flex items-center gap-2 text-[10px] md:text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                            >
                                <Wallet className="w-3 h-3" />
                                {isConnecting ? "..." : "Conectar"}
                            </button>
                        )}

                        {/* User menu */}
                        <div className="flex items-center gap-2 border-l border-slate-800 pl-2 md:pl-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-white truncate max-w-[120px]">
                                    {session.user?.name}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin</p>
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

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.05] group hover:border-blue-500/20 transition-all">
                        <p className="text-yellow-500 text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {pendingCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            Pendientes
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.05] group hover:border-blue-500/20 transition-all">
                        <p className="text-blue-500 text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {approvedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            Aprobados
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.05] group hover:border-blue-500/20 transition-all">
                        <p className="text-purple-500 text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {tokenizedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            Tokenizados
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.05] group hover:border-blue-500/20 transition-all">
                        <p className="text-green-500 text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)]">
                            {fundedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            En Fondeo
                        </p>
                    </div>
                </div>

                {/* Assets Section */}
                <div className="bg-slate-900/50 rounded-[2rem] border border-white/[0.05] overflow-hidden">
                    <div className="p-6 border-b border-white/[0.05]">
                        <h2 className="text-xl font-bold font-[family-name:var(--font-syne)] text-white">
                            Activos Registrados
                        </h2>
                        <p className="text-slate-500 text-sm mt-1 font-[family-name:var(--font-manrope)]">
                            Gestión de garantías y tokenización
                        </p>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Cargando activos...</p>
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400">No hay activos registrados</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-medium">Activo</th>
                                            <th className="px-6 py-4 text-left font-medium">Titular</th>
                                            <th className="px-6 py-4 text-left font-medium">Valor</th>
                                            <th className="px-6 py-4 text-left font-medium">Estado</th>
                                            <th className="px-6 py-4 text-left font-medium">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.05]">
                                        <AnimatePresence>
                                            {assets.map((asset) => (
                                                <motion.tr
                                                    key={asset.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 border border-transparent group-hover:border-blue-500/30 transition-all">
                                                                {getIcon(asset.type)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm">
                                                                    {asset.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-mono">
                                                                    ID: {asset.id.slice(0, 8)}...
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm">{asset.owner}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">
                                                            {(asset.ownerWallet || asset.owner_wallet || "").slice(0, 6)}...
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white font-bold font-mono">
                                                            ${asset.value.toLocaleString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(asset.status)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <AssetActions asset={asset} />
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-4">
                                <AnimatePresence>
                                    {assets.map((asset) => (
                                        <motion.div
                                            key={asset.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-slate-900 border border-white/[0.05] rounded-2xl p-5 shadow-lg relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400">
                                                        {getIcon(asset.type)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white">{asset.name}</h3>
                                                        <p className="text-xs text-slate-500">{asset.owner}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">
                                                        ${asset.value.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-4 border-t border-white/[0.05] pt-4">
                                                {getStatusBadge(asset.status)}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <AssetActions asset={asset} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Modal para ver documentos */}
            <AnimatePresence>
                {selectedAsset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4"
                        onClick={() => setSelectedAsset(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 p-6 md:p-8 rounded-[2rem] w-full max-w-lg border border-white/[0.1] max-h-[90vh] overflow-y-auto shadow-2xl relative"
                        >
                            <div className="flex justify-between items-start mb-6 sticky top-0 bg-slate-900 z-10 py-2 border-b border-white/[0.05]">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
                                        Documentación
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {selectedAsset.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedAsset(null)}
                                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 pb-6">
                                {/* Documento de Seguro */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-colors hover:border-blue-500/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-blue-400" /> Seguro
                                        </span>
                                        {selectedAsset.documents?.insurance && (
                                            <a
                                                href={selectedAsset.documents.insurance}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-bold uppercase tracking-wider"
                                            >
                                                <Download className="w-3 h-3" /> Descargar
                                            </a>
                                        )}
                                    </div>
                                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden relative group">
                                        {selectedAsset.documents?.insurance ? (
                                            <img
                                                src={selectedAsset.documents.insurance}
                                                alt="Seguro"
                                                className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-600 text-sm">Error visualizando</span>';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-slate-600 text-sm">
                                                No hay documento
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Título de Propiedad */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-colors hover:border-blue-500/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-400" /> Título
                                        </span>
                                        {selectedAsset.documents?.property && (
                                            <a
                                                href={selectedAsset.documents.property}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-bold uppercase tracking-wider"
                                            >
                                                <Download className="w-3 h-3" /> Descargar
                                            </a>
                                        )}
                                    </div>
                                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden relative group">
                                        {selectedAsset.documents?.property ? (
                                            selectedAsset.documents.property.endsWith('.pdf') ? (
                                                <div className="text-center group-hover:scale-105 transition-transform">
                                                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                                                    <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">PDF Document</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={selectedAsset.documents.property}
                                                    alt="Título"
                                                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-600 text-sm">Error visualizando</span>';
                                                    }}
                                                />
                                            )
                                        ) : (
                                            <span className="text-slate-600 text-sm">
                                                No hay documento
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Checkbox de confirmación */}
                                <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
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
                                            className="mt-1 w-5 h-5 accent-blue-500 bg-slate-800 border-slate-600 rounded"
                                        />
                                        <span className="text-sm text-blue-100 font-medium leading-relaxed">
                                            Confirmo que he verificado la autenticidad de estos documentos.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-6 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-10 pb-2">
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
                                    className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
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
                                    className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-xl font-bold hover:bg-red-500/20 transition-colors border border-red-500/20"
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
