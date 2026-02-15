"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { v4 as uuidv4 } from "uuid";
import { Rocket, LogOut, Loader2, ArrowLeft, Plus, CheckCircle2, ShieldCheck, Tractor, Building2, Car, Coins, Check, X, AlertCircle, FileText, Upload } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { motion, AnimatePresence } from "framer-motion";

// Asset Type desde Supabase
interface Asset {
    id: string;
    type: 'tractor' | 'car' | 'house';
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

export default function Dashboard() {
    const { address, connect, isConnecting, disconnect } = useWallet();
    const router = useRouter();

    // State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [tempAssetId, setTempAssetId] = useState<string>("");

    // Cargar assets desde Supabase (filtrados por wallet del usuario)
    useEffect(() => {
        if (address) {
            fetchAssets();
        }
    }, [address]);

    // Cargar datos del usuario desde localStorage cuando se conecta la wallet
    useEffect(() => {
        if (address && typeof window !== 'undefined') {
            const savedProfile = localStorage.getItem(`user_profile_${address}`);
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                setNewAsset(prev => ({
                    ...prev,
                    owner: profile.name || ''
                }));
            }
        }
    }, [address]);

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
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Form State
    const [newAsset, setNewAsset] = useState<{
        type: 'tractor' | 'car' | 'house',
        name: string,
        value: string,
        owner: string,
        legalCheck: boolean,
        insuranceDoc?: string,
        propertyDoc?: string
    }>({
        type: 'tractor',
        name: '',
        value: '',
        owner: '',
        legalCheck: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcess, setIsProcess] = useState<string | null>(null);

    // Authentication Check
    if (isConnecting) return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    if (!address) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 text-slate-50 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.05] blur-[150px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 opacity-[0.1] blur-[120px] rounded-full pointer-events-none"></div>

                <div className="bg-slate-900/50 p-8 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-700 text-center backdrop-blur-md relative overflow-hidden z-10 transition-all hover:border-blue-500/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full"></div>
                    <h1 className="text-3xl font-bold mb-4 font-[family-name:var(--font-syne)] text-blue-500">Conectá tu Wallet</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed font-[family-name:var(--font-manrope)]">
                        Para gestionar tus activos y acceder a liquidez global, conectá tu billetera Freighter.
                    </p>
                    <button
                        onClick={() => connect()}
                        className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 mb-4 flex justify-center items-center gap-2"
                    >
                        <ShieldCheck className="w-5 h-5" />
                        Conectar Freighter
                    </button>
                    <button onClick={() => router.push("/")} className="text-sm text-slate-500 hover:text-blue-400 flex items-center justify-center gap-1 mx-auto transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // Handlers
    const handleSubmitForReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAsset.legalCheck) return alert("Debes aceptar la declaración jurada.");
        if (!newAsset.insuranceDoc) return alert("Debes subir el seguro del activo.");
        if (!newAsset.propertyDoc) return alert("Debes subir el título de propiedad.");

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
            // Mantener el nombre del owner para el próximo préstamo
            setNewAsset({ type: 'tractor', name: '', value: '', owner: newAsset.owner, legalCheck: false });
        } catch (error) {
            console.error('Error:', error);
            alert('Error guardando el activo. Intentá de nuevo.');
            setIsSubmitting(false);
        }
    };

    const getIcon = (type: string) => {
        if (type === 'tractor') return <Tractor className="w-8 h-8" />;
        if (type === 'house') return <Building2 className="w-8 h-8" />;
        return <Car className="w-8 h-8" />;
    }

    const getStatusBadge = (status: Asset['status']) => {
        switch (status) {
            case 'pending_review': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> EN REVISIÓN</div>;
            case 'approved': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> APROBADO</div>;
            case 'tokenized': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-500 border-purple-500/20 flex items-center gap-1"><Coins className="w-3 h-3" /> TOKENIZADO</div>;
            case 'funding_requested': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1"><Rocket className="w-3 h-3" /> FONDOS ENVIADOS</div>;
            case 'funded': return <div className="px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> COMPLETADO</div>;
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-50 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.03] blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 opacity-[0.05] blur-[120px] rounded-full pointer-events-none"></div>

            <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/[0.05] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.3)]">E</div>
                    <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">ExperienZea <span className="text-slate-500 font-normal text-base block md:inline font-[family-name:var(--font-manrope)]">| Dashboard</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:flex items-center gap-2 text-xs bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full font-mono border border-blue-500/20">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
                        {address.substring(0, 4)}...{address.substring(address.length - 4)}
                    </span>
                    <button onClick={() => { disconnect(); router.push("/"); }} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors" title="Desconectar">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tighter text-white font-[family-name:var(--font-syne)]">
                            Mis <span className="text-blue-500">Garantías</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-[family-name:var(--font-manrope)]">Subí tu documentación y esperá la aprobación para tokenizar.</p>
                    </div>
                    <button
                        onClick={() => {
                            setTempAssetId(uuidv4());
                            setShowForm(true);
                        }}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Plus className="w-5 h-5" /> Cargar Seguro Colateral
                    </button>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-slate-900/50 p-6 rounded-[2rem] shadow-lg border border-white/[0.05] backdrop-blur-sm group hover:border-blue-500/20 transition-all">
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Liquidez Disponible</p>
                        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">$0.00 <span className="text-lg text-slate-500 font-normal font-[family-name:var(--font-manrope)]">USDC</span></p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-[2rem] shadow-lg border border-white/[0.05] backdrop-blur-sm group hover:border-blue-500/20 transition-all">
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">Valor Tokenizado</p>
                        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">${assets.filter(a => a.status === 'tokenized' || a.status === 'funding_requested').reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-[2rem] shadow-lg border border-white/[0.05] backdrop-blur-sm group hover:border-blue-500/20 transition-all">
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 font-[family-name:var(--font-syne)]">En Revisión</p>
                        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">{assets.filter(a => a.status === 'pending_review').length}</p>
                    </div>
                </div>

                {/* Asset Grid */}
                <div className="grid md:grid-cols-3 gap-8 pb-32 relative">
                    <AnimatePresence mode="popLayout">
                        {assets.map(asset => (
                            <motion.div
                                key={asset.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-white/[0.05] relative overflow-hidden group hover:shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:border-blue-500/30 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                                        {getIcon(asset.type)}
                                    </div>
                                    {getStatusBadge(asset.status)}
                                </div>

                                <h3 className="text-xl font-bold mb-1 font-[family-name:var(--font-syne)] text-white">{asset.name}</h3>
                                <p className="text-slate-500 text-sm mb-4 font-mono">Titular: {asset.owner}</p>

                                <div className="bg-slate-950 border border-white/[0.05] rounded-xl p-4 mb-6">
                                    <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Valor Estimado</p>
                                    <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">${asset.value.toLocaleString()}</p>
                                </div>

                                {/* STATUS MESSAGES FOR BORROWER */}

                                {asset.status === 'pending_review' && (
                                    <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <FileText className="w-4 h-4" /> Documentación en revisión
                                    </div>
                                )}

                                {asset.status === 'approved' && (
                                    <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Aprobado - Tokenizando...
                                    </div>
                                )}

                                {asset.status === 'tokenized' && (
                                    <div className="w-full bg-purple-500/10 border border-purple-500/20 text-purple-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <Coins className="w-4 h-4" /> Tokenizado - Preparando fondeo...
                                    </div>
                                )}

                                {asset.status === 'funding_requested' && (
                                    <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <Rocket className="w-4 h-4" /> Esperando liberación de fondos
                                    </div>
                                )}

                                {asset.status === 'funded' && (
                                    <div className="w-full bg-green-500/10 border border-green-500/20 text-green-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> ¡Fondos Recibidos!
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {/* Empty State Upload Card */}
                        {assets.length === 0 && (
                            <motion.div
                                key="upload-card"
                                layout
                                onClick={() => {
                                    setTempAssetId(uuidv4());
                                    setShowForm(true);
                                }}
                                className="border-2 border-dashed border-slate-800 bg-slate-900/30 rounded-[2.5rem] flex flex-col items-center justify-center h-full min-h-[380px] text-slate-600 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all cursor-pointer group bg-slate-950 col-span-1 md:col-start-2"
                            >
                                <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300 shadow-xl">
                                    <Upload className="w-8 h-8 text-slate-700 group-hover:text-white transition-colors" />
                                </div>
                                <span className="font-bold text-lg font-[family-name:var(--font-syne)]">Cargar Seguro Colateral</span>
                                <span className="text-sm mt-2 font-normal opacity-60">Subir documentos para revisión</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

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
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">Carga de Seguro Colateral</h2>
                                            <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                                        </div>

                                        {/* Indicador de perfil guardado */}
                                        {newAsset.owner && (
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-6 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-green-400 font-bold">Perfil guardado</p>
                                                    <p className="text-xs text-slate-500">Tus datos se completaron automáticamente</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-400 mb-2">Titular del Seguro</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white disabled:opacity-50"
                                                    placeholder="Tu Nombre Completo"
                                                    value={newAsset.owner}
                                                    onChange={e => setNewAsset({ ...newAsset, owner: e.target.value })}
                                                />
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
                                                assetId={tempAssetId || "temp-" + Date.now()}
                                                type="insurance"
                                                label="Adjuntar Imágenes del Seguro (Frente, Dorso)"
                                                accept="image/*"
                                                onUploadComplete={(url) => setNewAsset({ ...newAsset, insuranceDoc: url })}
                                            />

                                            <FileUpload
                                                assetId={tempAssetId || "temp-" + Date.now()}
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
        </div>
    );
}
