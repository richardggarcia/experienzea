"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, User, ArrowRight } from "lucide-react";

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
                        ¿Cómo querés acceder?
                    </h1>
                    <p className="text-slate-400">
                        Seleccioná el portal según tu rol
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Opción Solicitante */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="group"
                    >
                        <Link
                            href="/borrower"
                            className="block bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.1] hover:border-orange-500/30 transition-all h-full"
                        >
                            <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
                                <User className="w-7 h-7 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-3">
                                Soy Solicitante
                            </h2>
                            <p className="text-slate-400 mb-6 leading-relaxed">
                                Quiero tokenizar mis activos y acceder a liquidez usando mi wallet personal.
                            </p>
                            <div className="flex items-center gap-2 text-orange-400 font-bold group-hover:gap-3 transition-all">
                                Ingresar <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
                    </motion.div>

                    {/* Opción Empresa */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="group"
                    >
                        <Link
                            href="/company/login"
                            className="block bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.1] hover:border-blue-500/30 transition-all h-full"
                        >
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                <Building2 className="w-7 h-7 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-3">
                                Soy ExperienZea
                            </h2>
                            <p className="text-slate-400 mb-6 leading-relaxed">
                                Acceso administrativo para revisar, aprobar y tokenizar activos.
                            </p>
                            <div className="flex items-center gap-2 text-blue-400 font-bold group-hover:gap-3 transition-all">
                                Ingresar <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
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
            </div>
        </div>
    );
}
