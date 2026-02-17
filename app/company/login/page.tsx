"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CompanyLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Credenciales inválidas");
            setIsLoading(false);
        } else {
            router.push("/company/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600 opacity-[0.05] blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-700 opacity-[0.1] blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Back to home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>

                {/* Login Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.1] shadow-2xl transition-all hover:border-blue-500/20">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                            <Building2 className="w-8 h-8 text-blue-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
                            Acceso Empresa
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Portal administrativo de ExperienZea
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white transition-colors placeholder:text-slate-600"
                                placeholder="ejemplo@correo.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none text-white transition-colors placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                "Ingresar al Panel"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                        <p className="text-xs text-slate-500">
                            ¿No sos parte del equipo?{" "}
                            <Link href="/" className="text-blue-400 hover:text-blue-300">
                                Ir al sitio público
                            </Link>
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
