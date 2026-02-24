"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
    useChangeMilestoneStatus,
    useSendTransaction,
    useGetEscrowFromIndexerByContractIds,
} from "@trustless-work/escrow";
import * as freighterApi from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { v4 as uuidv4 } from "uuid";
import { Rocket, LogOut, Loader2, ArrowLeft, Plus, CheckCircle2, ShieldCheck, Tractor, Building2, Car, Coins, Check, X, AlertCircle, FileText, Upload, Pencil } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import KYCModal from "@/components/KYCModal";
import TopMetrics from "@/components/solicitante/TopMetrics";
import AssetLottie from "@/components/AssetLottie";
import { motion, AnimatePresence } from "framer-motion";
import { useSolicitanteCalculations } from "@/hooks/useSolicitanteCalculations";
import type { Asset, LoanRequest } from "@/types/solicitante";

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
    const [nftModalState, setNftModalState] = useState<{
        open: boolean;
        asset: Asset | null;
    }>({
        open: false,
        asset: null,
    });
    const [resolvedReceiptTokenIds, setResolvedReceiptTokenIds] = useState<Record<string, string>>({});
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
    const nftContractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID || "";
    const sorobanRpcUrl =
        process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

    const parseScValToNative = (raw: unknown): unknown => {
        if (!raw) return undefined;

        try {
            return StellarSdk.scValToNative(raw as StellarSdk.xdr.ScVal);
        } catch {
            // noop
        }

        try {
            if (typeof raw === "string") {
                const scVal = StellarSdk.xdr.ScVal.fromXDR(raw, "base64");
                return StellarSdk.scValToNative(scVal);
            }
        } catch {
            // noop
        }

        return undefined;
    };

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
        // Deduplicar contractIds — en escrow unificado varios assets comparten el mismo ID
        const contractIds = [...new Set(
            items
                .map((asset) => asset.contractId || asset.contract_id)
                .filter((id): id is string => Boolean(id))
        )];

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
        type: 'auto' | 'casa' | 'departamento' | 'tractor' | 'otro',
        name: string,
        value: string,
        owner: string,
        legalCheck: boolean,
        insuranceDoc?: string,
        propertyDoc?: string
    }>({
        type: 'auto',
        name: '',
        value: '',
        owner: '',
        legalCheck: false
    });
    const collateralTypeOptions: Array<{
        value: 'auto' | 'casa' | 'departamento' | 'tractor' | 'otro';
        label: string;
        icon: React.ReactNode;
    }> = [
        { value: 'auto', label: 'Auto', icon: <Car className="w-4 h-4" /> },
        { value: 'casa', label: 'Casa', icon: <Building2 className="w-4 h-4" /> },
        { value: 'departamento', label: 'Departamento', icon: <Building2 className="w-4 h-4" /> },
        { value: 'tractor', label: 'Tractor', icon: <Tractor className="w-4 h-4" /> },
        { value: 'otro', label: 'Otro', icon: <FileText className="w-4 h-4" /> },
    ];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcess, setIsProcess] = useState<string | null>(null);

    // Loan Simulator State
    const [loanAmount, setLoanAmount] = useState<number>(0);
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
    const {
        collateralEligibleAssets,
        selectedAssets,
        totalAssetValue,
        committedAmountOnSelection,
        grossCreditLimit,
        maxCreditLimit,
        liquidityAvailableToday,
        totalBackedValue,
        pendingReviewAssets,
        pendingReviewValue,
        liquidatedAmount,
        escrowGroupedAssetsByLeaderId,
        isEscrowActionOwner,
        getLoanAmountForAsset,
        getCollateralTotalForAsset,
        getCollateralNamesForAsset,
        getEscrowLeaderAsset,
    } = useSolicitanteCalculations(assets, loanRequests, selectedAssetIds);

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

    useEffect(() => {
        const resolveReceiptTokenId = async () => {
            const modalAsset = nftModalState.asset;
            if (!nftModalState.open || !modalAsset || !address || !nftContractId) return;

            const ownerAsset = isEscrowActionOwner(modalAsset)
                ? modalAsset
                : (getEscrowLeaderAsset(modalAsset) || modalAsset);
            const ownerAssetId = ownerAsset.id;
            const docs = ownerAsset.documents || {};
            const receiptAssetId = docs.receipt_asset_id;

            if (!receiptAssetId || docs.receipt_token_id || resolvedReceiptTokenIds[ownerAssetId]) {
                return;
            }

            try {
                const server = new StellarSdk.rpc.Server(sorobanRpcUrl, {
                    allowHttp: sorobanRpcUrl.startsWith("http://"),
                });
                const account = await server.getAccount(address);
                const contract = new StellarSdk.Contract(nftContractId);
                const tx = new StellarSdk.TransactionBuilder(account, {
                    fee: StellarSdk.BASE_FEE,
                    networkPassphrase: testnetPassphrase,
                })
                    .addOperation(
                        contract.call(
                            "get_token_id_by_asset_id",
                            StellarSdk.xdr.ScVal.scvString(receiptAssetId)
                        )
                    )
                    .setTimeout(30)
                    .build();

                const simulated = await server.simulateTransaction(tx);
                const retval = (simulated as any)?.result?.retval;
                if (!retval) return;

                const native = parseScValToNative(retval);
                const resolved =
                    typeof native === "bigint"
                        ? native.toString()
                        : typeof native === "number"
                            ? String(native)
                            : typeof native === "string"
                                ? native
                                : "";

                if (!resolved) return;

                setResolvedReceiptTokenIds((prev) => ({ ...prev, [ownerAssetId]: resolved }));

                const nextDocuments = { ...(ownerAsset.documents || {}), receipt_token_id: resolved };
                await fetch(`/api/assets/${ownerAsset.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documents: nextDocuments }),
                });
            } catch (error) {
                console.warn("No se pudo resolver receipt token id desde cadena:", error);
            }
        };

        resolveReceiptTokenId();
    }, [
        nftModalState,
        address,
        nftContractId,
        sorobanRpcUrl,
        resolvedReceiptTokenIds,
        getEscrowLeaderAsset,
        isEscrowActionOwner,
    ]);


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
            setNewAsset({ type: 'auto', name: '', value: '', owner: newAsset.owner, legalCheck: false });
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error guardando el activo. Intentá de nuevo.');
            setIsSubmitting(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'tractor':
            case 'maquinaria':
                return <Tractor className="w-8 h-8" />;
            case 'casa':
            case 'departamento':
            case 'inmueble':
                return <Building2 className="w-8 h-8" />;
            case 'auto':
            case 'vehiculo':
                return <Car className="w-8 h-8" />;
            default: return <FileText className="w-8 h-8" />;
        }
    };
    const getAssetVisual = (asset: Asset) => {
        const shouldAnimate =
            asset.status === "tokenized" ||
            asset.status === "funding_requested" ||
            asset.status === "funded";

        if (shouldAnimate) {
            return (
                <div className="w-full h-full pointer-events-none bg-white rounded-xl border border-white/50">
                    <AssetLottie type={asset.type} context="nft" />
                </div>
            );
        }

        return getIcon(asset.type);
    };
    const getLinkedLoanForAsset = (asset: Asset) => {
        const contractId = asset.contractId || asset.contract_id;
        if (contractId) {
            return loanRequests.find((loan) => loan.contract_id === contractId) || null;
        }
        return loanRequests.find((loan) => (loan.asset_ids || []).includes(asset.id)) || null;
    };

    const getReceiptDataForAsset = (asset: Asset) => {
        const leaderAsset = isEscrowActionOwner(asset)
            ? asset
            : (getEscrowLeaderAsset(asset) || asset);
        return leaderAsset.documents || {};
    };
    const getReceiptOwnerAsset = (asset: Asset) => {
        return isEscrowActionOwner(asset)
            ? asset
            : (getEscrowLeaderAsset(asset) || asset);
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
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveTab('prestamos')}
                                        className="border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/70 px-5 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                                    >
                                        <Coins className="w-4 h-4" /> Pedir un crédito
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTempAssetId(uuidv4());
                                            setShowForm(true);
                                        }}
                                        className="bg-white text-slate-900 px-5 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-all hover:scale-105"
                                    >
                                        <Plus className="w-4 h-4" /> Cargar Garantía
                                    </button>
                                </div>
                            )}
                        </div>

                        <TopMetrics
                            liquidityAvailableToday={liquidityAvailableToday}
                            walletBalance={walletBalance}
                            totalBackedValue={totalBackedValue}
                            liquidatedAmount={liquidatedAmount}
                            pendingReviewValue={pendingReviewValue}
                            pendingReviewCount={pendingReviewAssets.length}
                        />
                    </>
                )}

                {/* TAB CONTENT WITHOUT MOTION TO AVOID LOADING EFFECTS */}

                {/* 1. TAB: MIS GARANTÍAS */}
                {activeTab === 'garantias' && (() => {
                    const visibleAssets = assets.filter((asset) => {
                        if (asset.status !== "funding_requested" && asset.status !== "funded") return true;
                        const contractId = asset.contractId || asset.contract_id;
                        if (!contractId) return true;
                        return isEscrowActionOwner(asset);
                    });

                    // Línea de color superior según status
                    const statusAccent: Record<string, string> = {
                        pending_review:   'from-yellow-500/60',
                        approved:         'from-blue-500/60',
                        tokenized:        'from-purple-500/60',
                        funding_requested:'from-cyan-500/60',
                        funded:           'from-emerald-500/70',
                    };

                    if (visibleAssets.length === 0) {
                        return (
                            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto pb-32">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5">
                                    <Upload className="w-8 h-8 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 font-[family-name:var(--font-syne)]">Sin garantías cargadas</h3>
                                <p className="text-slate-400 mb-8 font-[family-name:var(--font-manrope)] text-sm leading-relaxed">
                                    Cargá tu primera garantía para comenzar el proceso de tokenización y acceder a liquidez.
                                </p>
                                <button
                                    onClick={() => { setTempAssetId(uuidv4()); setShowForm(true); }}
                                    className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                >
                                    <Plus className="w-4 h-4" /> Cargar primera garantía
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className="grid md:grid-cols-3 gap-6 pb-32 relative">
                            {visibleAssets.map(asset => {
                                const isUnifiedLeader =
                                    (asset.status === "funding_requested" || asset.status === "funded") &&
                                    isEscrowActionOwner(asset) &&
                                    (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1;

                                const accentClass = statusAccent[asset.status] ?? 'from-slate-500/40';

                                return (
                                    <div
                                        key={asset.id}
                                        className={`bg-[#0b1021] p-6 rounded-[2rem] shadow-xl border border-white/[0.04] relative overflow-hidden hover:shadow-[0_0_30px_rgba(37,99,235,0.12)] hover:border-blue-500/20 transition-all duration-300 ${isUnifiedLeader ? "md:col-span-3" : ""}`}
                                    >
                                        {/* Línea de color superior por status */}
                                        <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${accentClass} to-transparent`} />

                                        {isUnifiedLeader && (
                                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                                                <Coins className="w-3 h-3" />
                                                Préstamo unificado · {(escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0)} garantías
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-5">
                                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 overflow-hidden">
                                                {getAssetVisual(asset)}
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
                                                        className="w-full bg-slate-950 border border-slate-700/50 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Valor Estimado (USD)</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.value}
                                                        onChange={e => setEditForm(prev => ({ ...prev, value: e.target.value }))}
                                                        className="w-full bg-slate-950 border border-slate-700/50 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateAsset(asset.id)}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Check className="w-4 h-4" /> Guardar
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" /> Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-xl font-bold mb-1 font-[family-name:var(--font-syne)] text-white">{asset.name}</h3>
                                                <p className="text-slate-500 text-xs mb-4 font-mono">Titular: {asset.owner}</p>

                                                <div className="bg-slate-950/70 border border-white/[0.04] rounded-2xl p-4 mb-4">
                                                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold font-[family-name:var(--font-syne)]">
                                                        {(asset.status === "funding_requested" || asset.status === "funded") &&
                                                            isEscrowActionOwner(asset) &&
                                                            (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1
                                                            ? "Valor total (garantías)"
                                                            : "Valor estimado"}
                                                    </p>
                                                    <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] leading-none">
                                                        ${((asset.status === "funding_requested" || asset.status === "funded") && isEscrowActionOwner(asset)
                                                            ? getCollateralTotalForAsset(asset)
                                                            : asset.value
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>

                                                {(asset.status === "funding_requested" || asset.status === "funded") && (
                                                    <div className="bg-slate-950/70 border border-emerald-500/20 rounded-2xl p-4 mb-4">
                                                        <p className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest font-bold font-[family-name:var(--font-syne)]">Monto del préstamo</p>
                                                        <p className="text-xl font-bold text-white font-[family-name:var(--font-syne)] leading-none">
                                                            ${getLoanAmountForAsset(asset).toLocaleString()} <span className="text-sm text-slate-500 font-normal">USDC</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {(asset.status === "funding_requested" || asset.status === "funded") &&
                                                    isEscrowActionOwner(asset) &&
                                                    (escrowGroupedAssetsByLeaderId.get(asset.id)?.length || 0) > 1 && (
                                                        <div className="bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 mb-4">
                                                            <p className="text-[10px] text-cyan-400 mb-3 uppercase tracking-widest font-bold font-[family-name:var(--font-syne)]">
                                                                Garantías en este préstamo
                                                            </p>
                                                            <div className="space-y-2">
                                                                {(escrowGroupedAssetsByLeaderId.get(asset.id) || []).map((item) => (
                                                                    <div
                                                                        key={item.id}
                                                                        className="flex items-center justify-between text-xs text-slate-300 border border-white/[0.04] rounded-xl px-3 py-2"
                                                                    >
                                                                        <span>{item.name}</span>
                                                                        <span className="font-mono text-slate-400">${item.value.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                            </>
                                        )}

                                        {/* STATUS ACTIONS */}
                                        {asset.status === 'pending_review' && (
                                            <div className="w-full space-y-2">
                                                <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                    <FileText className="w-4 h-4" /> Documentación en revisión
                                                </div>
                                                {editingAssetId !== asset.id && (
                                                    <button
                                                        onClick={() => handleStartEdit(asset)}
                                                        className="w-full text-xs font-bold text-slate-500 hover:text-blue-400 py-2.5 border border-slate-800/60 hover:border-blue-500/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <Pencil className="w-3 h-3" /> Editar datos de la garantía
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {asset.status === 'approved' && (
                                            <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-400 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> Aprobado · Tokenizando...
                                            </div>
                                        )}

                                        {asset.status === 'tokenized' && (
                                            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                <Coins className="w-4 h-4" /> Tokenizada · Lista para préstamo
                                            </div>
                                        )}

                                        {asset.status === 'funding_requested' && (
                                            <div className="w-full space-y-3">
                                                <div className="w-full bg-purple-500/10 border border-purple-500/20 text-purple-400 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                    <Coins className="w-4 h-4" /> Garantía asignada a préstamo
                                                </div>
                                                {isEscrowActionOwner(asset) ? (
                                                    <>
                                                        <button
                                                            onClick={() => setTermsModalState({ open: true, asset, accepted: false })}
                                                            disabled={isProcess === asset.id || completedMilestones.has(asset.id)}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/10 border border-emerald-500 disabled:border-emerald-500/20 text-white disabled:text-emerald-300 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isProcess === asset.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : completedMilestones.has(asset.id) ? (
                                                                <><CheckCircle2 className="w-4 h-4" /> Acuerdo firmado</>
                                                            ) : (
                                                                <><FileText className="w-4 h-4" /> Firmar acuerdo de préstamo</>
                                                            )}
                                                        </button>
                                                        <p className="text-xs text-slate-500 text-center">
                                                            {completedMilestones.has(asset.id)
                                                                ? "El administrador procederá con el desembolso."
                                                                : "Firmá el acuerdo para habilitar el desembolso."}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-slate-400 text-center border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                        Incluida en préstamo unificado. Gestioná desde{" "}
                                                        <strong className="text-white">{getEscrowLeaderAsset(asset)?.name || "otra garantía"}</strong>.
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => setNftModalState({ open: true, asset })}
                                                    className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 py-2.5 rounded-2xl font-bold text-xs transition-colors"
                                                >
                                                    Ver datos NFT
                                                </button>
                                            </div>
                                        )}

                                        {asset.status === 'funded' && (
                                            <div className="w-full space-y-3">
                                                <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" /> Préstamo desembolsado
                                                </div>
                                                {!isEscrowActionOwner(asset) && (
                                                    <p className="text-xs text-slate-400 text-center border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                        Préstamo gestionado desde{" "}
                                                        <strong className="text-white">{getEscrowLeaderAsset(asset)?.name || "otra garantía"}</strong>.
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => setNftModalState({ open: true, asset })}
                                                    className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 py-2.5 rounded-2xl font-bold text-xs transition-colors"
                                                >
                                                    Ver datos NFT
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* 2. TAB: PRÉSTAMOS */}
                {activeTab === 'prestamos' && (
                    <div className="pb-16">
                        {collateralEligibleAssets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-5">
                                    <Coins className="w-8 h-8 text-orange-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 font-[family-name:var(--font-syne)]">Sin garantías disponibles</h3>
                                <p className="text-slate-400 mb-8 font-[family-name:var(--font-manrope)] text-sm leading-relaxed">
                                    Necesitás garantías tokenizadas o con saldo disponible para solicitar liquidez.
                                </p>
                                <button
                                    onClick={() => setActiveTab('garantias')}
                                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Ir a Mis Garantías
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Título sobre el grid — ambas columnas arrancan igual */}
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">Solicitud de Liquidez</h2>
                                    <p className="text-slate-500 text-sm mt-1 font-[family-name:var(--font-manrope)]">
                                        Seleccioná las garantías que querés usar como respaldo del préstamo.
                                    </p>
                                </div>

                            <div className="grid md:grid-cols-5 gap-8 items-start">

                                {/* ── LEFT: Selector de garantías (3/5) ── */}
                                <div className="md:col-span-3 space-y-6">

                                    <div className="bg-[#0b1021] border border-white/[0.05] rounded-[2rem] p-6">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-[family-name:var(--font-syne)]">
                                                Garantías disponibles ({collateralEligibleAssets.length})
                                            </span>
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
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                                        selectedAssetIds.has(asset.id)
                                                            ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.08)]'
                                                            : 'bg-slate-950/50 border-white/[0.04] hover:border-slate-600/50'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                        selectedAssetIds.has(asset.id)
                                                            ? 'bg-orange-500 border-orange-500'
                                                            : 'border-slate-600'
                                                    }`}>
                                                        {selectedAssetIds.has(asset.id) && <Check className="w-3 h-3 text-white" />}
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAssetIds.has(asset.id)}
                                                            onChange={() => toggleAssetSelection(asset.id)}
                                                            className="sr-only"
                                                        />
                                                    </div>
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                                                        {getIcon(asset.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{asset.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{asset.owner}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-base font-bold text-white font-[family-name:var(--font-syne)]">${asset.value.toLocaleString()}</p>
                                                        <p className="text-[10px] text-slate-500">valor estimado</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Escrow info */}
                                    <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-2xl p-5 flex gap-4">
                                        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-400 mb-1 font-[family-name:var(--font-syne)]">Bloqueo de Garantías via Escrow</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed font-[family-name:var(--font-manrope)]">
                                                Al confirmar la solicitud, tus garantías quedarán vinculadas en un Smart Contract. Podrás firmar el retiro de fondos desde tu wallet una vez aprobado.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── RIGHT: Calculadora sticky (2/5) ── */}
                                <div className="md:col-span-2">
                                    <div className="bg-[#0b1021] border border-white/[0.05] rounded-[2rem] p-6 sticky top-24 shadow-2xl">
                                        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/[0.05]">
                                            <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                                <Coins className="w-5 h-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-white font-[family-name:var(--font-syne)]">Calculadora</h3>
                                                <p className="text-[10px] text-slate-500">Simulación de pre-aprobación</p>
                                            </div>
                                        </div>

                                        {/* Resumen selección */}
                                        <div className="space-y-0 mb-6">
                                            <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                                                <span className="text-xs text-slate-500">Garantías seleccionadas</span>
                                                <span className="text-sm font-bold text-white">{selectedAssets.length} / {collateralEligibleAssets.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                                                <span className="text-xs text-slate-500">Valor total respaldado</span>
                                                <span className="text-sm font-bold text-white">{formatCurrency(totalAssetValue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                                                <span className="text-xs text-slate-500">Base 70% LTV</span>
                                                <span className="text-sm font-bold text-slate-400">{formatCurrency(grossCreditLimit)}</span>
                                            </div>
                                            {committedAmountOnSelection > 0 && (
                                                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                                                    <span className="text-xs text-slate-500">Ya comprometido</span>
                                                    <span className="text-sm font-bold text-red-400">−{formatCurrency(committedAmountOnSelection)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center py-3 rounded-xl bg-orange-500/10 px-3 mt-2 -mx-1">
                                                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Límite disponible</span>
                                                <span className="text-xl font-bold text-orange-400 font-[family-name:var(--font-syne)]">{formatCurrency(maxCreditLimit)}</span>
                                            </div>
                                        </div>

                                        {/* Input de monto */}
                                        <div className="mb-6">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-3">
                                                Monto a solicitar
                                            </label>
                                            <div className="relative mb-4">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-500 pointer-events-none">$</span>
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
                                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-2xl py-4 pl-10 pr-4 text-3xl font-bold text-white focus:outline-none focus:border-orange-500 transition-colors font-[family-name:var(--font-syne)]"
                                                />
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={maxCreditLimit}
                                                step={1}
                                                value={loanAmount}
                                                onChange={(e) => setLoanAmount(Number(e.target.value))}
                                                className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-orange-500"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-600 mt-2 font-mono font-bold">
                                                <span>$0</span>
                                                <span>Máx {formatCurrency(maxCreditLimit)}</span>
                                            </div>
                                        </div>

                                        {/* CTA */}
                                        <button
                                            className="w-full bg-orange-500 hover:bg-orange-400 text-slate-950 py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 font-[family-name:var(--font-syne)]"
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
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                            ) : selectedAssets.length === 0
                                                ? 'Seleccioná una garantía'
                                                : loanAmount === 0
                                                    ? 'Elegí un monto'
                                                    : `Solicitar ${formatCurrency(loanAmount)}`
                                            }
                                        </button>

                                        <p className="text-[10px] text-slate-600 text-center mt-3 font-[family-name:var(--font-manrope)]">
                                            Esta es una simulación de pre-aprobación. Sujeto a validación del equipo ExperienZea.
                                        </p>
                                    </div>
                                </div>

                            </div>
                            </>
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
                                                <label className="block text-sm font-bold text-slate-400 mb-2">Tipo de Garantía</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {collateralTypeOptions.map((option) => {
                                                        const isSelected = newAsset.type === option.value;
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => setNewAsset({ ...newAsset, type: option.value })}
                                                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${isSelected
                                                                    ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                                                                    : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600"
                                                                    }`}
                                                            >
                                                                {option.icon}
                                                                {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
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

            {/* NFT Details Modal */}
            <AnimatePresence>
                {nftModalState.open && nftModalState.asset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
                        onClick={() => setNftModalState({ open: false, asset: null })}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
                        >
                            {(() => {
                                const asset = nftModalState.asset!;
                                const linkedLoan = getLinkedLoanForAsset(asset);
                                const contractId = asset.contractId || asset.contract_id;
                                const ownerAsset = getReceiptOwnerAsset(asset);
                                const receiptData = ownerAsset.documents || {};
                                const resolvedReceiptTokenId = resolvedReceiptTokenIds[ownerAsset.id];
                                const collateralRef = isEscrowActionOwner(asset)
                                    ? asset.id
                                    : (getEscrowLeaderAsset(asset)?.id || asset.id);
                                const statusLabel = asset.status === "funded" ? "Activo" : "En proceso";
                                const explorerUrl = contractId
                                    ? `https://stellar.expert/explorer/testnet/contract/${contractId}`
                                    : null;

                                return (
                                    <>
                                        <div className="p-4 border-b border-white/[0.05]">
                                            <h3 className="text-lg font-bold text-white font-[family-name:var(--font-syne)]">
                                                Datos NFT del préstamo
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {asset.name} · Titular: {asset.owner}
                                            </p>
                                        </div>

                                        <div className="p-4 space-y-2.5 text-xs">
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Estado</span>
                                                <span className="text-white font-bold">{statusLabel}</span>
                                            </div>
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Loan ID</span>
                                                <span className="text-white font-mono">{linkedLoan?.id || "No disponible"}</span>
                                            </div>
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Colateral Ref</span>
                                                <span className="text-white font-mono">{collateralRef}</span>
                                            </div>
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Contract ID Escrow</span>
                                                <span className="text-white font-mono text-xs">{contractId || "No disponible"}</span>
                                            </div>
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Receipt NFT ID</span>
                                                <span className="text-white font-mono">
                                                    {receiptData.receipt_token_id || resolvedReceiptTokenId || "Pendiente"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border border-white/[0.05] rounded-xl px-3 py-2.5">
                                                <span className="text-slate-400">Tx Hash NFT</span>
                                                <span className="text-white font-mono text-xs">
                                                    {receiptData.receipt_tx_hash || "Pendiente"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-3">
                                            {explorerUrl ? (
                                                <a
                                                    href={explorerUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                                                >
                                                    Ver contrato en Stellar Expert
                                                </a>
                                            ) : <span />}
                                            <button
                                                onClick={() => setNftModalState({ open: false, asset: null })}
                                                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                            >
                                                Cerrar
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
