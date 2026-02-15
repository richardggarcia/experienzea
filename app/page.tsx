"use client";
import Link from "next/link";
import LottieHero from "@/components/LottieHero";
import AssetLottie from "@/components/AssetLottie";
import LoanCalculator from "@/components/LoanCalculator";
import { ArrowRight, Tractor, Building2, Car, TrendingUp, ShieldCheck, Zap, Globe, Coins, Lock, Check, X, Rocket, Wifi, Battery, Signal, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020617] text-[#f8fafc] font-[family-name:var(--font-manrope)]">
      {/* Background Gradients (Midnight Blue Theme) */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 opacity-[0.08] blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 opacity-[0.1] blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-50 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto backdrop-blur-sm sticky top-0 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.5)]">E</div>
          <span className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">ExperienZea</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <a href="#calculator" className="hover:text-blue-400 transition-colors">Calculadora</a>
          <a href="#assets" className="hover:text-white transition-colors">Activos</a>
          <a href="#how" className="hover:text-white transition-colors">Cómo Funciona</a>
        </div>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-600 hover:text-white transition-all duration-300 text-sm tracking-wide"
        >
          Ingresar
        </Link>
      </nav>

      <main className="relative z-10 w-full overflow-hidden">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-32 grid md:grid-cols-2 gap-12 items-center">

          {/* TEXT CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 relative z-20"
          >
            {/* Badge Removed */}

            <h1 className="text-5xl md:text-7xl font-bold leading-[1] tracking-tighter font-[family-name:var(--font-syne)]">
              TU ACTIVO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">ES TU BANCO.</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
              Transformá Maquinaria, Vehículos y Propiedades en liquidez. Aprobación basada en tu activo, no en tu banco.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(37,99,235,0.3)]"
              >
                <span className="relative z-10">Creá tu Cuenta</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#calculator" className="px-8 py-4 bg-transparent border border-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center">
                Simular Crédito
              </a>
            </div>

            <div className="flex gap-8 pt-8 border-t border-slate-800/50">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white font-[family-name:var(--font-syne)]">$12M+</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Activos Gestionados</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-white font-[family-name:var(--font-syne)]">Global</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Cobertura</p>
              </div>
            </div>
          </motion.div>

          {/* PHONE VISUAL - SUBTLE FLOATING (Ref: User Image) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[650px] w-full flex items-center justify-center"
          >
            {/* FLOATING CARD - LEFT (Gentle Float) */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 bottom-40 z-30 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[200px]"
            >
              <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-500/10">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aprobado</p>
                <p className="text-green-400 font-bold text-lg font-[family-name:var(--font-syne)]">+50.000 USDC</p>
              </div>
            </motion.div>

            {/* PHONE MOCKUP (Gentle Float, NO TILT) */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="relative w-[320px] h-[640px] bg-[#0a1835] rounded-[3.5rem] border-[10px] border-[#1e3a8a] shadow-[0_50px_100px_-20px_rgba(30,58,138,0.5)] overflow-hidden flex flex-col"
            >
              {/* Status Bar */}
              <div className="h-10 px-6 flex justify-between items-center text-[10px] text-white/50 pt-3 relative z-20">
                <span className="font-bold">Let's Connect</span>
                <div className="flex gap-1.5 uppercase font-bold tracking-wider">
                  Connected
                </div>
              </div>

              {/* App Content */}
              <div className="flex-1 p-6 relative overflow-hidden bg-gradient-to-b from-[#0a1835] via-[#172554] to-[#0a1835]">
                <div className="relative z-10 pt-4">
                  <ShieldCheck className="w-6 h-6 text-white/50 mb-4" />
                  <p className="text-blue-200 text-xs uppercase tracking-widest mb-1 font-bold">Liquidez Disponible</p>
                  <h2 className="text-4xl font-bold text-white mb-8 tracking-tight font-[family-name:var(--font-syne)]">$1.050.240</h2>
                </div>

                {/* TRACTOR CARD inside Phone */}
                <div className="bg-blue-600/20 backdrop-blur-md rounded-[2rem] p-4 border border-blue-400/20 relative overflow-hidden h-[240px] mb-6">
                  <div className="absolute inset-x-0 bottom-0 top-4 flex items-center justify-center scale-110 translate-y-2">
                    <LottieHero />
                  </div>

                  <div className="relative z-20 bg-blue-600/80 backdrop-blur-md px-4 py-2 rounded-xl inline-block shadow-lg">
                    <div className="flex items-center gap-2">
                      <Tractor className="w-4 h-4 text-white" />
                      <div>
                        <p className="text-[10px] text-blue-100 font-bold uppercase">John Deere 5075E</p>
                        <p className="text-[9px] text-blue-200">Valuación: $45.000</p>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-blue-900/50 rounded-full mt-2 overflow-hidden">
                      <div className="h-full w-[70%] bg-cyan-400"></div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons (App Mock) */}
                {/* Hidden for simplicity in visual, kept clean as per ref image, just showing content */}
              </div>

              {/* Home Indicator */}
              <div className="h-1.5 w-32 bg-slate-700/50 rounded-full mx-auto mb-3 relative z-20"></div>
            </motion.div>

            {/* BLUE BACK GLOW */}
            <div className="absolute inset-0 bg-blue-600/30 blur-[130px] -z-10 rounded-full scale-110 opacity-60 pointer-events-none"></div>

          </motion.div>
        </section>

        {/* CALCULATOR SECTION */}
        <section id="calculator" className="py-20 bg-slate-900/50 border-y border-white/[0.05] relative">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-[family-name:var(--font-syne)]">
                Calculá tu <span className="text-blue-500">Poder de Fuego.</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                ¿Cuánto vale tu activo? Usá nuestra calculadora para estimar la liquidez inmediata.
              </p>
              <ul className="space-y-4">
                {[
                  "Tasa LTV competitiva (hasta 70%).",
                  "Sin letras chicas ni costos ocultos.",
                  "Aprobación basada en el activo."
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Check className="w-3 h-3" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative z-10">
              <LoanCalculator />
            </div>
          </div>
        </section>

        {/* ASSET CLASSES SECTION */}
        <section id="assets" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-syne)]">
              Cualquier Activo Real. <span className="text-blue-500">Tokenizado.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Si tiene valor intrínseco, te damos liquidez.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Maquinaria", type: 'tractor', desc: "Tractores, Cosechadoras, Equipos industriales.", color: "from-slate-800 to-slate-900", border: "hover:border-blue-500/30", text: "text-blue-400" },
              { title: "Real Estate", type: 'house', desc: "Propiedades comerciales, campos, depósitos.", color: "from-slate-800 to-slate-900", border: "hover:border-blue-500/30", text: "text-blue-400" },
              { title: "Vehículos", type: 'car', desc: "Autos de alta gama, flotas logísticas.", color: "from-slate-800 to-slate-900", border: "hover:border-blue-500/30", text: "text-blue-400" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className={`p-8 rounded-[2rem] bg-gradient-to-br ${item.color} border border-white/[0.05] ${item.border} transition-all duration-300 group shadow-lg`}
              >
                <div className={`w-28 h-28 rounded-2xl bg-blue-500/5 border border-white/5 flex items-center justify-center mb-6 overflow-hidden relative`}>
                  <AssetLottie type={item.type as any} />
                </div>
                <h3 className="text-2xl font-bold mb-3 font-[family-name:var(--font-syne)]">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* COMPARISON SECTION */}
        <section className="py-24 bg-slate-900/30 border-y border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-[family-name:var(--font-syne)]">
                ¿Por qué ExperienZea?
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Diseñado para la economía real.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                { title: "Sin Burocracia", desc: "Olvidate de carpetas infinitas. Todo digital y transparente.", icon: <Zap className="w-8 h-8" /> },
                { title: "Cobertura Global", desc: "Accedé a capital internacional sin restricciones geográficas.", icon: <Globe className="w-8 h-8" /> },
                { title: "Súper Flexible", desc: "Plazos y tasas adaptados a tu ciclo productivo.", icon: <Coins className="w-8 h-8" /> }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-slate-950 border border-slate-800 hover:border-blue-500/30 transition-colors group">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-[family-name:var(--font-syne)]">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 text-center px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full scale-150 z-0"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-8 font-[family-name:var(--font-syne)] tracking-tighter">
              Tu Liquidez te espera.
            </h2>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-lg shadow-[0_10px_50px_rgba(37,99,235,0.4)] transition-all hover:scale-105"
            >
              <Rocket className="w-6 h-6" />
              Comenzar Ahora
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.05] bg-slate-950 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">E</div>
              <span className="font-bold font-[family-name:var(--font-syne)]">ExperienZea</span>
            </div>
            <div className="text-slate-500 text-sm">
              © 2026 ExperienZea Protocol. Built on Stellar.
            </div>
            <div className="flex gap-6 text-slate-400">
              <a href="#" className="hover:text-blue-400 transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Lock className="w-5 h-5" /></a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
