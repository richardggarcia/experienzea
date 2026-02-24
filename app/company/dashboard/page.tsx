"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import {
    useInitializeEscrow,
    useFundEscrow,
    useReleaseFunds,
    useSendTransaction,
    useGetEscrowsFromIndexerBySigner,
    useGetEscrowFromIndexerByContractIds,
    useGetMultipleEscrowBalances,
    useApproveMilestone,
} from "@trustless-work/escrow";
import * as freighterApi from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
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
    ShieldCheck,
    Info,
    AlertTriangle,
    XCircle,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    buildEscrowActionOwnerMap,
    buildEscrowGroupsByLeaderId,
    filterVisibleEscrowLeaderAssets,
} from "@/lib/escrowGrouping";

// Asset Type desde Supabase
interface Asset {
    id: string;
    type:
    | "auto"
    | "casa"
    | "departamento"
    | "tractor"
    | "otro"
    | "vehiculo"
    | "inmueble"
    | "maquinaria"
    | "car"
    | "house";
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

interface LoanRequest {
    id: string;
    borrower_wallet: string;
    borrower_name: string;
    amount_requested: number;
    collateral_value: number;
    ltv_ratio: number;
    asset_ids: string[];
    status: string;
    contract_id?: string;
    created_at: string;
}

export default function CompanyDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { address, connect, disconnect, isConnecting } = useWallet();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
    const [docsReviewed, setDocsReviewed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isDeletingLoanRequestId, setIsDeletingLoanRequestId] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // 🎯 Estado de los milestones para mostrar indicador visual
    const [milestoneStatuses, setMilestoneStatuses] = useState<Record<string, {
        status?: string;
        approved?: boolean;
        completed?: boolean;
    }>>({});
    const [modalState, setModalState] = useState({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Aceptar",
        cancelLabel: "Cancelar",
        hideCancel: false,
    });
    const modalResolverRef = useRef<((value: boolean) => void) | null>(null);
    const escrowActionOwnerByAssetId = useMemo(
        () => buildEscrowActionOwnerMap(assets),
        [assets]
    );
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

    const { deployEscrow } = useInitializeEscrow();
    const { fundEscrow } = useFundEscrow();
    const { releaseFunds } = useReleaseFunds();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowsBySigner } = useGetEscrowsFromIndexerBySigner();
    const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
    const { getMultipleBalances } = useGetMultipleEscrowBalances();
    const { approveMilestone } = useApproveMilestone();

    // Verificar si el escrow ya fue liberado en la blockchain
    const verifyEscrowStatus = async (asset: Asset): Promise<boolean> => {
        const contractId = asset.contractId || asset.contract_id;
        if (!contractId) return false;

        try {
            console.log("🔍 Verificando estado real del escrow:", contractId);
            const escrowData = await getEscrowByContractIds({ contractIds: [contractId] });
            console.log("📊 Estado del escrow:", escrowData);

            if (escrowData && escrowData.length > 0) {
                const escrow = escrowData[0] as any;

                // Si el escrow está completado/released pero la DB dice funding_requested
                if (escrow?.status === "completed" || escrow?.status === "released") {
                    console.log("✅ El escrow ya está liberado. Actualizando BD...");

                    const relatedAssets = assets.filter((item) => {
                        const itemContractId = item.contractId || item.contract_id;
                        return itemContractId === contractId;
                    });
                    const assetsToPatch = relatedAssets.length > 0 ? relatedAssets : [asset];

                    await Promise.all(
                        assetsToPatch.map(async (item) => {
                            await fetch(`/api/assets/${item.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "funded" }),
                            });
                        })
                    );

                    const linkedLoan = loanRequestByContractId.get(contractId);
                    if (linkedLoan) {
                        await fetch(`/api/loan-requests/${linkedLoan.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "funded" }),
                        });
                    }

                    await fetchAssets();
                    await fetchLoanRequests();
                    showAlert("Los fondos ya fueron liberados anteriormente. El estado se ha actualizado.", "Escrow ya liberado");
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("❌ Error verificando escrow:", error);
            return false;
        }
    };

    const usdcIssuer = process.env.NEXT_PUBLIC_USDC_ISSUER || "";
    const usdcSymbol = process.env.NEXT_PUBLIC_USDC_SYMBOL || "USDC";
    const nftContractId = process.env.NEXT_PUBLIC_NFT_CONTRACT_ID || "";
    const sorobanRpcUrl =
        process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
    const testnetPassphrase = "Test SDF Network ; September 2015";

    const freighter = freighterApi.default ? freighterApi.default : freighterApi;

    // 💰 Balance de USDC de la wallet
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    // Función para obtener balance USDC de la wallet
    const fetchWalletBalance = async (walletAddress: string) => {
        if (!walletAddress || !usdcIssuer) return;

        try {
            // Llamar a Horizon API (testnet)
            const response = await fetch(
                `https://horizon-testnet.stellar.org/accounts/${walletAddress}`
            );

            if (!response.ok) {
                console.warn("No se pudo obtener balance de la wallet");
                return;
            }

            const data = await response.json();

            // Buscar el balance de USDC
            const usdcBalance = data.balances?.find((b: any) =>
                b.asset_type === "credit_alphanum4" &&
                b.asset_code === usdcSymbol &&
                b.asset_issuer === usdcIssuer
            );

            if (usdcBalance) {
                setWalletBalance(parseFloat(usdcBalance.balance));
            } else {
                setWalletBalance(0);
            }
        } catch (error) {
            console.error("Error obteniendo balance:", error);
        }
    };

    // Actualizar balance cuando cambia la wallet
    useEffect(() => {
        if (address) {
            fetchWalletBalance(address);
        }
    }, [address]);

    // Actualizar balance cada 10 segundos
    useEffect(() => {
        if (!address) return;

        const interval = setInterval(() => {
            fetchWalletBalance(address);
        }, 10000);

        return () => clearInterval(interval);
    }, [address]);

    const showAlert = (message: string, title = "Aviso") => {
        setModalState({
            open: true,
            title,
            message,
            confirmLabel: "Aceptar",
            cancelLabel: "",
            hideCancel: true,
        });
    };

    const requestConfirm = (message: string, title = "Confirmar") => {
        return new Promise<boolean>((resolve) => {
            modalResolverRef.current = resolve;
            setModalState({
                open: true,
                title,
                message,
                confirmLabel: "Aceptar",
                cancelLabel: "Cancelar",
                hideCancel: false,
            });
        });
    };
    const getTrustlessWorkErrorMessage = (error: unknown, fallback: string) => {
        const err = error as {
            response?: {
                status?: number;
                data?: { message?: string; request_id?: string; requestId?: string };
            };
        };

        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        const requestId = err?.response?.data?.request_id || err?.response?.data?.requestId;

        if (status === 502) {
            return requestId
                ? `Trustless Work no respondió (502). Intenta de nuevo en unos minutos. ID: ${requestId}`
                : "Trustless Work no respondió (502). Intenta de nuevo en unos minutos.";
        }

        if (status && message) {
            return requestId
                ? `Error Trustless Work (${status}): ${message}. ID: ${requestId}`
                : `Error Trustless Work (${status}): ${message}`;
        }

        return fallback;
    };

    const signAndSendXdr = async (unsignedXdr: string) => {
        // Verificar que Freighter esté en Testnet
        try {
            const networkResult = await freighter.getNetwork();
            console.log("🌐 Red de Freighter:", networkResult);
            const networkStr = typeof networkResult === 'string' ? networkResult : networkResult?.network;
            if (networkStr && networkStr !== "TESTNET" && networkStr !== testnetPassphrase) {
                showAlert("⚠️ Freighter no está en Testnet. Cambiá la red en la configuración de Freighter.");
                throw new Error("Freighter no está en Testnet. Red actual: " + networkStr);
            }
        } catch (e) {
            console.warn("No se pudo verificar la red de Freighter:", e);
        }

        const signed = await freighter.signTransaction(unsignedXdr, {
            networkPassphrase: testnetPassphrase,
        });

        const signedAny = signed as { signedTxXdr?: string; signedXDR?: string; xdr?: string };
        const signedXdr =
            typeof signed === "string"
                ? signed
                : signedAny?.signedTxXdr || signedAny?.signedXDR || signedAny?.xdr;

        if (!signedXdr) {
            console.error("❌ Respuesta de Freighter:", signed);
            throw new Error("No se pudo firmar la transacción. ¿Rechazaste la firma o no estás en Testnet?");
        }

        const maxAttempts = 4;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await sendTransaction(signedXdr);
            } catch (error) {
                const err = error as { response?: { data?: { message?: string } } };
                const message = err?.response?.data?.message || "";
                if (err?.response) {
                    console.error("Trustless Work: sendTransaction response", err.response.data);
                    console.error(
                        "Trustless Work: sendTransaction response (json)",
                        JSON.stringify(err.response.data)
                    );
                }
                const shouldRetry = message.includes("resultMetaXdr");

                if (!shouldRetry || attempt === maxAttempts) {
                    throw error;
                }

                await new Promise((resolve) => setTimeout(resolve, 1200));
            }
        }

        throw new Error("No se pudo enviar la transaccion");
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

    // 🔄 Polling automático cada 5 segundos para escrows en funding_requested
    useEffect(() => {
        const hasPendingEscrows = assets.some(a => a.status === "funding_requested");
        if (!hasPendingEscrows) return;

        console.log("🔄 Iniciando polling para escrows pendientes...");
        const interval = setInterval(() => {
            console.log("🔄 Polling admin: actualizando estados...");
            refreshEscrowStatuses();
        }, 5000);

        return () => clearInterval(interval);
    }, [assets]);

    // 🎯 Actualizar estados de milestones para mostrar indicador visual
    const refreshEscrowStatuses = async () => {
        const pendingEscrows = assets.filter(
            a => a.status === "funding_requested" && (a.contractId || a.contract_id)
        );

        if (pendingEscrows.length === 0) return;

        const contractIds = pendingEscrows
            .map(a => a.contractId || a.contract_id)
            .filter(Boolean) as string[];

        try {
            const escrowData = await getEscrowByContractIds({ contractIds });
            const newStatuses: Record<string, any> = {};

            escrowData.forEach((escrow: any) => {
                const milestone = escrow?.milestones?.[0];
                newStatuses[escrow.contractId] = {
                    status: milestone?.status,
                    approved: milestone?.approved || escrow?.flags?.approved,
                    completed: milestone?.status === "completed",
                };
            });

            setMilestoneStatuses(prev => ({ ...prev, ...newStatuses }));

            // También verificar si alguno ya está liberado para actualizar BD
            for (const asset of pendingEscrows) {
                const contractId = asset.contractId || asset.contract_id;
                const escrow = escrowData.find((e: any) => e.contractId === contractId) as any;

                if (escrow?.status === "completed" || escrow?.status === "released" || escrow?.flags?.released) {
                    console.log(`✅ Escrow ${contractId} ya liberado. Actualizando BD...`);
                    await fetch(`/api/assets/${asset.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "funded" }),
                    });
                    await fetchAssets();
                }
            }
        } catch (e) {
            console.error("❌ Error en refreshEscrowStatuses:", e);
        }
    };

    // Cargar estados iniciales de milestones
    useEffect(() => {
        if (assets.length > 0) {
            refreshEscrowStatuses();
        }
    }, [assets.length]);

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

    const fetchLoanRequests = async () => {
        try {
            const res = await fetch('/api/loan-requests');
            if (res.ok) {
                const data = await res.json();
                setLoanRequests(data);
            }
        } catch (error) {
            console.error('Error fetching loan requests:', error);
        }
    };

    const handleDeleteLoanRequest = async (loanId: string) => {
        const confirmed = await requestConfirm(
            "¿Eliminar esta solicitud de préstamo del panel? En modo prueba se borrará aunque ya esté en otro estado.",
            "Eliminar solicitud"
        );
        if (!confirmed) return;

        setIsDeletingLoanRequestId(loanId);
        try {
            const response = await fetch(`/api/loan-requests/${loanId}?force=1`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "No se pudo eliminar la solicitud");
            }

            setLoanRequests((prev) => prev.filter((loan) => loan.id !== loanId));
            showAlert("Solicitud eliminada.", "Listo");
        } catch (error) {
            console.error("Error deleting loan request:", error);
            showAlert("No se pudo eliminar la solicitud.");
        } finally {
            setIsDeletingLoanRequestId(null);
        }
    };
    const handleClearStuckEscrow = async (asset: Asset) => {
        const confirmed = await requestConfirm(
            "¿Limpiar este escrow atascado en modo prueba? Se eliminará la solicitud vinculada y las garantías volverán a tokenizadas.",
            "Limpiar escrow atascado"
        );
        if (!confirmed) return;

        setIsProcessing(asset.id);
        try {
            const contractId = asset.contractId || asset.contract_id;

            const relatedAssets = contractId
                ? assets.filter((item) => (item.contractId || item.contract_id) === contractId)
                : [asset];

            const relatedAssetIds = new Set(relatedAssets.map((item) => item.id));
            const relatedLoans = loanRequests.filter((loan) => {
                if (contractId && loan.contract_id === contractId) return true;
                return (loan.asset_ids || []).some((id) => relatedAssetIds.has(id));
            });

            await Promise.all(
                relatedAssets.map((item) =>
                    fetch(`/api/assets/${item.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            status: "tokenized",
                            contract_id: null,
                        }),
                    })
                )
            );

            await Promise.all(
                relatedLoans.map((loan) =>
                    fetch(`/api/loan-requests/${loan.id}?force=1`, {
                        method: "DELETE",
                    })
                )
            );

            await fetchAssets();
            await fetchLoanRequests();
            showAlert("Escrow atascado limpiado en modo prueba.", "Listo");
        } catch (error) {
            console.error("Error cleaning stuck escrow:", error);
            showAlert("No se pudo limpiar el escrow atascado.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCreateEscrowFromLoanRequest = async (lr: LoanRequest) => {
        if (!address) {
            showAlert("Conecta la wallet primero");
            return;
        }

        const borrowerWallet = lr.borrower_wallet;
        if (!borrowerWallet) {
            showAlert("No se encontró la wallet del solicitante");
            return;
        }

        setIsProcessing(lr.id);
        try {
            // Usar un engagementId único por intento para evitar colisiones si el admin reintenta
            const engagementId = `${lr.id}-${Date.now()}`;
            const payload = {
                signer: address,
                engagementId,
                title: `Prestamo $${lr.amount_requested.toLocaleString()} - ${lr.borrower_name}`,
                roles: {
                    approver: address,
                    serviceProvider: borrowerWallet,
                    platformAddress: address,
                    releaseSigner: address,
                    disputeResolver: address,
                    receiver: borrowerWallet,
                },
                description: `Prestamo de $${lr.amount_requested.toLocaleString()} respaldado por ${lr.asset_ids.length} garantia(s). Colateral total: $${lr.collateral_value.toLocaleString()}`,
                amount: lr.amount_requested,
                platformFee: 0,
                milestones: [{ description: `Desembolso prestamo $${lr.amount_requested.toLocaleString()}` }],
                trustline: {
                    symbol: usdcSymbol,
                    address: usdcIssuer,
                },
            };

            const response = await deployEscrow(payload, "single-release");
            if (response?.status === "FAILED") throw new Error("deployEscrow FAILED");
            if (!response?.unsignedTransaction) throw new Error("No unsigned transaction");

            const sendResponse = await signAndSendXdr(response.unsignedTransaction);
            if (!sendResponse || sendResponse.status !== "SUCCESS") throw new Error("Send failed");

            const contractId =
                (response as any).contractId ||
                (await waitForEscrowContractId(address, engagementId));
            console.log("📝 Contract ID obtenido:", contractId);

            const lrPatchBody: any = { status: "escrow_created" };
            if (contractId) lrPatchBody.contract_id = contractId;
            await fetch(`/api/loan-requests/${lr.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lrPatchBody),
            });

            for (const assetId of lr.asset_ids) {
                try {
                    const assetPatchBody: any = { status: "funding_requested" };
                    if (contractId) assetPatchBody.contract_id = contractId;
                    const patchRes = await fetch(`/api/assets/${assetId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(assetPatchBody),
                    });
                    if (!patchRes.ok) {
                        console.error(`⚠️ Error actualizando asset ${assetId}:`, await patchRes.text());
                    }
                } catch (patchErr) {
                    console.error(`⚠️ Error PATCH asset ${assetId}:`, patchErr);
                }
            }

            await fetchAssets();
            await fetchLoanRequests();
            showAlert("Escrow creado exitosamente", "Éxito");
        } catch (err: any) {
            if (err?.response) {
                console.error("Trustless Work: deployEscrow response", err.response.status, err.response.data);
            } else {
                console.error("Error creando escrow:", err);
            }
            showAlert(
                getTrustlessWorkErrorMessage(
                    err,
                    "Error creando el escrow. Revisa la consola."
                )
            );
        } finally {
            setIsProcessing(null);
        }
    };

    // Redirect si no está autenticado
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/company/login");
        }
    }, [status, router]);

    // Fetch loan requests cuando carga
    useEffect(() => {
        if (session) {
            fetchLoanRequests();
        }
    }, [session]);

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
    const escrowGroupedAssetsByLeaderId = useMemo(
        () => buildEscrowGroupsByLeaderId(assets),
        [assets]
    );
    const visibleAssets = useMemo(() => {
        return filterVisibleEscrowLeaderAssets(assets, escrowActionOwnerByAssetId);
    }, [assets, escrowActionOwnerByAssetId]);
    const normalizeLoanStatus = (status?: string) => (status || "").trim().toLowerCase();
    const isPendingLoan = (status?: string) => {
        const normalized = normalizeLoanStatus(status);
        return normalized === "pending" || normalized === "approved";
    };
    const unifiedBorrowers = useMemo(() => {
        type BorrowerView = {
            borrowerWallet: string;
            borrowerName: string;
            assets: Asset[];
            totalAssetsCount: number;
            loans: LoanRequest[];
            pendingCount: number;
            totalRequested: number;
        };

        const grouped = new Map<string, BorrowerView>();

        assets.forEach((asset) => {
            const wallet = asset.ownerWallet || asset.owner_wallet || "sin-wallet";
            const current = grouped.get(wallet) || {
                borrowerWallet: wallet,
                borrowerName: asset.owner || "Sin nombre",
                assets: [],
                totalAssetsCount: 0,
                loans: [],
                pendingCount: 0,
                totalRequested: 0,
            };
            current.totalAssetsCount += 1;
            if (
                (asset.status === "funding_requested" || asset.status === "funded") &&
                !isEscrowActionOwner(asset)
            ) {
                grouped.set(wallet, current);
                return;
            }
            current.assets.push(asset);
            if (asset.status === "pending_review") {
                current.pendingCount += 1;
            }
            grouped.set(wallet, current);
        });

        loanRequests.forEach((loan) => {
            const wallet = loan.borrower_wallet || "sin-wallet";
            const current = grouped.get(wallet) || {
                borrowerWallet: wallet,
                borrowerName: loan.borrower_name || "Sin nombre",
                assets: [],
                totalAssetsCount: 0,
                loans: [],
                pendingCount: 0,
                totalRequested: 0,
            };
            current.borrowerName = loan.borrower_name || current.borrowerName;
            current.loans.push(loan);
            current.pendingCount += isPendingLoan(loan.status) ? 1 : 0;
            current.totalRequested += loan.amount_requested || 0;
            grouped.set(wallet, current);
        });

        return Array.from(grouped.values()).sort((a, b) => {
            if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
            return b.totalRequested - a.totalRequested;
        });
    }, [assets, loanRequests, isEscrowActionOwner]);

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
        const confirmed = await requestConfirm(
            "¿Estás seguro de eliminar este activo? Esta acción es irreversible."
        );
        if (!confirmed) return;

        setIsProcessing(id);
        try {
            const response = await fetch(`/api/assets/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setAssets(assets.filter((a) => a.id !== id));
                showAlert("✅ Activo rechazado y eliminado", "Listo");
            } else {
                showAlert("❌ Error al eliminar el activo", "Error");
            }
        } catch (error) {
            console.error("Error:", error);
            showAlert("❌ Error al eliminar el activo", "Error");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleTokenize = async (id: string) => {
        if (!address) {
            showAlert("Primero conectá la wallet de la empresa");
            return;
        }

        if (!nftContractId) {
            showAlert("Falta configurar NEXT_PUBLIC_NFT_CONTRACT_ID");
            return;
        }

        const asset = assets.find((item) => item.id === id);
        if (!asset) {
            showAlert("No se encontró el activo");
            return;
        }

        const borrowerWallet = asset.ownerWallet || asset.owner_wallet;
        if (!borrowerWallet) {
            showAlert("El solicitante no tiene wallet asociada");
            return;
        }

        setIsProcessing(id);
        try {
            const server = new StellarSdk.rpc.Server(sorobanRpcUrl, {
                allowHttp: sorobanRpcUrl.startsWith("http://"),
            });

            const account = await server.getAccount(address);
            const contract = new StellarSdk.Contract(nftContractId);
            // Construir URL completa para el metadata
            const documentPath = asset.documents?.property || asset.documents?.insurance || "";
            const assetUri = documentPath
                ? `${window.location.origin}${documentPath}`
                : `${window.location.origin}/api/assets/${asset.id}`;

            // Usar xdr directamente para tipos específicos
            const { xdr } = StellarSdk;

            const tx = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: testnetPassphrase,
            })
                .addOperation(
                    contract.call(
                        "mint",
                        new StellarSdk.Address(borrowerWallet).toScVal(),
                        xdr.ScVal.scvString(asset.id),
                        xdr.ScVal.scvString(asset.type),
                        xdr.ScVal.scvU64(xdr.Uint64.fromString(String(asset.value))),
                        xdr.ScVal.scvString(assetUri)
                    )
                )
                .setTimeout(30)
                .build();

            const prepared = await server.prepareTransaction(tx);
            const signed = await freighter.signTransaction(prepared.toXDR(), {
                networkPassphrase: testnetPassphrase,
            });

            const signedAny = signed as { signedTxXdr?: string; signedXDR?: string; xdr?: string };
            const signedXdr =
                typeof signed === "string"
                    ? signed
                    : signedAny?.signedTxXdr || signedAny?.signedXDR || signedAny?.xdr;

            if (!signedXdr) {
                throw new Error("No se pudo firmar la transacción");
            }

            const rpcRequest = async (method: string, params: Record<string, unknown>) => {
                const response = await fetch(sorobanRpcUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method,
                        params,
                    }),
                });

                const json = await response.json();
                if (json.error) {
                    throw new Error(json.error.message || "RPC error");
                }
                return json.result;
            };

            const sendResponse = await rpcRequest("sendTransaction", {
                transaction: signedXdr,
            });

            if (sendResponse?.status === "FAILED") {
                throw new Error("La transacción falló");
            }

            if (sendResponse?.hash) {
                console.log(
                    "✅ Mint TX:",
                    `https://stellar.expert/explorer/testnet/tx/${sendResponse.hash}`
                );
            }

            if (sendResponse?.status === "PENDING") {
                for (let attempt = 0; attempt < 8; attempt += 1) {
                    const txResponse = await rpcRequest("getTransaction", {
                        hash: sendResponse.hash,
                    });
                    if (txResponse?.status === "SUCCESS") break;
                    if (txResponse?.status === "FAILED") {
                        throw new Error("La transacción falló");
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1200));
                }
            }

            const patchResponse = await fetch(`/api/assets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "tokenized" }),
            });

            if (patchResponse.ok) {
                setAssets(
                    assets.map((item) =>
                        item.id === id ? { ...item, status: "tokenized" } : item
                    )
                );
            }

            showAlert("✅ NFT tokenizado en el contrato", "Listo");
        } catch (error) {
            console.error("Error tokenizando:", error);
            showAlert("Error tokenizando el NFT. Revisá la consola.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCreateEscrow = async (asset: Asset) => {
        if (!address) {
            showAlert("Primero conectá la wallet de la empresa");
            return;
        }

        const borrowerWallet = asset.ownerWallet || asset.owner_wallet;
        if (!borrowerWallet) {
            showAlert("El solicitante no tiene wallet asociada");
            return;
        }

        if (!usdcIssuer) {
            showAlert("Falta configurar NEXT_PUBLIC_USDC_ISSUER en .env.local");
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
            const err = error as { response?: { status?: number; data?: unknown } };
            if (err?.response) {
                console.error("Trustless Work: deployEscrow response", err.response.status, err.response.data);
                showAlert(
                    getTrustlessWorkErrorMessage(
                        err,
                        `Error creando el escrow. Status ${err.response.status}`
                    )
                );
            } else {
                console.error("Error:", error);
                showAlert("Error creando el escrow. Revisá la consola.");
            }
        } finally {
            setIsProcessing(null);
        }
    };

    const handleSendFunds = async (asset: Asset, attempt = 1) => {
        if (!address) {
            showAlert("Primero conectá la wallet de la empresa");
            return;
        }

        if (!asset.contractId && !asset.contract_id) {
            showAlert("Este activo no tiene escrow asociado");
            return;
        }

        // Verificar si el escrow ya fue liberado antes de continuar
        const alreadyReleased = await verifyEscrowStatus(asset);
        if (alreadyReleased) {
            return; // Ya está liberado, no hacer nada más
        }

        setIsProcessing(asset.id);
        try {
            console.log(`🚀 handleSendFunds - Intento ${attempt}`);
            const contractId = asset.contractId || asset.contract_id || "";

            const [escrowInfo] = await getEscrowByContractIds({
                contractIds: [contractId],
                validateOnChain: false,
            });

            const milestone = (escrowInfo?.milestones || [])[0] as { status?: string; approved?: boolean } | undefined;

            // 🎯 Mostrar estado actual del milestone
            console.log("📊 Estado del milestone:", {
                status: milestone?.status,
                approved: milestone?.approved,
                flags: escrowInfo?.flags
            });

            // Si el milestone ya está aprobado, podemos saltar el approve
            const isMilestoneApproved = milestone?.approved || escrowInfo?.flags?.approved;
            const isMilestoneCompleted = milestone?.status === "completed";

            if (!isMilestoneCompleted && !isMilestoneApproved) {
                showAlert("⏳ El Solicitante debe marcar la etapa como completada antes de liberar fondos.\n\nEsperá a que el Solicitante haga click en 'Marcar completado' en su panel.");
                return;
            }

            if (isMilestoneApproved) {
                console.log("✅ Milestone ya está aprobado, se saltará el paso de approve");
            }

            if (escrowInfo?.flags?.released) {
                showAlert("Este escrow ya fue liberado.");
                return;
            }

            const balances = await getMultipleBalances({ addresses: [contractId] });
            const currentBalance = balances?.[0]?.balance || 0;
            const loanAmount = getLoanAmountForAsset(asset);

            const confirmMessage =
                currentBalance > 0
                    ? `El escrow ya está fondeado. Se aprobará el milestone y se liberarán ${loanAmount} USDC.`
                    : `¿Confirmás el envío de ${loanAmount} USDC al solicitante? Esta acción fondea y libera USDC.`;

            const confirmed = await requestConfirm(confirmMessage);
            if (!confirmed) return;

            const approverAddress = escrowInfo?.roles?.approver;
            const releaseSignerAddress = escrowInfo?.roles?.releaseSigner;

            if (approverAddress && approverAddress !== address) {
                showAlert("Esta wallet no es el aprobador del escrow. Usá la wallet del aprobador.");
                return;
            }

            if (releaseSignerAddress && releaseSignerAddress !== address) {
                showAlert("Esta wallet no es el release signer del escrow. Usá la wallet correcta.");
                return;
            }

            if (currentBalance <= 0) {
                const fundResponse = await fundEscrow(
                    {
                        amount: loanAmount,
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
            }

            // PASO 2: Aprobar milestone (con manejo de "already approved")
            let approveSuccess = isMilestoneApproved; // ✅ Si ya está aprobado, saltamos este paso

            if (isMilestoneApproved) {
                console.log("⏭️ Saltando approveMilestone - ya está aprobado");
            }

            try {
                if (!approveSuccess) {
                    const approveResponse = await approveMilestone(
                        {
                            contractId,
                            milestoneIndex: "0",
                            approver: approverAddress || address,
                        },
                        "single-release"
                    );

                    if (approveResponse?.status === "FAILED") {
                        const errorMsg = JSON.stringify(approveResponse);
                        if (errorMsg.includes("already been approved")) {
                            console.log("⚠️ Milestone ya estaba aprobado, continuando...");
                            approveSuccess = true;
                        } else {
                            console.error("Trustless Work: approveMilestone FAILED", approveResponse);
                            throw new Error("Respuesta FAILED al aprobar milestone");
                        }
                    } else if (!approveResponse?.unsignedTransaction) {
                        console.log("⚠️ No hay transacción de approve, asumiendo que ya está aprobado...");
                        approveSuccess = true;
                    } else {
                        const approveSend = await signAndSendXdr(approveResponse.unsignedTransaction);
                        if (!approveSend || approveSend.status !== "SUCCESS") {
                            console.error("Trustless Work: sendTransaction (approve) FAILED", approveSend);
                            throw new Error("No se pudo enviar la transaccion de aprobacion");
                        }
                        approveSuccess = true;
                    }
                }  // ✅ Cierre del if (!approveSuccess)
            } catch (error: any) {
                if (error.message?.includes("already been approved")) {
                    console.log("⚠️ Milestone ya estaba aprobado (catch), continuando...");
                    approveSuccess = true;
                } else {
                    throw error;
                }
            }

            if (!approveSuccess) {
                throw new Error("No se pudo aprobar el milestone");
            }

            // PASO 3: Liberar fondos (con manejo de "already released")
            let releaseSuccess = false;
            try {
                const releaseResponse = await releaseFunds(
                    {
                        contractId,
                        releaseSigner: address,
                    },
                    "single-release"
                );

                if (releaseResponse?.status === "FAILED") {
                    const errorMsg = JSON.stringify(releaseResponse);
                    if (errorMsg.includes("already released") || errorMsg.includes("completed")) {
                        console.log("⚠️ Fondos ya liberados, continuando...");
                        releaseSuccess = true;
                    } else {
                        console.error("Trustless Work: releaseFunds FAILED", releaseResponse);
                        throw new Error("Respuesta FAILED al liberar fondos");
                    }
                } else if (!releaseResponse?.unsignedTransaction) {
                    console.log("⚠️ No hay transacción de release, asumiendo que ya está liberado...");
                    releaseSuccess = true;
                } else {
                    const releaseSend = await signAndSendXdr(releaseResponse.unsignedTransaction);
                    if (!releaseSend || releaseSend.status !== "SUCCESS") {
                        console.error("Trustless Work: sendTransaction (release) FAILED", releaseSend);
                        throw new Error("No se pudo enviar la transaccion de liberacion");
                    }
                    releaseSuccess = true;
                }
            } catch (error: any) {
                if (error.message?.includes("already released") || error.message?.includes("completed")) {
                    console.log("⚠️ Fondos ya liberados (catch), continuando...");
                    releaseSuccess = true;
                } else {
                    throw error;
                }
            }

            if (!releaseSuccess) {
                throw new Error("No se pudieron liberar los fondos");
            }

            const relatedAssets = assets.filter((item) => {
                const itemContractId = item.contractId || item.contract_id;
                return itemContractId === contractId;
            });
            const assetsToPatch = relatedAssets.length > 0 ? relatedAssets : [asset];

            await Promise.all(
                assetsToPatch.map(async (item) => {
                    await fetch(`/api/assets/${item.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "funded" }),
                    });
                })
            );

            const linkedLoan = loanRequestByContractId.get(contractId);
            if (linkedLoan) {
                await fetch(`/api/loan-requests/${linkedLoan.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "funded" }),
                });
            }

            await fetchAssets();
            await fetchLoanRequests();
            showAlert("✅ Fondos enviados correctamente al solicitante", "Listo");
        } catch (error) {
            const MAX_RETRIES = 3;

            // 🔄 Auto-retry: si falla pero no terminó, reintentar automáticamente
            if (attempt < MAX_RETRIES) {
                console.log(`🔄 Error en intento ${attempt}, reintentando automáticamente (${attempt + 1}/${MAX_RETRIES})...`);
                setIsProcessing(null);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
                return handleSendFunds(asset, attempt + 1);
            }

            // Si ya agotó los reintentos, mostrar error
            const err = error as { response?: { status?: number; data?: unknown } };
            if (err?.response) {
                console.error("Trustless Work: send funds response", err.response.status, err.response.data);
                showAlert(`Error enviando fondos después de ${MAX_RETRIES} intentos. Status ${err.response.status}`);
            } else {
                console.error("Error:", error);
                showAlert(`Error enviando fondos después de ${MAX_RETRIES} intentos. Revisá la consola.`);
            }
        } finally {
            setIsProcessing(null);
        }
    };

    const getIcon = (type: Asset["type"]) => {
        switch (type) {
            case "tractor":
            case "maquinaria":
                return <Tractor className="w-6 h-6" />;
            case "casa":
            case "departamento":
            case "inmueble":
            case "house":
                return <Building2 className="w-6 h-6" />;
            case "auto":
            case "vehiculo":
            case "car":
                return <Car className="w-6 h-6" />;
            default:
                return <FileText className="w-6 h-6" />;
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
    const getAssetStatusLabel = (status: Asset["status"]) => {
        switch (status) {
            case "pending_review":
                return "En revisión";
            case "approved":
                return "Aprobado";
            case "tokenized":
                return "Tokenizado";
            case "funding_requested":
                return "Escrow creado";
            case "funded":
                return "Acreditado";
            default:
                return status;
        }
    };

    const pendingCount = assets.filter((a) => a.status === "pending_review").length;
    const approvedCount = assets.filter((a) => a.status === "approved").length;
    const tokenizedCount = assets.filter(
        (a) =>
            a.status === "tokenized" ||
            a.status === "funding_requested" ||
            a.status === "funded"
    ).length;
    const fundedCount = assets.filter((a) => a.status === "funding_requested" || a.status === "funded").length;

    // Componente de acciones reutilizable para tabla y cards
    const AssetActions = ({ asset }: { asset: Asset }) => (
        <div className="flex flex-wrap items-center gap-2">
            {asset.status === "pending_review" && (
                <button
                    onClick={() => setSelectedAsset(asset)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    title="Ver documentos"
                >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-bold">Ver Docs</span>
                </button>
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
                <span className="text-xs text-cyan-300 font-bold bg-cyan-500/10 px-3 py-2 rounded-lg border border-cyan-500/20 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Listo para solicitud unificada
                </span>
            )}

            {asset.status === "funding_requested" && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-emerald-300 font-semibold">
                        Monto préstamo: ${getLoanAmountForAsset(asset).toLocaleString()} USDC
                    </span>
                    {/* 🎯 Indicador de estado del milestone */}
                    {(() => {
                        const contractId = asset.contractId || asset.contract_id;
                        const ms = contractId ? milestoneStatuses[contractId] : null;
                        if (ms?.approved) {
                            return (
                                <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Milestone aprobado - Listo para liberar
                                </span>
                            );
                        } else if (ms?.completed) {
                            return (
                                <span className="text-xs text-blue-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Milestone completado - Pendiente de aprobación
                                </span>
                            );
                        } else {
                            return (
                                <span className="text-xs text-yellow-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Esperando que el Solicitante marque completado...
                                </span>
                            );
                        }
                    })()}
                    {isEscrowActionOwner(asset) ? (
                        <>
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
                            <button
                                onClick={() => handleClearStuckEscrow(asset)}
                                disabled={isProcessing === asset.id}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isProcessing === asset.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3 h-3" />
                                )}
                                Limpiar escrow atascado
                            </button>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">
                            Este escrow se gestiona desde otra garantía del mismo préstamo.
                        </span>
                    )}
                </div>
            )}

            {asset.status === "funded" && (
                <span className="text-xs text-green-500 font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completado
                </span>
            )}

            <button
                onClick={() => handleReject(asset.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors ml-auto"
                title="Eliminar activo"
            >
                <Trash2 className="w-4 h-4" />
            </button>
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
                        {/* 💰 Balance USDC */}
                        {address && walletBalance !== null && (
                            <span className="hidden sm:flex items-center gap-2 text-[10px] md:text-xs bg-slate-800/60 text-slate-300 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-white/[0.06]">
                                <Coins className="w-3 h-3 text-slate-400" />
                                {walletBalance.toLocaleString()} USDC
                            </span>
                        )}

                        {/* Wallet de la Empresa */}
                        {address ? (
                            <span className="flex items-center gap-2 text-[10px] md:text-xs bg-slate-800/60 text-slate-300 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-white/[0.06]">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full"></div>
                                {address.substring(0, 4)}...{address.substring(address.length - 4)}
                            </span>
                        ) : (
                            <button
                                onClick={() => connect()}
                                disabled={isConnecting}
                                className="flex items-center gap-2 text-[10px] md:text-xs bg-slate-800/60 text-slate-300 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-white/[0.06] hover:bg-slate-700/60 transition-colors"
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
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden transition-all hover:border-yellow-500/20">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-500/60 to-transparent" />
                        <p className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)] text-white">
                            {pendingCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            Pendientes
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden transition-all hover:border-blue-500/20">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/60 to-transparent" />
                        <p className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)] text-white">
                            {approvedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            Aprobados
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden transition-all hover:border-blue-500/20">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/40 to-transparent" />
                        <p className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)] text-white">
                            {tokenizedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            NFTs emitidos
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-4 md:p-5 rounded-2xl border border-white/[0.04] relative overflow-hidden transition-all hover:border-emerald-500/20">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/60 to-transparent" />
                        <p className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)] text-white">
                            {fundedCount}
                        </p>
                        <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-wider mt-1">
                            En Fondeo
                        </p>
                    </div>
                </div>

                {/* SOLICITANTES UNIFICADOS */}
                <div className="bg-slate-900/50 rounded-[2rem] border border-white/[0.05] overflow-hidden">
                    <div className="p-6 border-b border-white/[0.05]">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold font-[family-name:var(--font-syne)] text-white">
                                    Solicitantes
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Garantías y préstamos en una sola vista por usuario
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 text-slate-400 border border-white/[0.06] px-3 py-1 text-xs font-semibold">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                {assets.filter((a) => a.status === "pending_review").length + loanRequests.filter((lr) => isPendingLoan(lr.status)).length} pendientes
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Cargando solicitantes...</p>
                        </div>
                    ) : unifiedBorrowers.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400">No hay solicitantes para mostrar</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.05]">
                            {unifiedBorrowers.map((borrower) => (
                                <div key={borrower.borrowerWallet} className="p-6 hover:bg-white/[0.01] transition-colors">
                                    {/* Fila Principal del Usuario */}
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                                        {/* Izquierda: Info de usuario y resumen */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/[0.08] flex items-center justify-center text-white font-bold text-sm font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                                    {borrower.borrowerName.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white leading-tight">
                                                        {borrower.borrowerName}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        {borrower.borrowerWallet.slice(0, 8)}...{borrower.borrowerWallet.slice(-6)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                                                    {borrower.assets.length} Garantías
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                    {borrower.loans.length} Solicitudes
                                                </span>
                                                {borrower.pendingCount > 0 && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                        <span className="text-yellow-500/80 font-medium">
                                                            {borrower.pendingCount} pendientes
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Derecha: Montos y Call to action principal */}
                                        <div className="md:text-right flex flex-col items-start md:items-end">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                                                Total Solicitado
                                            </p>
                                            <div className="text-3xl font-bold font-[family-name:var(--font-syne)] text-white">
                                                $ {borrower.totalRequested.toLocaleString()} <span className="text-base text-slate-500 font-normal">USD</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalles (Garantías y Préstamos) estilo sub-rows */}
                                    {(borrower.assets.length > 0 || borrower.loans.length > 0) && (
                                        <div className="mt-6 pl-4 md:pl-16 space-y-4">

                                            {/* SECCIÓN PRESTAMOS */}
                                            {borrower.loans.map((lr) => {
                                                const lrAssets = assets.filter((a) => lr.asset_ids.includes(a.id));
                                                // Definir visuales del estado
                                                const normalizedLoanStatus = normalizeLoanStatus(lr.status);
                                                const isPending = isPendingLoan(normalizedLoanStatus);
                                                const isFunded = normalizedLoanStatus === "funded";
                                                const dotColor = isPending ? "bg-yellow-500" : isFunded ? "bg-emerald-500" : "bg-blue-500";
                                                const statusText = isPending ? "En revisión / Pendiente" : normalizedLoanStatus === "approved" ? "Aprobado" : normalizedLoanStatus === "escrow_created" ? "Escrow Creado" : "Préstamo Acreditado";

                                                return (
                                                    <div key={lr.id} className="bg-slate-900/40 rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-colors relative overflow-hidden group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/[0.08] group-hover:bg-white/[0.15] transition-colors"></div>

                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                                                        <Rocket className="w-4 h-4 text-slate-400" />
                                                                        Préstamo por $ {lr.amount_requested.toLocaleString()} USD
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.05] bg-slate-950 text-[10px] font-semibold text-slate-400">
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                                                        {statusText}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-2 flex gap-3">
                                                                    <span>Colateral total: <strong className="text-slate-300">${lr.collateral_value.toLocaleString()}</strong></span>
                                                                    <span>LTV: <strong className="text-slate-300">{(lr.ltv_ratio * 100).toFixed(0)}%</strong></span>
                                                                </div>

                                                                {/* Garantias tags */}
                                                                {lrAssets.length > 0 && (
                                                                    <div className="flex gap-2 mt-3 flex-wrap">
                                                                        {lrAssets.map((a) => (
                                                                            <span key={a.id} className="text-[10px] bg-slate-800/60 text-slate-400 px-2.5 py-1 rounded-lg border border-white/[0.04] flex items-center gap-1.5">
                                                                                <ShieldCheck className="w-3 h-3 text-slate-500" /> {a.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 md:w-auto w-full">
                                                                {isPendingLoan(lr.status) && (
                                                                    <button
                                                                        onClick={() => handleCreateEscrowFromLoanRequest(lr)}
                                                                        disabled={isProcessing === lr.id}
                                                                        className="flex-1 md:flex-none bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                                    >
                                                                        {isProcessing === lr.id ? (
                                                                            <><Loader2 className="w-4 h-4 animate-spin" /> Creando Escrow...</>
                                                                        ) : (
                                                                            <><Rocket className="w-4 h-4" /> Aprobar e ir a Fondeo</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteLoanRequest(lr.id)}
                                                                    disabled={isDeletingLoanRequestId === lr.id}
                                                                    className="p-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-400/70 hover:text-red-400 transition-colors"
                                                                    title="Eliminar Solicitud"
                                                                >
                                                                    {isDeletingLoanRequestId === lr.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* SECCIÓN GARANTÍAS */}
                                            {(() => {
                                                const seenContracts = new Set<string>();
                                                const assetsForDisplay = borrower.assets.filter((asset) => {
                                                    const contractId = asset.contractId || asset.contract_id;
                                                    const isUnifiedState =
                                                        asset.status === "funding_requested" || asset.status === "funded";
                                                    if (!isUnifiedState || !contractId) return true;
                                                    if (seenContracts.has(contractId)) return false;
                                                    seenContracts.add(contractId);
                                                    return true;
                                                });

                                                return assetsForDisplay.map((asset) => {
                                                // Mostrar acciones para las garantías
                                                return (
                                                    <div key={asset.id} className="bg-slate-900/40 rounded-xl p-4 border border-white/[0.03] hover:border-white/[0.08] transition-colors relative overflow-hidden group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/50 to-cyan-500/50 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-sm font-bold text-slate-200">
                                                                        Garantía: {asset.name}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 font-mono ml-2">ID: {asset.id.slice(0, 8)}...</span>
                                                                </div>

                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md">
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'funded' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                                                        Estado: {getAssetStatusLabel(asset.status)}
                                                                    </span>

                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md">
                                                                        Valor Aprobado: <strong className="text-white">${getLoanAmountForAsset(asset).toLocaleString()}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full md:w-auto">
                                                                <AssetActions asset={asset} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                                });
                                            })()}

                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
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

            {modalState.open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-blue-500/10"
                    >
                        {/* Icono según el tipo de mensaje */}
                        <div className="flex justify-center mb-6">
                            {modalState.title.toLowerCase().includes('error') || modalState.message?.includes('❌') ? (
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                                    <XCircle className="w-8 h-8 text-red-500" />
                                </div>
                            ) : modalState.title.toLowerCase().includes('éxito') || modalState.title.toLowerCase().includes('listo') || modalState.message?.includes('✅') ? (
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                            ) : modalState.title.toLowerCase().includes('advertencia') || modalState.message?.includes('⚠️') ? (
                                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                                    <Info className="w-8 h-8 text-blue-500" />
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
                                {modalState.title}
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                                {modalState.message}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {!modalState.hideCancel && (
                                <button
                                    onClick={() => {
                                        setModalState((prev) => ({ ...prev, open: false }));
                                        modalResolverRef.current?.(false);
                                        modalResolverRef.current = null;
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
                                >
                                    {modalState.cancelLabel}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setModalState((prev) => ({ ...prev, open: false }));
                                    modalResolverRef.current?.(true);
                                    modalResolverRef.current = null;
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all shadow-lg ${modalState.title.toLowerCase().includes('error')
                                    ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-500/20'
                                    : modalState.title.toLowerCase().includes('éxito') || modalState.title.toLowerCase().includes('listo')
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20'
                                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
                                    }`}
                            >
                                {modalState.confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}
