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
    <div className="grid md:grid-cols-4 gap-6 mb-12">
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
        <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          LIQUIDEZ DISPONIBLE
        </p>
        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
          ${liquidityAvailableToday.toLocaleString()}
          <span className="text-lg text-slate-500 font-normal font-[family-name:var(--font-manrope)] ml-2">USDC</span>
        </p>
        <p className="text-xs text-slate-500">Cupo hoy (70% sobre garantías tokenizadas)</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Saldo wallet: {walletBalance !== null ? `$${walletBalance.toLocaleString()}` : '$0.00'}
        </p>
      </div>
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
        <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          VALOR RESPALDADO
        </p>
        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
          ${totalBackedValue.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500">Tokenizado + escrow creado + acreditado</p>
      </div>
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
        <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          CRÉDITO ACREDITADO
        </p>
        <p className="text-4xl font-bold text-emerald-400 mb-1 font-[family-name:var(--font-syne)]">
          ${liquidatedAmount.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500">Préstamos desembolsados al solicitante</p>
      </div>
      <div className="bg-[#0b1021] p-6 rounded-[2rem] border border-white/[0.02] shadow-lg">
        <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-3 font-[family-name:var(--font-syne)]">
          EN REVISIÓN
        </p>
        <p className="text-4xl font-bold text-white mb-1 font-[family-name:var(--font-syne)]">
          ${pendingReviewValue.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500">({pendingReviewCount} garantía(s))</p>
      </div>
    </div>
  );
}
