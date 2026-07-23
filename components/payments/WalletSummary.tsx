import type { WalletSummary } from "@/lib/payments/types";
import { formatCLP } from "@/lib/payments/types";
import { Clock3, PiggyBank, Wallet } from "lucide-react";

type Props = {
  summary: WalletSummary;
};

export function WalletSummaryCards({ summary }: Props) {
  return (
    <div className="walletGrid">
      <article className="walletCard">
        <Wallet size={22} />
        <strong>{formatCLP(summary.availableBalance)}</strong>
        <span>Saldo disponible</span>
      </article>
      <article className="walletCard">
        <Clock3 size={22} />
        <strong>{formatCLP(summary.heldBalance)}</strong>
        <span>Saldo retenido</span>
      </article>
      <article className="walletCard">
        <PiggyBank size={22} />
        <strong>{formatCLP(summary.totalReceived)}</strong>
        <span>Total recibido</span>
      </article>
      <article className="walletCard">
        <strong>{formatCLP(summary.totalFees)}</strong>
        <span>Comisiones descontadas</span>
      </article>
    </div>
  );
}
