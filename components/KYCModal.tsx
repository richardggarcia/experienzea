"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface KYCModalProps {
    address: string;
    onComplete: () => void;
}

export default function KYCModal({ address, onComplete }: KYCModalProps) {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [needsProfile, setNeedsProfile] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        cuit_cuil: "",
        company_type: "monotributista", // default
        industry: "agricola", // default
        has_collateral: "si", // default map to boolean later
        email: "",
        phone: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initial check when wallet connects
    useEffect(() => {
        if (!address) return;

        const checkProfile = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/profile?wallet=${address}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.profile) {
                        setNeedsProfile(true);
                    } else {
                        // User exists, allow access
                        onComplete();
                    }
                } else {
                    console.error("Failed to fetch profile status");
                    // Safe fallback to block access if we can't verify
                    setNeedsProfile(true);
                }
            } catch (err) {
                console.error("Error checking profile:", err);
                setNeedsProfile(true);
            } finally {
                setIsLoading(false);
            }
        };

        if (address) {
            checkProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setIsSubmitting(true);

        try {
            const body = {
                wallet_address: address,
                ...formData,
                has_collateral: formData.has_collateral === "si"
            };

            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setNeedsProfile(false); // Hide modal
                onComplete(); // Unblock the dashboard UI
            } else {
                const errorData = await res.json();
                setErrorMsg(errorData.error || "Ocurrió un error al guardar el perfil.");
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("Error de conexión. Intentá nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
                <div className="text-center flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                    <h2 className="text-xl font-bold font-[family-name:var(--font-syne)] text-white">Verificando Perfil...</h2>
                </div>
            </div>
        );
    }

    if (!needsProfile) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[100] bg-[#020617] overflow-y-auto"
            >
                <div className="min-h-screen flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative"
                    >
                        {/* Header decorativo compacto */}
                        <div className="bg-slate-50 p-6 border-b border-slate-100 relative overflow-hidden">
                            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black text-slate-900 font-[family-name:var(--font-syne)] mb-1">
                                    Completá tu Perfil
                                </h2>
                                <p className="text-slate-500 text-sm font-[family-name:var(--font-manrope)] leading-relaxed">
                                    Validá tu identidad por única vez para operar de forma segura.
                                </p>
                            </div>
                        </div>

                        {/* Formulario Compacto */}
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            Nombre o Razón Social
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="Ej: Agropecuaria S.A."
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            DNI / CUIT
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.cuit_cuil}
                                            onChange={(e) => setFormData({ ...formData, cuit_cuil: e.target.value })}
                                            placeholder="Nro. de Documento"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors placeholder:text-slate-400"
                                        />
                                        {errorMsg?.includes('CUIT/CUIL') && (
                                            <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3 shrink-0" /> Ya registrado
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                                            placeholder="1144990189"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors placeholder:text-slate-400"
                                        />
                                        {errorMsg?.includes('teléfono') && (
                                            <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3 shrink-0" /> Ya registrado
                                            </p>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            Mail Institucional
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="contacto@empresa.com"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors placeholder:text-slate-400"
                                        />
                                        {errorMsg?.includes('email') && (
                                            <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3 shrink-0" /> Ya registrado
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            Perfil Legal
                                        </label>
                                        <select
                                            value={formData.company_type}
                                            onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors appearance-none"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                                        >
                                            <option value="individuo">Persona Física</option>
                                            <option value="monotributista">Monotributista</option>
                                            <option value="empresa">Empresa / PYME</option>
                                            <option value="fideicomiso">Fideicomiso</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            Sector / Industria
                                        </label>
                                        <select
                                            value={formData.industry}
                                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors appearance-none"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                                        >
                                            <option value="general">Empleado / Particular</option>
                                            <option value="real_estate">Real Estate & Inmuebles</option>
                                            <option value="vehiculos">Vehículos & Movilidad</option>
                                            <option value="agricola">Agropecuario</option>
                                            <option value="tecnologia">Tecnología & Maquinaria</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-[family-name:var(--font-syne)] uppercase tracking-wider">
                                            ¿Posee bienes para presentar como garantía?
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex-1 cursor-pointer">
                                                <input type="radio" className="peer sr-only" name="collateral" value="si"
                                                    checked={formData.has_collateral === "si"}
                                                    onChange={(e) => setFormData({ ...formData, has_collateral: e.target.value })} />
                                                <div className="text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-600 transition-all">
                                                    Sí, tengo garantías
                                                </div>
                                            </label>
                                            <label className="flex-1 cursor-pointer">
                                                <input type="radio" className="peer sr-only" name="collateral" value="no"
                                                    checked={formData.has_collateral === "no"}
                                                    onChange={(e) => setFormData({ ...formData, has_collateral: e.target.value })} />
                                                <div className="text-center px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-600 transition-all">
                                                    Aún no poseo
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Error Message (Fallback) */}
                                {errorMsg && !errorMsg.includes('CUIT/CUIL') && !errorMsg.includes('email') && !errorMsg.includes('teléfono') && (
                                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-red-600 leading-tight">{errorMsg}</p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.full_name.trim() || !formData.cuit_cuil.trim() || !formData.phone.trim() || !formData.email.trim()}
                                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold font-[family-name:var(--font-syne)] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:pointer-events-none"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                                            </>
                                        ) : (
                                            "Completar Registro"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
