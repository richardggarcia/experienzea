interface TopMetricsProps {
  liquidityAvailableToday: number;
  walletBalance: number | null;
  totalBackedValue: number;
  liquidatedAmount: number;
  pendingReviewValue: number;
  pendingReviewCount: number;
}

export default function TopMetrics({
  liquidityAvailableToday,
  walletBalance,
  totalBackedValue,
  liquidatedAmount,
  pendingReviewValue,
  pendingReviewCount,
}: TopMetricsProps) {
  return (
    <div className="grid md:grid-cols-4 gap-4 mb-12">
      {/* Liquidez disponible */}
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.04] shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600/60 to-transparent rounded-t-[2rem]" />
        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          Liquidez disponible
        </p>
        <p className="text-3xl font-bold text-white mb-1 font-[family-name:var(--font-syne)] leading-none">
          ${liquidityAvailableToday.toLocaleString()}
          <span className="text-sm text-slate-500 font-normal font-[family-name:var(--font-manrope)] ml-2">USDC</span>
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Cupo hoy · 70% sobre garantías</p>
        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
          Wallet: {walletBalance !== null ? `$${walletBalance.toLocaleString()}` : '$0.00'}
        </p>
      </div>

      {/* Valor respaldado */}
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.04] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500/60 to-transparent rounded-t-[2rem]" />
        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          Valor respaldado
        </p>
        <p className="text-3xl font-bold text-white mb-1 font-[family-name:var(--font-syne)] leading-none">
          ${totalBackedValue.toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Tokenizado + escrow + acreditado</p>
      </div>

      {/* Crédito acreditado */}
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-emerald-500/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/70 to-transparent rounded-t-[2rem]" />
        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          Crédito acreditado
        </p>
        <p className="text-3xl font-bold text-emerald-400 mb-1 font-[family-name:var(--font-syne)] leading-none">
          ${liquidatedAmount.toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Préstamos desembolsados</p>
      </div>

      {/* En revisión */}
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.04] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-500/50 to-transparent rounded-t-[2rem]" />
        <p className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          En revisión
        </p>
        <p className="text-3xl font-bold text-white mb-1 font-[family-name:var(--font-syne)] leading-none">
          ${pendingReviewValue.toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          {pendingReviewCount === 0 ? 'Sin garantías pendientes' : `${pendingReviewCount} garantía(s) en proceso`}
        </p>
      </div>
    </div>
  );
}
