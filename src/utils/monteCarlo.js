export function runMonteCarlo(winRate, avgWin, avgLoss, numTrades = 100, simCount = 1000, initialCapital = 10000) {
  let count10 = 0;
  let count20 = 0;
  let count30 = 0;
  let count50 = 0;

  for (let s = 0; s < simCount; s++) {
    let balance = initialCapital;
    let maxBalance = balance;
    let maxDrawdown = 0;

    for (let t = 0; t < numTrades; t++) {
      const isWin = Math.random() * 100 < winRate;
      if (isWin) {
        balance += avgWin;
      } else {
        balance -= avgLoss;
      }
      
      // Capital protection check: if balance goes to 0 or less, trade sequence stops (100% drawdown)
      if (balance <= 0) {
        balance = 0;
        maxDrawdown = 1;
        break;
      }

      if (balance > maxBalance) {
        maxBalance = balance;
      }
      
      const dd = (maxBalance - balance) / maxBalance;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    if (maxDrawdown >= 0.50) count50++;
    if (maxDrawdown >= 0.30) count30++;
    if (maxDrawdown >= 0.20) count20++;
    if (maxDrawdown >= 0.10) count10++;
  }

  return {
    drawdown10Prob: (count10 / simCount) * 100,
    drawdown20Prob: (count20 / simCount) * 100,
    drawdown30Prob: (count30 / simCount) * 100,
    drawdown50Prob: (count50 / simCount) * 100
  };
}
