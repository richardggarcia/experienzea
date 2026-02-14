"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function LoanSimulator() {
    const [value, setValue] = useState(50000);
    const ltv = 0.70;
    const loan = value * ltv;

    const f = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-[2rem] text-white shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">Simulá tu Préstamo</h3>

            <div className="mb-8">
                <label className="text-sm text-blue-200 block mb-2 font-medium">Valor de tu Activo</label>
                <div className="text-4xl font-bold mb-4 tracking-tight">{f(value)}</div>
                <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
                />
                <div className="flex justify-between text-xs text-blue-300 mt-2 font-mono">
                    <span>$10k</span>
                    <span>$500k</span>
                </div>
            </div>

            <div className="flex justify-between items-center mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                    <p className="text-sm text-blue-200">LTV Max</p>
                    <p className="text-xl font-bold">70%</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-cyan-300 mb-1">Préstamo Neto</p>
                    <p className="text-3xl font-bold text-cyan-400 tracking-tight">{f(loan)}</p>
                </div>
            </div>

            <button className="w-full bg-[#0061e0] hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-xl shadow-blue-500/30 flex justify-center items-center gap-2">
                Solicitar {f(loan)} USDC
            </button>
            <p className="text-center text-xs text-blue-300 mt-4 opacity-60">
                *Cálculo estimativo. Tasa anual desde 8%.
            </p>
        </div>
    );
}
