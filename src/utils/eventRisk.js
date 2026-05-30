/**
 * Market Event Risk Filter
 * Detects upcoming high-impact economic events (FOMC, CPI, NFP).
 * Admin can update the event schedule.
 */

// In-memory fallback event database (UTC times).
// Production systems would query a database or API, but this is a robust local repository.
const HIGH_IMPACT_EVENTS = [
  { name: 'FOMC Statement & Rate Decision', date: '2026-06-10T18:00:00Z', type: 'FOMC' },
  { name: 'US CPI Release', date: '2026-06-12T12:30:00Z', type: 'CPI' },
  { name: 'Non-Farm Payrolls (NFP)', date: '2026-06-05T12:30:00Z', type: 'NFP' },
  { name: 'FOMC Meeting Minutes', date: '2026-05-20T18:00:00Z', type: 'FOMC' }
];

export function getEconomicEventRisk(date = new Date(), customEvents = []) {
  const currentMs = date.getTime();
  const events = [...HIGH_IMPACT_EVENTS, ...customEvents];
  
  let maxRisk = 'LOW';
  let activeEvent = null;
  let timeDifferenceMinutes = Infinity;

  // Window of high risk: 2 hours before and 2 hours after the event (240 minutes total)
  const RISK_WINDOW_MS = 2 * 60 * 60 * 1000;

  for (const event of events) {
    const eventMs = new Date(event.date).getTime();
    const diff = Math.abs(currentMs - eventMs);

    if (diff < RISK_WINDOW_MS) {
      maxRisk = 'HIGH';
      activeEvent = event;
      timeDifferenceMinutes = Math.round(diff / 60000);
      break;
    }
  }

  let penalty = 0;
  let forceNoTrade = false;
  if (maxRisk === 'HIGH') {
    penalty = 60; // Huge penalty
    forceNoTrade = true; // High impact event prevents trade entry
  }

  return {
    riskLevel: maxRisk,
    activeEvent,
    timeDifferenceMinutes,
    penalty,
    forceNoTrade,
    message: maxRisk === 'HIGH' 
      ? `HIGH MARKET RISK: Close to ${activeEvent.name} (${timeDifferenceMinutes} mins away). Strategy entry blocked.` 
      : 'Normal macro conditions. No high impact events active.'
  };
}
