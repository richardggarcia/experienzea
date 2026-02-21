"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
    useChangeMilestoneStatus,
    useSendTransaction,
    useGetEscrowFromIndexerByContractIds,
} from "@trustless-work/escrow";
import * as freighterApi from "@stellar/freighter-api";
import { v4 as uuidv4 } from "uuid";
import { Rocket, LogOut, Loader2, ArrowLeft, Plus, CheckCircle2, ShieldCheck, Tractor, Building2, Car, Coins, Check, X, AlertCircle, FileText, Upload, Pencil, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import KYCModal from "@/components/KYCModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    buildEscrowActionOwnerMap,
    buildEscrowGroupsByLeaderId,
} from "@/lib/escrowGrouping";

interface Asset {
    id: string;
    type: 'vehiculo' | 'inmueble' | 'maquinaria' | 'otro';
    name: string;
    value: number;
    owner: string;
    owner_wallet?: string;
    ownerWallet?: string;
    status: 'pending_review' | 'approved' | 'tokenized' | 'funding_requested' | 'funded';
    contract_id?: string;
    contractId?: string;
    documents?: {
        insurance?: string;
        property?: string;
    };
    created_at?: string;
}

interface LoanRequest {
    id: string;
    borrower_wallet: string;
    borrower_name?: string;
    amount_requested: number;
    collateral_value: number;
    ltv_ratio: number;
    asset_ids: string[];
    status: "pending" | "approved" | "escrow_created" | "funded";
    contract_id?: string;
    created_at?: string;
}

export default function Dashboard() {
    const { address, connect, isConnecting, disconnect } = useWallet();
    const router = useRouter();

    // State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [kycComplete, setKycComplete] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'garantias' | 'prestamos' | 'perfil'>('garantias');
    const [tempAssetId, setTempAssetId] = useState<string>("");
    const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
    const [termsModalState, setTermsModalState] = useState<{
        open: boolean;
        asset: Asset | null;
        accepted: boolean;
    }>({
        open: false,
        asset: null,
        accepted: false,
    });
    const [modalState, setModalState] = useState({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Aceptar",
    });
    const modalResolverRef = useRef<((value: boolean) => void) | null>(null);

    const { changeMilestoneStatus } = useChangeMilestoneStatus();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();

    const testnetPassphrase = "Test SDF Network ; September 2015";
    const freighter = freighterApi.default ? freighterApi.default : freighterApi;

    // 💰 Balance de USDC de la wallet
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const usdcIssuer = process.env.NEXT_PUBLIC_USDC_ISSUER || "";
    const usdcSymbol = process.env.NEXT_PUBLIC_USDC_SYMBOL || "USDC";

    // Función para obtener balance USDC de la wallet
    const fetchWalletBalance = async (walletAddress: string) => {
        if (!walletAddress || !usdcIssuer) return;

        try {
            const response = await fetch(
                `https://horizon-testnet.stellar.org/accounts/${walletAddress}`
            );

            if (!response.ok) return;

            const data = await response.json();
            const usdcBalance = data.balances?.find((b: any) =>
                b.asset_type === "credit_alphanum4" &&
                b.asset_code === usdcSymbol &&
                b.asset_issuer === usdcIssuer
            );

            setWalletBalance(usdcBalance ? parseFloat(usdcBalance.balance) : 0);
        } catch (error) {
            console.error("Error obteniendo balance:", error);
        }
    };

    // Actualizar balance cuando cambia la wallet
    useEffect(() => {
        if (address) fetchWalletBalance(address);
    }, [address]);

    // Actualizar balance cada 10 segundos
    useEffect(() => {
        if (!address) return;
        const interval = setInterval(() => fetchWalletBalance(address), 10000);
        return () => clearInterval(interval);
    }, [address]);

    const showAlert = (message: string, title = "Aviso") => {
        setModalState({
            open: true,
            title,
            message,
            confirmLabel: "Aceptar",
        });
    };

    // Cargar assets desde Supabase (filtrados por wallet del usuario)
    useEffect(() => {
        if (address && kycComplete) {
            fetchAssets();
            fetchLoanRequests();
        }
    }, [address, kycComplete]);

    // 🔄 Polling automático cada 5 segundos para escrows en funding_requested
    useEffect(() => {
        if (!address || !kycComplete) return;

        const hasPendingEscrows = assets.some(a => a.status === 'funding_requested');
        if (!hasPendingEscrows) return;

        console.log("🔄 Iniciando polling para escrows pendientes...");
        const interval = setInterval(() => {
            console.log("🔄 Polling: actualizando estado de milestones...");
            fetchAssets();
        }, 5000);

        return () => clearInterval(interval);
    }, [address, assets, kycComplete]);

    // Cargar datos del usuario una vez que completa el KYC
    useEffect(() => {
        if (address && kycComplete) {
            const fetchProfile = async () => {
                try {
                    const res = await fetch(`/api/profile?wallet=${address}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.profile) {
                            setUserProfile(data.profile);
                            setNewAsset(prev => ({
                                ...prev,
                                owner: data.profile.full_name || ''
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Error fetching user profile data", err);
                }
            };
            fetchProfile();
        }
    }, [address, kycComplete]);

    const loadMilestoneStates = async (items: Asset[]) => {
        const contractIds = items
            .map((asset) => asset.contractId || asset.contract_id)
            .filter((id): id is string => Boolean(id));

        if (contractIds.length === 0) return;

        try {
            const escrows = await getEscrowByContractIds({
                contractIds,
                validateOnChain: false,
            });

            const completed = new Set<string>();
            items.forEach((asset) => {
                const contractId = asset.contractId || asset.contract_id;
                if (!contractId) return;

                const escrowInfo = escrows.find((escrow) => escrow.contractId === contractId);
                const milestone = (escrowInfo?.milestones || [])[0] as
                    | { status?: string; approved?: boolean }
                    | undefined;

                if (milestone?.status === "completed" || milestone?.approved) {
                    completed.add(asset.id);
                }
            });

            setCompletedMilestones(completed);
        } catch (error) {
            console.error("Error fetching milestone state:", error);
        }
    };

    const fetchAssets = async () => {
        if (!address) return;

        try {
            const response = await fetch('/api/assets');
            if (response.ok) {
                const data = await response.json();
                // Filtrar solo los activos de ESTA wallet
                const myAssets = data.filter((asset: Asset) =>
                    asset.owner_wallet === address || asset.ownerWallet === address
                );
                setAssets(myAssets);
                await loadMilestoneStates(myAssets);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLoanRequests = async () => {
        if (!address) return;
        try {
            const response = await fetch(`/api/loan-requests?wallet=${address}`);
            if (!response.ok) return;
            const data = await response.json();
            setLoanRequests(data || []);
        } catch (error) {
            console.error("Error fetching loan requests:", error);
        }
    };

    // Form State
    const [newAsset, setNewAsset] = useState<{
        type: 'vehiculo' | 'inmueble' | 'maquinaria' | 'otro',
        name: string,
        value: string,
        owner: string,
        legalCheck: boolean,
        insuranceDoc?: string,
        propertyDoc?: string
    }>({
        type: 'vehiculo',
        name: '',
        value: '',
        owner: '',
        legalCheck: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcess, setIsProcess] = useState<string | null>(null);
    const [isDeletingAssetId, setIsDeletingAssetId] = useState<string | null>(null);

    // Loan Simulator State
    const [loanAmount, setLoanAmount] = useState<number>(0);
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
    const collateralEligibleAssets = assets.filter(
        (a) => a.status === "tokenized" || a.status === "funded"
    );
    const selectedAssets = collateralEligibleAssets.filter(a => selectedAssetIds.has(a.id));
    const totalAssetValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
    const committedAmountOnSelection = useMemo(() => {
        if (selectedAssetIds.size === 0) return 0;
        return loanRequests
            .filter((loan) => ["pending", "approved", "escrow_created", "funded"].includes(loan.status))
            .filter((loan) => (loan.asset_ids || []).some((id) => selectedAssetIds.has(id)))
            .reduce((sum, loan) => sum + (loan.amount_requested || 0), 0);
    }, [loanRequests, selectedAssetIds]);
    const grossCreditLimit = totalAssetValue * 0.7;
    const maxCreditLimitRaw = Math.max(0, grossCreditLimit - committedAmountOnSelection); // 70% LTV menos comprometido
    const maxCreditLimit = Math.floor(maxCreditLimitRaw);
    const tokenizedOnlyValue = assets
        .filter((a) => a.status === "tokenized")
        .reduce((sum, asset) => sum + asset.value, 0);
    const liquidityAvailableToday = Math.floor(tokenizedOnlyValue * 0.7);
    const totalBackedValue = assets
        .filter((a) => a.status === "tokenized" || a.status === "funding_requested" || a.status === "funded")
        .reduce((sum, asset) => sum + asset.value, 0);
    const pendingReviewAssets = assets.filter((a) => a.status === "pending_review");
    const pendingReviewValue = pendingReviewAssets.reduce((sum, asset) => sum + asset.value, 0);
    const liquidatedAmount = loanRequests
        .filter((loan) => loan.status === "funded")
        .reduce((sum, loan) => sum + (loan.amount_requested || 0), 0);
    const escrowActionOwnerByAssetId = useMemo(
        () => buildEscrowActionOwnerMap(assets),
        [assets]
    );
    const escrowGroupedAssetsByLeaderId = useMemo(
        () => buildEscrowGroupsByLeaderId(assets),
        [assets]
    );
    const escrowLeaderByContractId = useMemo(() => {
        const map = new Map<string, Asset>();
        escrowGroupedAssetsByLeaderId.forEach((group, leaderId) => {
            const leader = group.find((item) => item.id === leaderId) || group[0];
            const contractId = leader?.contractId || leader?.contract_id;
            if (leader && contractId) {
                map.set(contractId, leader);
            }
        });
        return map;
    }, [escrowGroupedAssetsByLeaderId]);
    const loanRequestByContractId = useMemo(() => {
        const map = new Map<string, LoanRequest>();
        loanRequests.forEach((loan) => {
            if (loan.contract_id) {
                map.set(loan.contract_id, loan);
            }
        });
        return map;
    }, [loanRequests]);
    const loanAmountByAssetId = useMemo(() => {
        const map = new Map<string, number>();
        loanRequests.forEach((loan) => {
            loan.asset_ids.forEach((assetId) => {
                map.set(assetId, loan.amount_requested);
            });
        });
        return map;
    }, [loanRequests]);

    const toggleAssetSelection = (assetId: string) => {
        setSelectedAssetIds(prev => {
            const next = new Set(prev);
            if (next.has(assetId)) next.delete(assetId);
            else next.add(assetId);
            return next;
        });
        setLoanAmount(0); // Reset loan amount when selection changes
    };

    const toggleAllAssets = () => {
        if (selectedAssetIds.size === collateralEligibleAssets.length) {
            setSelectedAssetIds(new Set());
        } else {
            setSelectedAssetIds(new Set(collateralEligibleAssets.map(a => a.id)));
        }
        setLoanAmount(0);
    };

    // Helper functions for formatting
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };

    const signAndSendXdr = async (unsignedXdr: string) => {
        const signed = await freighter.signTransaction(unsignedXdr, {
            networkPassphrase: testnetPassphrase,
        });

        const signedAny = signed as { signedTxXdr?: string; signedXDR?: string; xdr?: string };
        const signedXdr = typeof signed === "string" ? signed : signedAny.signedTxXdr || signedAny.signedXDR || signedAny.xdr;

        if (!signedXdr) {
            throw new Error("No se pudo firmar la transacción");
        }

        return sendTransaction(signedXdr);
    };

    // --- EDICIÓN DE GARANTÍAS ---
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; value: string }>({ name: '', value: '' });

    const handleStartEdit = (asset: Asset) => {
        setEditingAssetId(asset.id);
        setEditForm({ name: asset.name, value: String(asset.value) });
    };

    const handleCancelEdit = () => {
        setEditingAssetId(null);
        setEditForm({ name: '', value: '' });
    };

    const handleUpdateAsset = async (assetId: string) => {
        if (!editForm.name.trim() || !editForm.value.trim()) {
            showAlert("Nombre y valor son obligatorios.");
            return;
        }
        try {
            const res = await fetch(`/api/assets/${assetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    value: Number(editForm.value),
                }),
            });
            if (!res.ok) throw new Error('Error actualizando');
            const updated = await res.json();
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updated } : a));
            setEditingAssetId(null);
            showAlert("Garantía actualizada correctamente.", "Actualización");
        } catch (err) {
            console.error(err);
            showAlert("No se pudo actualizar la garantía.");
        }
    };


    // Authentication Check
    if (isConnecting) return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    if (!address) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 text-slate-50 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.05] blur-[150px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 opacity-[0.1] blur-[120px] rounded-full pointer-events-none"></div>

                <div className="bg-[#0b1021] p-10 md:p-12 rounded-[2.5rem] shadow-2xl max-w-[500px] w-full mx-4 border border-white/[0.05] text-center relative z-10 transition-all hover:border-blue-500/20 hover:shadow-[0_0_40px_rgba(37,99,235,0.1)]">
                    <button
                        onClick={() => router.push("/")}
                        className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-white/[0.02] hover:bg-white/[0.05] rounded-full p-2"
                        title="Cerrar y volver"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-5 font-[family-name:var(--font-syne)] text-white tracking-tight">Conectá tu wallet...</h1>
                    <p className="text-slate-400 mb-10 leading-relaxed font-[family-name:var(--font-manrope)] text-sm md:text-base px-2">
                        Para gestionar tus activos y acceder a liquidez global, conectá tu billetera Freighter.
                    </p>

                    <div className="space-y-4 px-2">
                        <button
                            onClick={() => connect()}
                            className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-base hover:bg-blue-500 hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] flex justify-center items-center gap-3"
                        >
                            <ShieldCheck className="w-5 h-5" />
                            Conectar Freighter
                        </button>

                        <button
                            onClick={() => router.push("/")}
                            className="w-full text-sm text-slate-500 hover:text-white font-bold py-3 transition-colors flex items-center justify-center gap-2"
                        >
                            Volver al inicio <ArrowLeft className="w-4 h-4 rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Handlers
    const handleSubmitForReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAsset.legalCheck) return showAlert("Debes aceptar la declaración jurada.");
        if (!newAsset.insuranceDoc) return showAlert("Debes subir el seguro del activo.");
        if (!newAsset.propertyDoc) return showAlert("Debes subir el título de propiedad.");

        setIsSubmitting(true);
        // Guardar en Supabase
        try {
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: tempAssetId,
                    type: newAsset.type,
                    name: newAsset.name,
                    value: Number(newAsset.value),
                    owner: newAsset.owner,
                    owner_wallet: address,
                    documents: {
                        insurance: newAsset.insuranceDoc,
                        property: newAsset.propertyDoc
                    }
                })
            });

            if (!response.ok) throw new Error('Error guardando asset');

            const createdAsset = await response.json();

            // Guardar perfil del usuario en localStorage para autocompletar próximos préstamos
            if (address && typeof window !== 'undefined') {
                localStorage.setItem(`user_profile_${address}`, JSON.stringify({
                    name: newAsset.owner,
                    wallet: address
                }));
            }

            setAssets([...assets, createdAsset]);
            setIsSubmitting(false);
            setShowForm(false);
            setTempAssetId("");
            // Mantener el nombre del owner para la próxima carga
            setNewAsset({ type: 'vehiculo', name: '', value: '', owner: newAsset.owner, legalCheck: false });
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error guardando el activo. Intentá de nuevo.');
            setIsSubmitting(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'maquinaria': return <Tractor className="w-8 h-8" />;
            case 'inmueble': return <Building2 className="w-8 h-8" />;
            case 'vehiculo': return <Car className="w-8 h-8" />;
            default: return <FileText className="w-8 h-8" />;
        }
    };

    const getStatusBadge = (status: Asset['status']) => {
        switch (status) {
            case 'pending_review': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> EN REVISIÓN</div>;
            case 'approved': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> APROBADO</div>;
            case 'tokenized': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-500 border-purple-500/20 flex items-center gap-1"><Coins className="w-3 h-3" /> TOKENIZADO</div>;
            case 'funding_requested': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 flex items-center gap-1"><Rocket className="w-3 h-3" /> ESCROW CREADO</div>;
            case 'funded': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> COMPLETADO</div>;
        }
    }

    const isEscrowActionOwner = (asset: Asset) => {
        const contractId = asset.contractId || asset.contract_id;
        if (!contractId) return true;
        return escrowActionOwnerByAssetId.get(asset.id) ?? true;
    };

    const getLoanAmountForAsset = (asset: Asset) => {
        const contractId = asset.contractId || asset.contract_id;
        if (contractId) {
            const contractLoan = loanRequestByContractId.get(contractId);
            if (contractLoan?.amount_requested) {
                return contractLoan.amount_requested;
            }
        }
        return loanAmountByAssetId.get(asset.id) ?? asset.value;
    };

    const getCollateralTotalForAsset = (asset: Asset) => {
        const grouped = escrowGroupedAssetsByLeaderId.get(asset.id);
        if (grouped && grouped.length > 0) {
            return grouped.reduce((sum, item) => sum + item.value, 0);
        }
        return asset.value;
    };

    const getCollateralNamesForAsset = (asset: Asset) => {
        const grouped = escrowGroupedAssetsByLeaderId.get(asset.id);
        if (grouped && grouped.length > 0) {
            return grouped.map((item) => item.name).join(", ");
        }
        return asset.name;
    };
    const getEscrowLeaderAsset = (asset: Asset) => {
        const contractId = asset.contractId || asset.contract_id;
        if (!contractId) return null;
        return escrowLeaderByContractId.get(contractId) || null;
    };

    const handleFirmarAcuerdo = async (asset: Asset, attempt = 1) => {
        if (!address) return;
        if (!asset.contractId && !asset.contract_id) {
            showAlert("Este activo no tiene escrow asociado");
            return;
        }

        setIsProcess(asset.id);
        try {
            const contractId = asset.contractId || asset.contract_id || "";
            const [escrowInfo] = await getEscrowByContractIds({
                contractIds: [contractId],
                validateOnChain: false,
            });

            const serviceProviderAddress = escrowInfo?.roles?.serviceProvider;
            if (serviceProviderAddress && serviceProviderAddress !== address) {
                showAlert("Esta wallet no es el service provider del escrow");
                return;
            }

            // 🎯 Verificar si el milestone ya está completado
            const milestone = escrowInfo?.milestones?.[0] as any;
            if (milestone?.status === "completed" || milestone?.approved) {
                console.log("✅ Acuerdo ya estaba firmado");
                setCompletedMilestones((prev) => new Set(prev).add(asset.id));
                showAlert("✅ Acuerdo ya firmado", "Listo");
                return;
            }

            const response = await changeMilestoneStatus(
                {
                    contractId,
                    milestoneIndex: "0",
                    newStatus: "completed",
                    newEvidence: "",
                    serviceProvider: address,
                },
                "single-release"
            );

            // 🔄 Manejar "already completed" como éxito
            if (response?.status === "FAILED") {
                const errorMsg = JSON.stringify(response);
                if (errorMsg.includes("already") || errorMsg.includes("completed")) {
                    console.log("⚠️ Milestone ya completado (API), marcando como éxito...");
                    setCompletedMilestones((prev) => new Set(prev).add(asset.id));
                    showAlert("✅ Acuerdo ya firmado", "Listo");
                    return;
                }
                throw new Error("Error en changeMilestoneStatus: " + errorMsg);
            }

            if (!response?.unsignedTransaction) {
                throw new Error("No se recibió la transacción de milestone");
            }

            const sendResponse: any = await signAndSendXdr(response.unsignedTransaction);
            if (!sendResponse || sendResponse.status !== "SUCCESS") {
                throw new Error("No se pudo enviar la transacción del milestone");
            }

            setCompletedMilestones((prev) => new Set(prev).add(asset.id));
            showAlert("✅ Acuerdo firmado correctamente", "Listo");
        } catch (error: any) {
            const MAX_RETRIES = 2;
            const errorMsg = error?.message || "";

            // 🔄 Si es "already completed", tratar como éxito
            if (errorMsg.includes("already") || errorMsg.includes("completed")) {
                console.log("⚠️ Milestone ya completado (catch)");
                setCompletedMilestones((prev) => new Set(prev).add(asset.id));
                showAlert("✅ Acuerdo ya firmado", "Listo");
            }
            // 🔄 Auto-retry para otros errores
            else if (attempt < MAX_RETRIES) {
                console.log(`🔄 Reintentando firma (${attempt + 1}/${MAX_RETRIES})...`);
                setIsProcess(null);
                await new Promise(resolve => setTimeout(resolve, 1500));
                return handleFirmarAcuerdo(asset, attempt + 1);
            } else {
                console.error("Error:", error);
                showAlert("Error marcando el milestone después de varios intentos. Revisá la consola.");
            }
        } finally {
            setIsProcess(null);
        }
    };

    const handleDeleteAssetCard = async (assetId: string) => {
        setIsDeletingAssetId(assetId);
        try {
            const response = await fetch(`/api/assets/${assetId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("No se pudo borrar la garantía");
            }

            setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
            setSelectedAssetIds((prev) => {
                const next = new Set(prev);
                next.delete(assetId);
                return next;
            });
            setCompletedMilestones((prev) => {
                const next = new Set(prev);
                next.delete(assetId);
                return next;
            });
            showAlert("Garantía eliminada del tablero.", "Listo");
        } catch (error) {
            console.error("Error deleting asset:", error);
            showAlert("No se pudo borrar la garantía.");
        } finally {
            setIsDeletingAssetId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-50 relative overflow-hidden">
            <KYCModal address={address} onComplete={() => setKycComplete(true)} />
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.03] blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 opacity-[0.05] blur-[120px] rounded-full pointer-events-none"></div>

            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/[0.05] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.3)]">E</div>
                    <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">ExperienZea <span className="text-slate-500 font-normal text-base block md:inline font-[family-name:var(--font-manrope)]">| Dashboard</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveTab('perfil')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-950 font-bold font-[family-name:var(--font-syne)] transition-transform hover:scale-105 ${activeTab === 'perfil' ? 'bg-white' : 'bg-emerald-400'}`}
                        title="Ver Mi Perfil"
                    >
                        {userProfile?.full_name?.charAt(0) || 'P'}
                    </button>
                    <span className="hidden md:flex items-center gap-2 text-xs bg-slate-800/50 text-slate-300 px-4 py-2.5 rounded-full font-mono border border-white/[0.05]">
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                        {address.substring(0, 4)}...{address.substring(address.length - 4)}
                    </span>
                    <button onClick={() => { disconnect(); router.push("/"); }} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-colors" title="Desconectar">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                {activeTab !== 'perfil' && (
                    <>
                        {/* Header Tabs & Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter font-[family-name:var(--font-syne)] flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveTab('garantias')}
                                            className={`transition-all ${activeTab === 'garantias' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Mis <span className={activeTab === 'garantias' ? 'text-blue-500' : 'text-slate-600'}>Garantías</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('prestamos')}
                                            className={`text-2xl md:text-3xl font-bold px-4 py-2 rounded-xl transition-all ${activeTab === 'prestamos' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            mis préstamos
                                        </button>
                                    </h1>
                                </div>
                                <p className="text-slate-400 text-lg font-[family-name:var(--font-manrope)]">
                                    {activeTab === 'garantias'
                                        ? "Subí tu documentación y esperá la aprobación para tokenizar."
                                        : "Solicitá liquidez usando tus garantías aprobadas como respaldo."}
                                </p>
                            </div>

                            {activeTab === 'garantias' && (
                                <button
                                    onClick={() => {
                                        setTempAssetId(uuidv4());
                                        setShowForm(true);
                                    }}
                                    className="bg-white text-slate-900 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all hover:scale-105"
                                >
                                    <Plus className="w-5 h-5" /> Cargar Garantía
                                </button>
                            )}
                        </div>

                        {/* Stats - Shared between Garantias and Prestamos */}
                        <div className="grid md:grid-cols-4 gap-6 mb-12">
                            <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
                                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">LIQUIDEZ DISPONIBLE</p>
                                <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
                                    ${liquidityAvailableToday.toLocaleString()}
                                    <span className="text-lg text-slate-500 font-normal font-[family-name:var(--font-manrope)] ml-2">USDC</span>
                                </p>
                                <p className="text-xs text-slate-500">Cupo hoy (70% sobre garantías tokenizadas)</p>
                                <p className="text-[11px] text-slate-600 mt-1">
                                    Saldo wallet: {walletBalance !== null ? `$${walletBalance.toLocaleString()}` : "$0.00"}
                                </p>
                            </div>
                            <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
                                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">VALOR RESPALDADO</p>
                                <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
                                    ${totalBackedValue.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">Tokenizado + escrow creado + acreditado</p>
                            </div>
                            <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
                                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">CRÉDITO ACREDITADO</p>
                                <p className="text-4xl font-bold text-emerald-400 mb-1 font-[family-name:var(--font-syne)]">
                                    ${liquidatedAmount.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">Préstamos desembolsados al solicitante</p>
                            </div>
                            <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
                                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">EN REVISIÓN</p>
                                <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
                                    ${pendingReviewValue.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">({pendingReviewAssets.length} garantía(s))</p>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB CONTENT WITHOUT MOTION TO AVOID LOADING EFFECTS */}

                {/* 1. TAB: MIS GARANTÍAS */}
                {activeTab === 'garantias' && (
                    <div className="grid md:grid-cols-3 gap-8 pb-32 relative">
                        {assets
                            .filter((asset) => {
                                if (asset.status !== "funding_requested" && asset.status !== "funded") {
                                    return true;
                                }
                                const contractId = asset.contractId || asset.contract_id;
                                if (!contractId) return true;
                                return isEscrowActionOwner(asset);
                            })
                            .map(asset => (
                                (() => {
                                    const isUnifiedLeader =
                                        (asset.status === "funding_requested" || asset.status === "funded") &&
                                        isEscrowActionOwner(asset) &&
                                        (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1;
                                    return (
                                        <div
                                            key={asset.id}
                                            className={`bg-[#0b1021] p-6 rounded-[2.5rem] shadow-xl border border-white/[0.05] relative overflow-hidden group hover:shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:border-blue-500/30 transition-all duration-300 ${isUnifiedLeader ? "md:col-span-3" : ""
                                                }`}
                                        >
                                            {isUnifiedLeader && (
                                                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                                                    <Coins className="w-3 h-3" />
                                                    Préstamo unificado · {(escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0)} garantías
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                                                    {getIcon(asset.type)}
                                                </div>
                                                {getStatusBadge(asset.status)}
                                            </div>

                                            {editingAssetId === asset.id ? (
                                                <div className="space-y-3 mb-6">
                                                    <div>
                                                        <label className="text-xs text-slate-500 mb-1 block">Nombre / Modelo</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.name}
                                                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-500 mb-1 block">Valor Estimado (USD)</label>
                                                        <input
                                                            type="number"
                                                            value={editForm.value}
                                                            onChange={e => setEditForm(prev => ({ ...prev, value: e.target.value }))}
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateAsset(asset.id)}
                                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" /> Guardar
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" /> Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="text-xl font-bold mb-1 font-[family-name:var(--font-syne)] text-white">{asset.name}</h3>
                                                    <p className="text-slate-500 text-sm mb-4 font-mono">Titular: {asset.owner}</p>

                                                    <div className="bg-slate-950 border border-white/[0.05] rounded-xl p-4 mb-6">
                                                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
                                                            {(asset.status === "funding_requested" || asset.status === "funded") &&
                                                                isEscrowActionOwner(asset) &&
                                                                (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1
                                                                ? "Valor Estimado Total (Garantías)"
                                                                : "Valor Estimado"}
                                                        </p>
                                                        <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
                                                            $
                                                            {((asset.status === "funding_requested" || asset.status === "funded") &&
                                                                isEscrowActionOwner(asset)
                                                                ? getCollateralTotalForAsset(asset)
                                                                : asset.value
                                                            ).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    {(asset.status === "funding_requested" || asset.status === "funded") && (
                                                        <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-4 mb-6">
                                                            <p className="text-xs text-emerald-400 mb-1 uppercase tracking-wider font-bold">Monto del préstamo</p>
                                                            <p className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">
                                                                ${getLoanAmountForAsset(asset).toLocaleString()} USDC
                                                            </p>
                                                        </div>
                                                    )}
                                                    {(asset.status === "funding_requested" || asset.status === "funded") &&
                                                        isEscrowActionOwner(asset) &&
                                                        (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1 && (
                                                            <div className="bg-slate-950 border border-cyan-500/20 rounded-xl p-4 mb-6">
                                                                <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wider font-bold">
                                                                    Garantías incluidas en este préstamo
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {(escrowGroupedAssetsByLeaderId.get(asset.id) || []).map((item) => (
                                                                        <div
                                                                            key={item.id}
                                                                            className="flex items-center justify-between text-xs text-slate-300 border border-white/[0.05] rounded-lg px-3 py-2"
                                                                        >
                                                                            <span>{item.name}</span>
                                                                            <span className="font-mono">${item.value.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                </>
                                            )}

                                            {/* STATUS MESSAGES FOR SOLICITANTE */}
                                            {asset.status === 'pending_review' && (
                                                <div className="w-full space-y-2">
                                                    <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                                        <FileText className="w-4 h-4" /> Documentación en revisión
                                                    </div>
                                                    {editingAssetId !== asset.id && (
                                                        <button
                                                            onClick={() => handleStartEdit(asset)}
                                                            className="w-full text-xs font-bold text-slate-400 hover:text-blue-400 py-2 border border-slate-800 hover:border-blue-500/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Editar datos de la garantía
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {asset.status === 'approved' && (
                                                <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" /> Aprobado - Tokenizando...
                                                </div>
                                            )}

                                            {asset.status === 'tokenized' && (
                                                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                                    <Coins className="w-4 h-4" /> Garantía Aprobada y Tokenizada
                                                </div>
                                            )}

                                            {asset.status === 'funding_requested' && (
                                                <div className="w-full space-y-3">
                                                    <div className="w-full bg-purple-500/10 border border-purple-500/20 text-purple-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                                        <Coins className="w-4 h-4" /> Garantía Asignada a Préstamo
                                                    </div>
                                                    {isEscrowActionOwner(asset) ? (
                                                        <>
                                                            <button
                                                                onClick={() => setTermsModalState({ open: true, asset, accepted: false })}
                                                                disabled={isProcess === asset.id || completedMilestones.has(asset.id)}
                                                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/10 border border-emerald-500 disabled:border-emerald-500/20 text-white disabled:text-emerald-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isProcess === asset.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : completedMilestones.has(asset.id) ? (
                                                                    <>
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        Acuerdo firmado ✓
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FileText className="w-4 h-4" />
                                                                        Firmar acuerdo de préstamo
                                                                    </>
                                                                )}
                                                            </button>
                                                            {completedMilestones.has(asset.id) ? (
                                                                <p className="text-xs text-slate-400 text-center">
                                                                    ✅ Has firmado el acuerdo. El administrador procederá con el desembolso.
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-slate-500 text-center">
                                                                    Debes firmar el acuerdo para habilitar el desembolso.
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 text-center border border-white/[0.06] rounded-lg px-3 py-2">
                                                            Incluida en préstamo unificado. Gestión desde{" "}
                                                            <strong className="text-white">
                                                                {getEscrowLeaderAsset(asset)?.name || "otra garantía"}
                                                            </strong>.
                                                        </p>
                                                    )}
                                                    {isEscrowActionOwner(asset) && (
                                                        <button
                                                            onClick={() => handleDeleteAssetCard(asset.id)}
                                                            disabled={isDeletingAssetId === asset.id}
                                                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {isDeletingAssetId === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                            Borrar este cuadro (modo prueba)
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {asset.status === 'funded' && (
                                                <div className="w-full space-y-3">
                                                    <div className="w-full bg-green-500/10 border border-green-500/20 text-green-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" /> Préstamo Desembolsado
                                                    </div>
                                                    {!isEscrowActionOwner(asset) && (
                                                        <p className="text-xs text-slate-400 text-center border border-white/[0.06] rounded-lg px-3 py-2">
                                                            Garantía incluida en préstamo gestionado desde{" "}
                                                            <strong className="text-white">
                                                                {getEscrowLeaderAsset(asset)?.name || "otra garantía"}
                                                            </strong>.
                                                        </p>
                                                    )}
                                                    {isEscrowActionOwner(asset) && (
                                                        <button
                                                            onClick={() => handleDeleteAssetCard(asset.id)}
                                                            disabled={isDeletingAssetId === asset.id}
                                                            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {isDeletingAssetId === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                            Borrar este cuadro (modo prueba)
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            ))}


                    </div>
                )}

                {/* 2. TAB: PRÉSTAMOS */}
                {activeTab === 'prestamos' && (
                    <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center w-full max-w-3xl mx-auto">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                            <Coins className="w-10 h-10 md:w-12 md:h-12 text-orange-500" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 font-[family-name:var(--font-syne)] text-white">Solicitud de Liquidez</h2>

                        {collateralEligibleAssets.length === 0 ? (
                            <>
                                <p className="text-slate-400 mb-8 font-[family-name:var(--font-manrope)] text-lg leading-relaxed max-w-2xl px-4">
                                    Aún no tienes garantías disponibles para respaldar un nuevo préstamo. Necesitas garantías tokenizadas o con saldo disponible.
                                </p>
                                <button
                                    onClick={() => setActiveTab('garantias')}
                                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors px-8 py-4 rounded-xl font-bold"
                                >
                                    Ir a Mis Garantías
                                </button>
                            </>
                        ) : (
                            <div className="w-full bg-slate-900/50 border border-white/[0.05] rounded-[2rem] p-6 md:p-10 text-left">
                                {/* SELECTOR DE GARANTÍAS */}
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-slate-300">Selecciona las garantías a utilizar:</h3>
                                        <button
                                            onClick={toggleAllAssets}
                                            className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors"
                                        >
                                            {selectedAssetIds.size === collateralEligibleAssets.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {collateralEligibleAssets.map(asset => (
                                            <label
                                                key={asset.id}
                                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedAssetIds.has(asset.id)
                                                    ? 'bg-orange-500/10 border-orange-500/30'
                                                    : 'bg-[#0b1021] border-white/[0.05] hover:border-slate-600'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssetIds.has(asset.id)}
                                                    onChange={() => toggleAssetSelection(asset.id)}
                                                    className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                                                            {getIcon(asset.type)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{asset.name}</p>
                                                            <p className="text-xs text-slate-500 font-mono">{asset.owner}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">${asset.value.toLocaleString()}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                    <div className="bg-[#0b1021] border border-white/[0.05] p-6 rounded-2xl">
                                        <h3 className="text-xs font-bold text-slate-500 mb-2 font-[family-name:var(--font-syne)]">RESPALDO SELECCIONADO ({selectedAssets.length}/{collateralEligibleAssets.length})</h3>
                                        <p className="text-3xl font-bold text-white">{formatCurrency(totalAssetValue)}</p>
                                    </div>
                                    <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.05)]">
                                        <h3 className="text-xs font-bold text-orange-500 mb-2 font-[family-name:var(--font-syne)]">LÍMITE DE CRÉDITO DISPONIBLE (70% LTV)</h3>
                                        <p className="text-3xl font-bold text-orange-400">{formatCurrency(maxCreditLimit)}</p>
                                        <p className="text-xs text-orange-200/80 mt-2">
                                            Base 70%: {formatCurrency(grossCreditLimit)} · Comprometido: {formatCurrency(committedAmountOnSelection)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-12">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                                        <label className="text-sm font-bold text-slate-300">Ingresa o selecciona el monto a solicitar:</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max={maxCreditLimit}
                                                value={loanAmount === 0 ? "" : loanAmount}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val <= maxCreditLimit) setLoanAmount(val);
                                                    else setLoanAmount(maxCreditLimit);
                                                }}
                                                placeholder="0"
                                                className="bg-slate-950 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-3xl font-bold text-white w-full md:w-48 focus:outline-none focus:border-orange-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max={maxCreditLimit}
                                        step={1}
                                        value={loanAmount}
                                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                                        className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 mt-2"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-3 font-mono font-bold">
                                        <span>$0</span>
                                        <span>Máx: {formatCurrency(maxCreditLimit)}</span>
                                    </div>
                                </div>

                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-8 flex gap-4">
                                    <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-400 mb-1">Bloqueo de Garantías (Escrow)</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Al solicitar esta liquidez, se inicializará el contrato inteligente (Smart Contract) vinculando tus garantías. Tras la confirmación, el estado pasará a "Fondos Enviados" para que puedas firmar el retiro usando tu Wallet en la red principal.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-slate-950 px-8 py-5 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                                    disabled={loanAmount === 0 || selectedAssets.length === 0 || isSubmitting}
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            const res = await fetch('/api/loan-requests', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    borrower_wallet: address,
                                                    borrower_name: userProfile?.full_name || newAsset.owner,
                                                    amount_requested: loanAmount,
                                                    collateral_value: totalAssetValue,
                                                    ltv_ratio: 0.7,
                                                    asset_ids: selectedAssets.map(a => a.id),
                                                }),
                                            });
                                            if (!res.ok) throw new Error('Error enviando solicitud');
                                            const createdLoan = await res.json();
                                            setLoanRequests((prev) => [createdLoan, ...prev]);
                                            showAlert(
                                                `Tu solicitud de ${formatCurrency(loanAmount)} respaldada por ${selectedAssets.length} garantía(s) fue enviada al equipo de ExperienZea. Recibirás una notificación cuando sea procesada.`,
                                                "Solicitud Enviada"
                                            );
                                            setLoanAmount(0);
                                            setSelectedAssetIds(new Set());
                                        } catch (err) {
                                            console.error(err);
                                            showAlert("Error enviando la solicitud. Intenta de nuevo.");
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                                    ) : selectedAssets.length === 0
                                        ? 'Selecciona al menos una garantía'
                                        : `Solicitar ${formatCurrency(loanAmount)} al instante`
                                    }
                                </button>

                            </div>
                        )}
                    </div>
                )}

                {/* 3. TAB: PERFIL */}
                {activeTab === 'perfil' && (
                    <div className="bg-[#0b1021] p-8 rounded-[2rem] border border-white/[0.05] max-w-2xl mx-auto shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold font-[family-name:var(--font-syne)] text-white flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-blue-500" />
                                Datos de Perfil RWA
                            </h2>
                            <button
                                onClick={() => setActiveTab('garantias')}
                                className="bg-white text-slate-900 hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg hover:scale-105"
                            >
                                <ArrowLeft className="w-4 h-4" /> Volver al Tablero
                            </button>
                        </div>
                        {userProfile ? (
                            <div className="space-y-6 font-[family-name:var(--font-manrope)] text-slate-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">Nombre / Razón Social</p>
                                        <p className="font-bold text-white text-lg">{userProfile.full_name}</p>
                                    </div>
                                    <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">DNI / CUIT</p>
                                        <p className="font-bold text-white text-lg">{userProfile.cuit_cuil}</p>
                                    </div>
                                    <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">Perfil Legal</p>
                                        <p className="font-bold text-white text-lg capitalize">{userProfile.company_type}</p>
                                    </div>
                                    <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">Sector Principal</p>
                                        <p className="font-bold text-white text-lg capitalize">{userProfile.industry?.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">Mail de Contacto</p>
                                    <p className="font-bold text-white text-lg">{userProfile.email}</p>
                                </div>
                                <div className="bg-slate-950 p-5 rounded-xl border border-white/[0.05]">
                                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2 font-[family-name:var(--font-syne)]">Teléfono</p>
                                    <p className="font-bold text-white text-lg">{userProfile.phone_number}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                                <p>Cargando información segura...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Form Modal */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            key="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
                            onClick={() => !isProcess && setShowForm(false)}
                        >
                            <motion.div
                                key="modal-content"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden border border-white/[0.1] max-h-[90vh] overflow-y-auto"
                            >
                                {isSubmitting ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-white">
                                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                                        <h3 className="text-2xl font-bold mb-2 font-[family-name:var(--font-syne)]">Enviando Documentación...</h3>
                                        <p className="text-slate-400 text-center font-[family-name:var(--font-manrope)]">Encriptando archivos y subiendo a IPFS/R2.<br />Tus datos están seguros.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitForReview}>
                                        {/* Generar un assetId consistente para este formulario */}
                                        {(() => {
                                            // Asegurar que tenemos un assetId consistente
                                            if (!tempAssetId) {
                                                const newId = uuidv4();
                                                setTempAssetId(newId);
                                            }
                                            return null;
                                        })()}

                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">Cargar Garantía</h2>
                                            <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                                        </div>



                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-400 mb-2">Titular del Seguro</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white disabled:opacity-70 disabled:bg-slate-900"
                                                    placeholder="Tu Nombre Completo"
                                                    value={newAsset.owner}
                                                    onChange={e => setNewAsset({ ...newAsset, owner: e.target.value })}
                                                    disabled={!!userProfile?.full_name}
                                                />
                                                {userProfile?.full_name && (
                                                    <p className="text-xs text-blue-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Completado desde tu perfil KYC</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-400 mb-2">Nombre del Activo / Modelo</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white"
                                                    placeholder="Ej: Tractor John Deere XL"
                                                    value={newAsset.name}
                                                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-400 mb-2">Valor Estimado (USD)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white"
                                                    placeholder="45000"
                                                    value={newAsset.value}
                                                    onChange={e => setNewAsset({ ...newAsset, value: e.target.value })}
                                                />
                                            </div>

                                            <FileUpload
                                                assetId={tempAssetId}
                                                type="insurance"
                                                label="Adjuntar Imágenes del Seguro (Frente, Dorso)"
                                                accept="image/*"
                                                onUploadComplete={(url) => setNewAsset({ ...newAsset, insuranceDoc: url })}
                                            />

                                            <FileUpload
                                                assetId={tempAssetId}
                                                type="property"
                                                label="Adjuntar Título de Propiedad"
                                                accept=".pdf,image/*"
                                                onUploadComplete={(url) => setNewAsset({ ...newAsset, propertyDoc: url })}
                                            />

                                            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex gap-3 items-start">
                                                <input
                                                    type="checkbox"
                                                    id="legalCheck"
                                                    checked={newAsset.legalCheck}
                                                    onChange={e => setNewAsset({ ...newAsset, legalCheck: e.target.checked })}
                                                    className="mt-1 w-5 h-5 accent-blue-500 bg-slate-950 border-slate-700 rounded cursor-pointer"
                                                />
                                                <label htmlFor="legalCheck" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                                                    Declaro bajo mi responsabilidad que el activo se encuentra a mi nombre, en condiciones óptimas, y autorizo su ejecución como garantía en caso de incumplimiento de pago según los términos del Smart Contract.
                                                </label>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 font-[family-name:var(--font-syne)] uppercase tracking-wider text-sm">
                                            Enviar a Revisión
                                        </button>
                                    </form>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            {modalState.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
                        <div className="mb-3 text-lg font-bold text-white font-[family-name:var(--font-syne)]">
                            {modalState.title}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            {modalState.message}
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setModalState((prev) => ({ ...prev, open: false }));
                                    modalResolverRef.current?.(true);
                                    modalResolverRef.current = null;
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                            >
                                {modalState.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms and Conditions Modal */}
            <AnimatePresence>
                {termsModalState.open && termsModalState.asset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
                        onClick={() => setTermsModalState({ open: false, asset: null, accepted: false })}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                            <div className="p-8 border-b border-white/[0.05] relative z-10">
                                <h3 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
                                    Acuerdo de Préstamo Garantizado
                                </h3>
                                <p className="text-sm text-slate-400 font-[family-name:var(--font-manrope)]">
                                    Revisá los términos antes de proceder con la firma del contrato inteligente.
                                </p>
                            </div>

                            <div className="p-8 space-y-6 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-950 p-5 rounded-[1.5rem] border border-white/[0.05]">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold">Monto a recibir</p>
                                        <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
                                            ${getLoanAmountForAsset(termsModalState.asset).toLocaleString()} USDC
                                        </p>
                                    </div>
                                    <div className="bg-slate-950 p-5 rounded-[1.5rem] border border-white/[0.05]">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold">Tasa Anual</p>
                                        <p className="text-2xl font-bold text-blue-400 font-[family-name:var(--font-syne)]">18% APR</p>
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-[1.5rem]">
                                    <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2 font-[family-name:var(--font-syne)]">
                                        <ShieldCheck className="w-5 h-5" /> Política de Garantía (NFT)
                                    </h4>
                                    <p className="text-sm text-slate-300 leading-relaxed text-justify font-[family-name:var(--font-manrope)]">
                                        Al aceptar este contrato, el NFT representativo de su activo <strong className="text-white font-[family-name:var(--font-syne)]">({getCollateralNamesForAsset(termsModalState.asset)})</strong> quedará bloqueado en un contrato inteligente de garantía.
                                        En caso de incumplimiento de pago a la fecha de vencimiento, la propiedad digital del activo pasará a ExperienZea o sus inversores para la liquidación correspondiente.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3 mt-8 bg-slate-950/50 p-4 rounded-xl border border-white/[0.02]">
                                    <input
                                        type="checkbox"
                                        id="acceptTerms"
                                        checked={termsModalState.accepted}
                                        onChange={(e) => setTermsModalState(prev => ({ ...prev, accepted: e.target.checked }))}
                                        className="mt-1 w-5 h-5 accent-blue-500 bg-slate-950 border-slate-700 justify-center cursor-pointer rounded"
                                    />
                                    <label htmlFor="acceptTerms" className="text-sm text-slate-400 hover:text-slate-300 cursor-pointer select-none transition-colors">
                                        He leído y acepto los términos y condiciones del préstamo, así como la política de ejecución de garantía aplicable a mis activos digitalizados.
                                    </label>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-950/50 border-t border-white/[0.05] flex gap-4 relative z-10">
                                <button
                                    onClick={() => setTermsModalState({ open: false, asset: null, accepted: false })}
                                    className="w-1/3 py-4 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={!termsModalState.accepted}
                                    onClick={() => {
                                        handleFirmarAcuerdo(termsModalState.asset!);
                                        setTermsModalState({ open: false, asset: null, accepted: false });
                                    }}
                                    className="w-2/3 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    Firmar y Recibir Fondos
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
