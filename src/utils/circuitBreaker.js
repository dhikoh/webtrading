/**
 * Circuit Breaker State Machine
 * States: HEALTHY, DEGRADED, OFFLINE, RECOVERY
 */

export async function processRequestOutcome(prisma, sourceName, isSuccess) {
  let reliability = await prisma.dataSourceReliability.findUnique({
    where: { sourceName }
  });

  if (!reliability) {
    reliability = await prisma.dataSourceReliability.create({
      data: {
        sourceName,
        currentState: 'HEALTHY',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalQueries: 0,
        successQueries: 0,
        failureQueries: 0
      }
    });
  }

  const previousState = reliability.currentState;
  let nextState = previousState;
  let nextFailures = reliability.consecutiveFailures;
  let nextSuccesses = reliability.consecutiveSuccesses;
  let reason = '';

  if (isSuccess) {
    nextFailures = 0;
    nextSuccesses += 1;

    if (previousState !== 'HEALTHY') {
      if (nextSuccesses >= 10) {
        nextState = 'HEALTHY';
        reason = `10 consecutive successful requests achieved. Promoted from ${previousState} to HEALTHY.`;
      } else if (nextSuccesses >= 3 && previousState !== 'RECOVERY') {
        nextState = 'RECOVERY';
        reason = `3 consecutive successful requests achieved. Promoted from ${previousState} to RECOVERY.`;
      }
    }
  } else {
    nextSuccesses = 0;
    nextFailures += 1;

    // 1 failure -> warning log
    if (nextFailures === 1) {
      console.warn(`[WARNING] DataSource ${sourceName} experienced a failure.`);
    }

    if (nextFailures >= 5) {
      if (previousState !== 'OFFLINE') {
        nextState = 'OFFLINE';
        reason = `5 consecutive failures on ${sourceName}. Demoted to OFFLINE.`;
      }
    } else if (nextFailures >= 3) {
      if (previousState === 'HEALTHY' || previousState === 'RECOVERY') {
        nextState = 'DEGRADED';
        reason = `3 consecutive failures on ${sourceName}. Demoted to DEGRADED.`;
      }
    }
  }

  // Update Database state
  await prisma.dataSourceReliability.update({
    where: { id: reliability.id },
    data: {
      totalQueries: reliability.totalQueries + 1,
      successQueries: reliability.successQueries + (isSuccess ? 1 : 0),
      failureQueries: reliability.failureQueries + (isSuccess ? 0 : 1),
      currentState: nextState,
      consecutiveFailures: nextFailures,
      consecutiveSuccesses: nextSuccesses
    }
  });

  // Log transition if changed
  if (previousState !== nextState && reason) {
    await prisma.auditLog.create({
      data: {
        action: 'CIRCUIT_BREAKER_TRANSITION',
        details: JSON.stringify({
          sourceName,
          previousState,
          newState: nextState,
          reason
        })
      }
    });
  }

  return {
    currentState: nextState,
    consecutiveFailures: nextFailures,
    consecutiveSuccesses: nextSuccesses,
    transitioned: previousState !== nextState,
    reason
  };
}
