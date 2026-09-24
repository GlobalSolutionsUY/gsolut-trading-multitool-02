import type { OpportunitySetup, RiskAssessment } from '@gsolut/types';

export function formatTelegramAlertHtml(setup: OpportunitySetup, risk: RiskAssessment): string {
  const stopPercent = (
    ((setup.currentPrice - setup.invalidationPrice) / setup.currentPrice) *
    100
  ).toFixed(1);

  const signalBullets = setup.reasons.map((r) => `  • ${r}`).join('\n');
  const riskBullets = risk.reasons.map((r) => `  • ${r}`).join('\n');

  return `🎯 <b>SPOT RADAR: TACTICAL REBOUND</b>

<b>Asset:</b> <code>${setup.symbol}</code> (${setup.exchange.toUpperCase()})
<b>Timeframe:</b> ${setup.timeFrame}
<b>Current Price:</b> $${setup.currentPrice.toLocaleString()}

📍 <b>Entry Zone:</b> $${setup.entryZone.min} - $${setup.entryZone.max}
🛑 <b>Invalidation / Stop:</b> $${setup.invalidationPrice} (-${stopPercent}%)
🎯 <b>Tactical Target:</b> $${setup.target.price} (+${setup.target.percentage}%)
⚖️ <b>Risk/Reward Ratio:</b> ${setup.riskRewardRatio}:1

🛡️ <b>Risk Profile:</b> <b>${risk.level}</b> (Score: ${risk.score}/100)
<b>Risk Notes:</b>
${riskBullets}

📊 <b>Setup Rationale:</b>
${signalBullets}

<i>Market Intelligence Copilot for Ger & Freya. Always manage position size.</i>`;
}
