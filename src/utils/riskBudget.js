/**
 * Portfolio Risk Budget Engine
 * Calculates active trades risk, checks correlation groupings,
 * manages automatic sizing downsizing, and records decisions.
 */

export async function evaluateRiskBudget(prisma, userId, symbol, requestedRiskPct, entryPrice, stopLoss, correlationGroup = 'DEFAULT') {
  // 1. Fetch Portfolio State
  let portfolio = await prisma.portfolioState.findUnique({
    where: { userId }
  });

  if (!portfolio) {
    // Fallback default state
    portfolio = await prisma.portfolioState.create({
      data: {
        userId,
        tenantId: (await prisma.user.findFirst({ where: { id: userId } }))?.tenantId || 'default-tenant',
        currentCapital: 10000.0,
        maxPortfolioRiskPct: 5.0,
        allocatedRisk: 0.0,
        activeTrades: 0
      }
    });
  }

  const currentCapital = portfolio.currentCapital;
  const maxPortfolioRisk = portfolio.maxPortfolioRiskPct;

  // 2. Fetch Active Trades
  const activeTrades = await prisma.tradeJournal.findMany({
    where: { userId, outcomeStatus: 'PENDING' }
  });

  // Calculate existing active risk
  let currentActiveRiskPct = 0.0;
  let correlationGroupRiskPct = 0.0;

  for (const trade of activeTrades) {
    if (trade.entryPrice && trade.stopLoss && trade.positionSize && trade.entryPrice !== trade.stopLoss) {
      const riskAmount = trade.positionSize * Math.abs(trade.entryPrice - trade.stopLoss);
      const riskPct = (riskAmount / currentCapital) * 100;
      currentActiveRiskPct += riskPct;

      // Group correlation check
      // Fetch profile to find group
      const profile = await prisma.assetProfile.findUnique({
        where: { symbol: trade.asset }
      });
      const tGroup = profile?.correlationGroup || 'DEFAULT';
      if (tGroup === correlationGroup) {
        correlationGroupRiskPct += riskPct;
      }
    }
  }

  const remainingRiskBudget = Math.max(0.0, maxPortfolioRisk - currentActiveRiskPct);

  // Correlation Limit (e.g. max 3% per group)
  const maxGroupRiskPct = 3.0;
  const groupBudgetRemaining = Math.max(0.0, maxGroupRiskPct - correlationGroupRiskPct);

  // Sizing Decisions
  let approvedRiskPct = requestedRiskPct;
  let action = 'APPROVED';
  let reason = 'Risk budget is within limits.';

  // Check if remaining portfolio budget allows requested risk
  if (remainingRiskBudget <= 0.0) {
    approvedRiskPct = 0.0;
    action = 'REJECTED';
    reason = `Portfolio risk budget exceeded. Active risk: ${currentActiveRiskPct.toFixed(2)}%, Limit: ${maxPortfolioRisk.toFixed(2)}%`;
  } else if (requestedRiskPct > remainingRiskBudget) {
    approvedRiskPct = remainingRiskBudget;
    action = 'DOWNSIZED';
    reason = `Sizing reduced to fit remaining portfolio budget of ${remainingRiskBudget.toFixed(2)}%`;
  }

  // Double check Group correlation budget
  if (action !== 'REJECTED') {
    if (groupBudgetRemaining <= 0.0) {
      approvedRiskPct = 0.0;
      action = 'REJECTED';
      reason = `Correlation group '${correlationGroup}' risk budget exceeded. Group risk: ${correlationGroupRiskPct.toFixed(2)}%`;
    } else if (approvedRiskPct > groupBudgetRemaining) {
      approvedRiskPct = groupBudgetRemaining;
      action = 'DOWNSIZED';
      reason = `Sizing reduced to fit correlation group '${correlationGroup}' budget of ${groupBudgetRemaining.toFixed(2)}%`;
    }
  }

  return {
    requestedRiskPct,
    remainingPortfolioRiskPct: remainingRiskBudget,
    approvedRiskPct,
    action,
    reason,
    currentActiveRiskPct
  };
}

export async function logRiskDecision(prisma, analysisId, symbol, evaluation) {
  return await prisma.riskDecisionLog.create({
    data: {
      analysisId,
      symbol,
      requestedRiskPct: evaluation.requestedRiskPct,
      remainingPortfolioRiskPct: evaluation.remainingPortfolioRiskPct,
      approvedRiskPct: evaluation.approvedRiskPct,
      action: evaluation.action,
      reason: evaluation.reason
    }
  });
}
