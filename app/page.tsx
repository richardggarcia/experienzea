"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Tractor, Wallet, CheckCircle2, ShieldCheck, Coins, Clock, Building2, LayoutDashboard, Loader2 } from "lucide-react";
import LottieHero from "@/components/LottieHero";
import AssetsCarousel from "@/components/AssetsCarousel";
import LoanSimulator from "@/components/LoanSimulator";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";

export default function Home() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [0, 1]);
  const y = useTransform(scrollY, [0, 100], [-20, 0]);

  const { address, connect, isConnecting } = useWallet();
  const router = useRouter();

  const handleLogin = async () => {
    if (address) {
      router.push("/dashboard");
    } else {
      const connected = await connect();
      if (connected) {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#012148] font-sans selection:bg-[#0061e0] selection:text-white overflow-x-hidden">

      {/* Navbar Fixed */}
      <motion.nav
        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)", opacity, y }}
        className="fixed w-full z-50 top-0 border-b border-gray-100 backdrop-blur-md hidden lg:block"
      >
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-10 h-10 bg-[#0061e0] rounded-xl flex items-center justify-center text-white font-bold text-xl">E</div>
            <span className="text-2xl font-bold tracking-tight">ExperienZea</span>
          </div>
          <div className="flex gap-8 font-medium text-gray-600">
            <a href="#" className="hover:text-[#0061e0]">Inversiones</a>
            <a href="#" className="hover:text-[#0061e0]">Productos</a>
            <a href="#" className="hover:text-[#0061e0]">Aprendé</a>
          </div>
          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className="bg-[#0061e0] text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : (address ? <LayoutDashboard className="w-4 h-4" /> : <Wallet className="w-4 h-4" />)}
            {address ? "Ir al Dashboard" : "Ingresar"}
          </button>
        </div>
      </motion.nav>

      {/* Hero Section (Dark Navy Impact) */}
      <section className="relative bg-[#012148] text-white pt-10 pb-32 lg:pb-48 rounded-b-[4rem] lg:rounded-b-[6rem] overflow-hidden shadow-2xl z-10">

        {/* Navbar Overlay (Initial State) */}
        <nav className="absolute top-0 w-full z-50">
          <div className="max-w-[1400px] mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center text-white font-bold text-xl">E</div>
              <span className="text-2xl font-bold tracking-tight">ExperienZea</span>
            </div>
            <div className="hidden lg:flex gap-8 font-medium text-blue-100/80">
              <a href="#" className="hover:text-white transition-colors">Inversiones</a>
              <a href="#" className="hover:text-white transition-colors">Productos</a>
              <a href="#" className="hover:text-white transition-colors">Aprendé</a>
            </div>
            <button
              onClick={handleLogin}
              disabled={isConnecting}
              className="bg-[#0061e0] text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : (address ? <LayoutDashboard className="w-4 h-4" /> : null)}
              {address ? "Ir al Dashboard" : "Creá tu cuenta"}
            </button>
          </div>
        </nav>

        {/* Rest of Hero Content... */}
        <div className="max-w-[1400px] mx-auto px-6 mt-16 lg:mt-24 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Massive Typography */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-6xl lg:text-[5.5rem] leading-[1] font-extrabold tracking-tight mb-8">
                Tu próxima liquidez <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0061e0] to-cyan-400">
                  te espera.
                </span>
              </h1>
              <p className="text-2xl text-blue-100/80 max-w-xl font-light mb-12 leading-relaxed">
                Usá tus activos reales (Tractores, Autos, Propiedades) para obtener préstamos inmediatos en Stablecoins. Sin burocracia.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <div className="w-48 h-48 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 p-6 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                  <Tractor className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-sm text-blue-200">Garantía</p>
                    <p className="text-xl font-bold">Maquinaria</p>
                  </div>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 p-6 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                  <Building2 className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-sm text-blue-200">Garantía</p>
                    <p className="text-xl font-bold">Inmuebles</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating 3D Showcase */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative h-[600px] w-full hidden lg:block"
            >
              {/* Phone/App Mockup Container */}
              <div className="absolute right-0 top-10 w-[400px] h-[700px] bg-[#0061e0] rounded-[3rem] shadow-2xl rotate-[-6deg] border-8 border-gray-900 overflow-hidden transform hover:rotate-0 transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0051c0] to-[#003180]">

                  {/* Internal App UI */}
                  <div className="p-8 text-white h-full flex flex-col relative z-20">
                    <div className="flex justify-between items-center mb-8">
                      <ShieldCheck className="w-8 h-8 opacity-80" />
                      <span className="font-mono text-sm opacity-60">CONNECTED</span>
                    </div>
                    <p className="text-sm opacity-70">Liquidez Disponible</p>
                    <h3 className="text-5xl font-bold mb-8">$1.050.240</h3>

                    <div className="bg-white/10 rounded-2xl p-4 mb-4 backdrop-blur-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-cyan-500 p-2 rounded-lg"><Tractor className="w-5 h-5 text-white" /></div>
                        <div>
                          <p className="font-bold text-sm">John Deere 5075E</p>
                          <p className="text-xs opacity-70">Valuación: $45.000</p>
                        </div>
                      </div>
                      <div className="w-full bg-black/20 h-1.5 rounded-full mt-2">
                        <div className="bg-cyan-400 h-1.5 rounded-full w-[75%]"></div>
                      </div>
                    </div>

                    {/* Lottie Animation Area */}
                    <div className="flex-1 flex items-center justify-center relative -my-4 transform scale-125">
                      <LottieHero />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute bottom-20 left-10 bg-white text-[#012148] p-6 rounded-3xl shadow-xl max-w-xs z-30"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Aprobado</p>
                    <p className="text-sm text-gray-500">hace 2 min</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">+$50.000 USDC</p>
              </motion.div>

            </motion.div>
          </div>
        </div>
      </section>

      {/* Assets Carousel - Infinite Marquee */}
      <AssetsCarousel />

      {/* Loan Simulator Section (New) */}
      <section className="py-24 bg-gradient-to-br from-[#012148] to-[#00152e] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#0061e0]/10 blur-3xl rounded-full"></div>
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-semibold mb-6 border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                SIMULADOR EN VIVO
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">Calculá tu potencial de liquidez.</h2>
              <p className="text-xl text-blue-200 mb-8 leading-relaxed">
                No esperes a vender. Descubrí cuánto capital podés desbloquear hoy mismo usando tus activos como garantía.
              </p>
              <ul className="space-y-6">
                {[
                  "Tasas competitivas desde 8% anual en USDC.",
                  "LTV hasta 70% del valor de mercado real.",
                  "Sin costos ocultos ni letras chicas.",
                  "Aprobación en 48hs hábiles."
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-lg">
                    <div className="bg-cyan-500/20 p-2 rounded-full">
                      <CheckCircle2 className="text-cyan-400 w-5 h-5" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <LoanSimulator />
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-32 relative bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Invertir es para todos",
                desc: "Democratizamos el acceso a préstamos con garantía real.",
                icon: <Building2 className="w-8 h-8" />,
                color: "bg-blue-50 text-blue-600"
              },
              {
                title: "Seguridad Institucional",
                desc: "Tus activos están respaldados por contratos inteligentes auditados.",
                icon: <ShieldCheck className="w-8 h-8" />,
                color: "bg-green-50 text-green-600"
              },
              {
                title: "Liquidez 24/7",
                desc: "Accedé a tus fondos cuando los necesites, sin esperar horarios bancarios.",
                icon: <Clock className="w-8 h-8" />,
                color: "bg-purple-50 text-purple-600"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border border-gray-100"
              >
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mb-8`}>
                  {item.icon}
                </div>
                <h3 className="text-3xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-500 text-lg leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Massive */}
      <section className="bg-[#0061e0] text-white py-32 mx-4 rounded-[4rem] mb-20 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-3xl mx-auto relative z-10 px-6">
          <h2 className="text-5xl lg:text-7xl font-extrabold mb-10 tracking-tight">
            Empezá ahora.
          </h2>
          <p className="text-2xl text-blue-100 mb-12">
            Unite a la nueva era de las finanzas agrícolas y reales.
          </p>
          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className="bg-white text-[#0061e0] px-12 py-5 rounded-full font-bold text-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {address ? "Ir al Dashboard" : "Crear cuenta gratis"}
          </button>
        </div>
      </section>

      <footer className="bg-[#012148] text-white py-20 rounded-t-[4rem] -mb-1">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div>
            <span className="text-2xl font-bold">ExperienZea</span>
            <p className="text-blue-200 mt-2">© 2026 Todos los derechos reservados.</p>
          </div>
          <div className="flex gap-8 text-blue-200">
            <a href="#" className="hover:text-white">Términos</a>
            <a href="#" className="hover:text-white">Privacidad</a>
            <a href="#" className="hover:text-white">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
