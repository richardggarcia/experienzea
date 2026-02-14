"use client";
import React from 'react';
import { motion } from "framer-motion";
import { Tractor, Car, Home, Bitcoin, Truck, Warehouse, Gem, Anchor } from "lucide-react";

const assets = [
    { name: "MAQUINARIA", icon: Tractor, color: "text-blue-500" },
    { name: "VEHÍCULOS", icon: Car, color: "text-red-500" },
    { name: "INMUEBLES", icon: Home, color: "text-cyan-500" },
    { name: "CAMIONES", icon: Truck, color: "text-purple-500" },
    { name: "MATERIAS PRIMAS", icon: Warehouse, color: "text-yellow-600" },
    { name: "CRIPTOACTIVOS", icon: Bitcoin, color: "text-orange-500" },
    { name: "JOYAS", icon: Gem, color: "text-pink-500" },
    { name: "EMBARCACIONES", icon: Anchor, color: "text-indigo-500" },
];

export default function AssetsCarousel() {
    return (
        <div className="w-full bg-white py-12 overflow-hidden relative border-b border-gray-100 z-20">
            <div className="max-w-[1400px] mx-auto px-6 mb-8 text-center">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aceptamos todo tipo de garantía</p>
            </div>

            <div className="flex w-full overflow-hidden mask-linear-gradient">
                <motion.div
                    className="flex gap-16 items-center whitespace-nowrap pl-16"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                >
                    {[...assets, ...assets, ...assets].map((asset, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 group cursor-pointer min-w-[120px]">
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-xl transition-all border border-transparent group-hover:border-gray-100 transform group-hover:-translate-y-2.5 duration-300">
                                <asset.icon className={`w-10 h-10 ${asset.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                            </div>
                            <span className="font-bold text-gray-400 group-hover:text-[#0061e0] text-xs uppercase tracking-widest transition-colors duration-300">{asset.name}</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
        </div>
    );
}
