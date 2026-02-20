"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useReleaseFunds, useSendTransaction, useGetEscrowFromIndexerByContractIds } from "@trustless-work/escrow";
import * as freighterApi from "@stellar/freighter-api";
import { Loader2, AlertCircle, CheckCircle, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function RecoverExcess() {
    const { address, connect, isConnecting } = useWallet();
    const { releaseFunds } = useReleaseFunds();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();

    // Contract ID del escrow con doble fondeo (500 + 500 = 1000)
    const [contractId, setContractId] = useState("CCY5SY3PE5UKTSJSWKR5SOYBRLUBJW3BFHJMXBIEEIOSWIL45ACJWBYC");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [escrowInfo, setEscrowInfo] = useState<any>(null);

    const freighter = freighterApi.default ? freighterApi.default : freighterApi;
    const testnetPassphrase = "Test SDF Network ; September 2015";

    const checkEscrowStatus = async () => {
        if (!contractId) return;

        try {
            const data = await getEscrowByContractIds({ contractIds: [contractId] });
            if (data && data.length > 0) {
                setEscrowInfo(data[0]);
                console.log("Info del escrow:", data[0]);
            }
        } catch (e) {
            console.error("Error consultando escrow:", e);
        }
    };

    const handleRecover = async () => {
        if (!address) {
            alert("Conectá tu wallet primero");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            console.log("🔓 Intentando liberar excedente del contrato:", contractId);

            // Intentar liberar los fondos (los 1000 USDC irán al borrower)
            // Luego el borrower puede devolver los 500 extra manualmente
            const releaseResponse = await releaseFunds(
                {
                    contractId,
                    releaseSigner: address,
                },
                "single-release"
            );

            console.log("📥 Respuesta de releaseFunds:", releaseResponse);

            if (releaseResponse?.status === "FAILED") {
                // Si falla porque ya está liberado, eso está bien
                const errorMsg = JSON.stringify(releaseResponse);
                if (errorMsg.includes("already released") || errorMsg.includes("completed")) {
                    setResult("✅ El escrow ya estaba liberado.");
                    setLoading(false);
                    return;
                }
                throw new Error("Release failed: " + errorMsg);
            }

            if (!releaseResponse?.unsignedTransaction) {
                setError("No se recibió transacción para firmar");
                setLoading(false);
                return;
            }

            // Firmar con Freighter
            const signed = await freighter.signTransaction(
                releaseResponse.unsignedTransaction,
                { networkPassphrase: testnetPassphrase }
            );

            const signedXdr = typeof signed === "string" ? signed : (signed as any)?.signedTxXdr;

            if (!signedXdr) {
                setError("No se pudo firmar la transacción");
                setLoading(false);
                return;
            }

            // Enviar
            const sendResponse = await sendTransaction(signedXdr);
            console.log("📤 Respuesta:", sendResponse);

            if (sendResponse?.status === "SUCCESS") {
                setResult("✅ ¡Fondos liberados! Los 1000 USDC fueron al Solicitante.");
            } else {
                setError("La transacción no se completó");
            }
        } catch (err: any) {
            console.error("❌ Error:", err);
            setError(err.message || "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 max-w-lg w-full"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Recuperar Excedente</h1>
                    <p className="text-slate-400">
                        El escrow de 500 USDC tiene 1000 USDC (doble fondeo).<br />
                        Liberar los fondos para recuperar el excedente.
                    </p>
                </div>

                {!address ? (
                    <button
                        onClick={() => connect()}
                        disabled={isConnecting}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                        Conectar Wallet
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <label className="text-sm text-slate-400 block mb-2">Contract ID</label>
                            <input
                                type="text"
                                value={contractId}
                                onChange={(e) => setContractId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-300"
                            />
                        </div>

                        <button
                            onClick={checkEscrowStatus}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
                        >
                            Verificar Estado del Escrow
                        </button>

                        {escrowInfo && (
                            <div className="bg-slate-800/30 p-4 rounded-xl text-sm">
                                <p><strong>Estado:</strong> {escrowInfo.status}</p>
                                <p><strong>Monto:</strong> {escrowInfo.amount} {escrowInfo.trustline?.symbol}</p>
                                <p><strong>Receiver:</strong> {escrowInfo.roles?.receiver?.substring(0, 10)}...</p>
                            </div>
                        )}

                        <div className="bg-slate-800/30 p-4 rounded-xl text-sm text-slate-400">
                            <p><strong>Wallet conectada:</strong></p>
                            <p className="font-mono text-xs mt-1">{address}</p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-sm text-yellow-400">
                            <strong>⚠️ Importante:</strong> Al liberar, los 1000 USDC irán al Solicitante.
                            Luego deberás coordinar con el Solicitante para que te devuelva los 500 USDC extra.
                        </div>

                        <button
                            onClick={handleRecover}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Liberar 1000 USDC
                                </>
                            )}
                        </button>
                    </div>
                )}

                {result && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-center"
                    >
                        {result}
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center"
                    >
                        <strong>Error:</strong> {error}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
