/**
 * Session Quality Engine
 * Detects global trading sessions based on current UTC time and calculates liquidity quality.
 * UTC Hours:
 * - Asia: 00:00 - 09:00 UTC
 * - London: 08:00 - 17:00 UTC
 * - New York: 13:00 - 22:00 UTC
 */
export function getSessionQuality(date = new Date()) {
  const utcHour = date.getUTCHours();
  const activeSessions = [];

  // Determine active sessions
  if (utcHour >= 0 && utcHour < 9) activeSessions.push('ASIA');
  if (utcHour >= 8 && utcHour < 17) activeSessions.push('LONDON');
  if (utcHour >= 13 && utcHour < 22) activeSessions.push('NEW_YORK');

  let sessionName = 'OFF_HOURS';
  let qualityScore = 50;
  let penalty = 0;

  // Evaluate overlap and high liquidity sessions
  const isLondon = activeSessions.includes('LONDON');
  const isNY = activeSessions.includes('NEW_YORK');
  const isAsia = activeSessions.includes('ASIA');

  if (isLondon && isNY) {
    sessionName = 'LONDON_NY_OVERLAP';
    qualityScore = 100;
    penalty = 0;
  } else if (isAsia && isLondon) {
    sessionName = 'ASIA_LONDON_OVERLAP';
    qualityScore = 75;
    penalty = 5;
  } else if (isNY) {
    sessionName = 'NEW_YORK';
    qualityScore = 85;
    penalty = 0;
  } else if (isLondon) {
    sessionName = 'LONDON';
    qualityScore = 85;
    penalty = 0;
  } else if (isAsia) {
    sessionName = 'ASIA';
    qualityScore = 40; // Historically lower liquidity & volume for major breakouts
    penalty = 20;      // 20-point penalty for Asia session breakout plays
  } else {
    sessionName = 'DEAD_ZONE'; // 22:00 - 00:00 UTC (New York close / Asia open gap)
    qualityScore = 30;
    penalty = 25;
  }

  return {
    utcHour,
    activeSessions,
    sessionName,
    qualityScore,
    penalty,
    message: `Active session: ${sessionName} (Quality Score: ${qualityScore}/100, Penalty: -${penalty} pts)`
  };
}
