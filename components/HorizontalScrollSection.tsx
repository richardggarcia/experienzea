"use client";

import { useRef } from "react";
import { motion, useTransform, useScroll } from "framer-motion";
import { Tractor, Building2, Car } from "lucide-react";
import AssetLottie from "@/components/AssetLottie";

const items = [
    {
        title: "Maquinaria",
        type: 'tractor',
        desc: "Tractores, Cosechadoras, Equipos industriales.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
    {
        title: "Real Estate",
        type: 'house',
        desc: "Propiedades comerciales, campos, depósitos.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
    {
        title: "Vehículos",
        type: 'car',
        desc: "Autos de alta gama, flotas logísticas.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
    // Added extra items to make the scroll meaningful
    {
        title: "Commodities",
        type: 'silo', // Use existing available icon logic or fallback
        desc: "Granos tokenizados esperando exportación.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
    {
        title: "Facturas",
        type: 'invoice', // Placeholder type
        desc: "Cuentas por cobrar de exportación.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
    {
        title: "Arte",
        type: 'art', // Placeholder type
        desc: "Coleccionables de alto valor asegurados.",
        color: "from-slate-800 to-slate-900",
        border: "hover:border-blue-500/30",
        text: "text-blue-400",
    },
];

export default function HorizontalScrollSection() {
    const targetRef = useRef<HTMLDivElement | null>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
    });

    // Adjusted transform for 6 items (wider scroll area). 
    // -95% ensures we see the last item fully before it unpins.
    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-95%"]);

    return (
        <section ref={targetRef} className="relative h-[140vh] bg-slate-950/50">
            <div className="sticky top-0 flex h-[80vh] items-center overflow-hidden">

                {/* Title Overlay (Stationary) */}
                <div className="absolute top-10 left-6 z-10 md:left-20 max-w-xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-syne)] bg-slate-950/80 backdrop-blur-sm p-4 rounded-2xl inline-block border border-white/5">
                        Cualquier Activo Real. <span className="text-blue-500">Tokenizado.</span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl px-4 bg-slate-950/50 backdrop-blur-sm rounded-xl">
                        Deslizá para descubrir →
                    </p>
                </div>

                <motion.div style={{ x }} className="flex gap-8 px-6 md:px-20">
                    {items.map((item, i) => (
                        <div
                            key={i}
                            className={`group relative h-[450px] w-[350px] md:h-[500px] md:w-[450px] overflow-hidden rounded-[3rem] bg-gradient-to-br ${item.color} border border-white/10 ${item.border} transition-all duration-500 hover:scale-[1.02] shadow-2xl flex-shrink-0 flex flex-col justify-end p-8`}
                        >
                            {/* Background Glow */}
                            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-blue-600/5 rotate-45 blur-[100px] group-hover:bg-blue-600/10 transition-colors pointer-events-none"></div>

                            <div className="absolute top-0 left-0 right-0 h-[60%] flex items-center justify-center p-8">
                                <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-blue-500/5 border border-white/5 flex items-center justify-center overflow-hidden relative group-hover:scale-110 transition-transform duration-700`}>
                                    <AssetLottie type={item.type as any} />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-3xl md:text-4xl font-bold mb-3 font-[family-name:var(--font-syne)] text-white group-hover:text-blue-400 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </motion.div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#020617]"></div>
            </div>
        </section>
    );
}
