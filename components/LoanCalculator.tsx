"use client";
import { useState } from "react";
import Link from "next/link";
import { Coins, ArrowRight } from "lucide-react";

export default function LoanCalculator() {
    const [assetValue, setAssetValue] = useState(10000);
    const ltv = 0.70; // 70% LTV
    const loanAmount = assetValue * ltv;

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-500"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center shadow-lg">
                        <Coins className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold font-[family-name:var(--font-syne)]">Simulador de Crédito</h3>
                        <p className="text-slate-400 text-sm">Financiación al 70% LTV</p>
                    </div>
                </div>

                {/* Input Slider */}
                <div className="mb-10">
                    <div className="flex justify-between text-sm mb-4 font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Valor del Activo</span>
                        <span className="text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">${assetValue.toLocaleString()} USD</span>
                    </div>
                    <input
                        type="range"
                        min="5000"
                        max="500000"
                        step="5000"
                        value={assetValue}
                        onChange={(e) => setAssetValue(Number(e.target.value))}
                        className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 slider-thumb hover:accent-blue-400 transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>$5k</span>
                        <span>$500k+</span>
                    </div>
                </div>

                {/* Result Box */}
                <div className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-600/5 animate-pulse"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Podés recibir hasta</p>
                    <p className="text-5xl font-bold text-white relative z-10 font-[family-name:var(--font-syne)] tracking-tight">
                        ${loanAmount.toLocaleString()} <span className="text-lg text-blue-400 font-normal">USDC</span>
                    </p>
                </div>

                <Link
                    href="/borrower"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                    Solicitar este Monto <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
    );
}
