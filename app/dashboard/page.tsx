"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Sprout, ArrowRight, Lock, User } from "lucide-react";

export default function DashboardSelector() {
    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-500 opacity-[0.05] blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-slate-700 opacity-[0.1] blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-2xl relative z-10">
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                        <span className="text-2xl font-bold text-orange-500">E</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white font-[family-name:var(--font-syne)] mb-3">
                        Elegí tu portal
                    </h1>
                    <p className="text-slate-400">
                        Ingresá según tu perfil de uso
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Opción Solicitante */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="group"
                    >
                        <Link
                            href="/solicitante"
                            className="block bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.1] hover:border-orange-500/30 transition-all h-full"
                        >
                            <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
                                <User className="w-7 h-7 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-3">
                                Soy Solicitante
                            </h2>
                            <p className="text-slate-400 mb-6 leading-relaxed">
                                Tokenizá garantías y pedí liquidez con tu wallet.
                            </p>
                            <div className="flex items-center gap-2 text-orange-400 font-bold group-hover:gap-3 transition-all">
                                Ingresar <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
                    </motion.div>

                    {/* Opción Inversor (Próximamente) */}
                    <motion.div
                        className="group opacity-50 cursor-not-allowed"
                    >
                        <div
                            className="block bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.05] h-full relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-slate-950/20 z-10"></div>
                            <div className="relative z-20">
                                <div className="w-16 h-16 bg-blue-500/5 rounded-2xl flex items-center justify-center mb-6">
                                    <Shield className="w-8 h-8 text-blue-500/50" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-500 font-[family-name:var(--font-syne)] mb-3 flex items-center gap-2">
                                    Soy Inversor <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-bold">PRÓXIMAMENTE</span>
                                </h2>
                                <p className="text-slate-500 mb-6 leading-relaxed">
                                    Invertí en créditos respaldados por activos reales.
                                </p>
                                <div className="flex items-center gap-2 text-slate-600 font-bold">
                                    En desarrollo <Lock className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        ← Volver al inicio
                    </Link>
                </div>
            </div >
        </div >
    );
}
