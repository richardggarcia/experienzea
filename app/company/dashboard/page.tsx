"use client";

import { useState, useEffect, useRef } from "react";
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
    XCircle
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
                    
                    // Actualizar la base de datos automáticamente
                    const response = await fetch(`/api/assets/${asset.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "funded" }),
                    });

                    if (response.ok) {
                        await fetchAssets();
                        showAlert("Los fondos ya fueron liberados anteriormente. El estado se ha actualizado.", "Escrow ya liberado");
                        return true;
                    }
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
        const confirmed = await requestConfirm(
            "¿Estás seguro de rechazar este activo? Se eliminará permanentemente."
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

        if (!process.env.NEXT_PUBLIC_TW_API_KEY) {
            showAlert("Falta configurar NEXT_PUBLIC_TW_API_KEY en .env.local");
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
                showAlert(`Error creando el escrow. Status ${err.response.status}`);
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

            const confirmMessage =
                currentBalance > 0
                    ? "El escrow ya está fondeado. Se aprobará el milestone y se liberarán los fondos."
                    : "¿Confirmás el envío de fondos al solicitante? Esta acción fondea y libera USDC.";

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

            const response = await fetch(`/api/assets/${asset.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "funded",
                }),
            });
            if (response.ok) {
                await fetchAssets();
                showAlert("✅ Fondos enviados correctamente al solicitante", "Listo");
            }
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
                <div className="flex flex-col gap-2">
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
                </div>
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
                        {/* 💰 Balance USDC */}
                        {address && walletBalance !== null && (
                            <span className="hidden sm:flex items-center gap-2 text-[10px] md:text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono border border-blue-500/20">
                                <Coins className="w-3 h-3" />
                                {walletBalance.toLocaleString()} USDC
                            </span>
                        )}
                        
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
                            NFTs emitidos
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
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold font-[family-name:var(--font-syne)] text-white">
                                    Activos Registrados
                                </h2>
                                <p className="text-slate-500 text-sm mt-1 font-[family-name:var(--font-manrope)]">
                                    Gestión de garantías y tokenización
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 text-xs font-semibold">
                                <Coins className="w-4 h-4" /> NFTs emitidos: {tokenizedCount}
                            </div>
                        </div>
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
                                                                {(asset.status === "tokenized" ||
                                                                    asset.status === "funding_requested" ||
                                                                    asset.status === "funded") && (
                                                                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold">
                                                                        <Coins className="w-3 h-3" /> NFT emitido
                                                                    </div>
                                                                )}
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
                                                    {(asset.status === "tokenized" ||
                                                        asset.status === "funding_requested" ||
                                                        asset.status === "funded") && (
                                                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold">
                                                            <Coins className="w-3 h-3" /> NFT emitido
                                                        </div>
                                                    )}
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
                                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all shadow-lg ${
                                    modalState.title.toLowerCase().includes('error')
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
