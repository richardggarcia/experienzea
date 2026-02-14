"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Rocket, LogOut, Loader2, ArrowLeft, Plus, CheckCircle2, ShieldCheck, Tractor, Building2, Car, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data Types
interface Asset {
    id: string;
    type: 'tractor' | 'car' | 'house';
    name: string;
    value: number;
    status: 'tokenized' | 'funding_requested';
    contractId?: string;
}

export default function Dashboard() {
    const { address, connect, isConnecting, disconnect } = useWallet();
    const router = useRouter();

    // State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newAsset, setNewAsset] = useState<{ type: 'tractor' | 'car' | 'house', name: string, value: string }>({ type: 'tractor', name: '', value: '' });
    const [isMinting, setIsMinting] = useState(false);
    const [isRequesting, setIsRequesting] = useState<string | null>(null);

    // Authentication Check
    if (isConnecting) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#0061e0]" /></div>;

    if (!address) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full border border-gray-100 text-center">
                    <h1 className="text-3xl font-bold mb-4 text-[#012148]">Conectá tu Wallet</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Para gestionar tus garantías y préstamos, necesitás conectar tu billetera Freighter.
                    </p>
                    <button
                        onClick={() => connect()}
                        className="w-full bg-[#0061e0] text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 mb-4 flex justify-center items-center gap-2"
                    >
                        Conectar Freighter
                    </button>
                    <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto">
                        <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // Handlers
    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsMinting(true);
        // Simulate Blockchain Transaction Delay
        setTimeout(() => {
            const asset: Asset = {
                id: Math.random().toString(36).substr(2, 9),
                type: newAsset.type,
                name: newAsset.name,
                value: Number(newAsset.value),
                status: 'tokenized'
            };
            setAssets([...assets, asset]);
            setIsMinting(false);
            setShowForm(false);
            setNewAsset({ type: 'tractor', name: '', value: '' });
        }, 2500);
    };

    const handleRequestFunding = async (id: string) => {
        setIsRequesting(id);
        // Simulate Trustless Work Escrow Creation
        setTimeout(() => {
            setAssets(assets.map(a => a.id === id ? { ...a, status: 'funding_requested', contractId: `CTX-${Math.floor(Math.random() * 10000)}-TW` } : a));
            setIsRequesting(null);
        }, 2000);
    };

    const getIcon = (type: string) => {
        if (type === 'tractor') return <Tractor className="w-8 h-8" />;
        if (type === 'house') return <Building2 className="w-8 h-8" />;
        return <Car className="w-8 h-8" />;
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#012148]">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0061e0] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-blue-500/20 shadow-lg">E</div>
                    <span className="text-xl font-bold tracking-tight">ExperienZea <span className="text-gray-400 font-normal">| Dashboard</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-mono border border-blue-100/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {address.substring(0, 4)}...{address.substring(address.length - 4)}
                    </span>
                    <button onClick={() => { disconnect(); router.push("/"); }} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors" title="Desconectar">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12 relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-3 tracking-tight">Mis Garantías</h1>
                        <p className="text-gray-500 text-lg">Gestioná tus activos tokenizados y revisá el estado de tus préstamos.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-[#0061e0] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Activo
                    </button>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Liquidez Disponible</p>
                        <p className="text-4xl font-bold text-[#012148]">$0.00 <span className="text-lg text-gray-400">USDC</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Valor Tokenizado</p>
                        <p className="text-4xl font-bold text-[#012148]">${assets.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Préstamos Activos</p>
                        <p className="text-4xl font-bold text-[#012148]">{assets.filter(a => a.status === 'funding_requested').length}</p>
                    </div>
                </div>

                {/* Asset Grid */}
                <div className="grid md:grid-cols-3 gap-8 pb-32">
                    <AnimatePresence mode="popLayout">
                        {/* Asset Cards */}
                        {assets.map(asset => (
                            <motion.div
                                key={asset.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all"
                            >
                                <div className="absolute top-0 right-0 p-6">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${asset.status === 'tokenized' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {asset.status === 'tokenized' ? 'TOKENIZADO' : 'ESPERANDO FONDEO'}
                                    </div>
                                </div>

                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-[#0061e0]">
                                    {getIcon(asset.type)}
                                </div>

                                <h3 className="text-xl font-bold mb-1">{asset.name}</h3>
                                <p className="text-gray-400 text-sm mb-6">ID: NFT#{asset.id}</p>

                                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-gray-500 mb-1">Valoración</p>
                                    <p className="text-2xl font-bold">${asset.value.toLocaleString()}</p>
                                </div>

                                {asset.status === 'tokenized' ? (
                                    <button
                                        onClick={() => handleRequestFunding(asset.id)}
                                        disabled={!!isRequesting}
                                        className="w-full bg-[#002b4d] text-white py-3 rounded-xl font-bold hover:bg-[#00152e] transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                                    >
                                        {isRequesting === asset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                                        {isRequesting === asset.id ? "Creando Escrow..." : "Solicitar Fondeo"}
                                    </button>
                                ) : (
                                    <div className="w-full bg-blue-50/50 border border-blue-100 text-blue-800 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Contrato: {asset.contractId}
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {/* Empty State Upload Card */}
                        <motion.div
                            key="upload-card"
                            layout
                            onClick={() => setShowForm(true)}
                            className="border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center h-full min-h-[350px] text-gray-400 hover:border-[#0061e0] hover:text-[#0061e0] hover:bg-blue-50/30 transition-all cursor-pointer group bg-white"
                        >
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-white group-hover:shadow-lg transition-all">
                                <Rocket className="w-8 h-8 text-gray-300 group-hover:text-[#0061e0] transition-colors" />
                            </div>
                            <span className="font-bold text-lg">Subir Nuevo Activo</span>
                            <span className="text-sm text-gray-300 mt-2 font-normal">Tractor, Inmueble, Vehículo...</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Upload Form Modal (Portal-like) */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            key="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                            onClick={() => !isMinting && setShowForm(false)}
                        >
                            <motion.div
                                key="modal-content"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden"
                            >
                                {isMinting ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-16 h-16 text-[#0061e0] animate-spin mb-6" />
                                        <h3 className="text-2xl font-bold mb-2">Tokenizando Activo...</h3>
                                        <p className="text-gray-500 text-center">Creando NFT (Título Digital) en Stellar Network.<br />Esto puede demorar unos segundos.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleMint}>
                                        <h2 className="text-2xl font-bold mb-6">Nuevo Activo</h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Activo</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(['tractor', 'car', 'house'] as const).map(t => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => setNewAsset({ ...newAsset, type: t })}
                                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newAsset.type === t ? 'bg-blue-50 border-[#0061e0] text-[#0061e0]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                        >
                                                            {getIcon(t)}
                                                            <span className="capitalize text-sm font-bold">{t}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre / Modelo</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
                                                    placeholder="Ej: John Deere 5075E"
                                                    value={newAsset.name}
                                                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Valor Estimado (USD)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
                                                    placeholder="45000"
                                                    value={newAsset.value}
                                                    onChange={e => setNewAsset({ ...newAsset, value: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-8">
                                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                                            <button type="submit" className="flex-1 bg-[#0061e0] text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">Tokenizar</button>
                                        </div>
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
