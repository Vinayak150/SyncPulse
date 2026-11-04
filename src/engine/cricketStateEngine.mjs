/**
 * SyncPulse11 V2 — Hardened Pure Cricket State Machine & Spoiler-Safe Projection Engine
 * Module: src/engine/cricketStateEngine.mjs
 *
 * Implements:
 * - Recursive deepFreeze() to guarantee immutability of ViewerSafeState
 * - Full ICC legal vs. illegal delivery rules (wide, no_ball, bye, leg_bye)
 * - ICC Clause 21.19 Free-Hit activation, carry-over on consecutive wides/no-balls,
 *   and dismissal restriction (only run_out valid on a Free Hit)
 * - Exact odd-run strike rotation (including batters crossing on wides/byes/leg-byes)
 *   and end-of-over strike swap
 * - Contradiction-free custom match state validation
 */

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    deepFreeze(obj[keys[i]]);
  }
  return obj;
}

export function formatOvers(legalBalls) {
  if (!Number.isInteger(legalBalls) || legalBalls < 0) return '0.0';
  const completedOvers = Math.floor(legalBalls / 6);
  const ballsInCurrentOver = legalBalls % 6;
  return `${completedOvers}.${ballsInCurrentOver}`;
}

export function parseOversToLegalBalls(oversStr) {
  const str = String(oversStr ?? '').trim();
  if (!/^\d+(\.[0-5])?$/.test(str)) {
    return {
      valid: false,
      error: 'Overs must be in X.Y format where Y is 0 to 5 (e.g., 12.0 or 16.4, never 11.6).'
    };
  }
  const parts = str.split('.');
  const overs = parseInt(parts[0], 10);
  const balls = parts[1] ? parseInt(parts[1], 10) : 0;
  const totalBalls = overs * 6 + balls;
  if (totalBalls < 0 || totalBalls > 120) {
    return {
      valid: false,
      error: 'Total legal balls must be between 0 (0.0) and 120 (20.0).'
    };
  }
  return { valid: true, legalBalls: totalBalls };
}

export function validateCustomMatchState(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input state object is required.'] };
  }

  const oversParsed = parseOversToLegalBalls(input.overs);
  if (!oversParsed.valid) errors.push(oversParsed.error);

  const runs = Number(input.runs);
  const wickets = Number(input.wickets);
  const target = Number(input.target);

  if (!Number.isInteger(runs) || runs < 0 || runs > 400) {
    errors.push('Current runs must be an integer between 0 and 400.');
  }
  if (!Number.isInteger(wickets) || wickets < 0 || wickets > 10) {
    errors.push('Wickets lost must be an integer between 0 and 10.');
  }
  if (!Number.isInteger(target) || target <= 0 || target > 401) {
    errors.push('Target score must be an integer between 1 and 401.');
  }

  if (errors.length === 0) {
    if (runs >= target && wickets === 10) {
      errors.push('Contradictory state: batting team cannot be 10 wickets down (All Out) and also have reached the target.');
    }
    if (oversParsed.legalBalls === 0 && wickets > 0 && runs === 0) {
      errors.push('Invalid state: wickets cannot be lost at 0.0 overs with 0 runs unless a wide stumping occurred.');
    }
  }

  const striker = String(input.striker || 'Batter 1').trim();
  const nonStriker = String(input.nonStriker || 'Batter 2').trim();
  const bowler = String(input.bowler || 'Active Bowler').trim();
  if (striker.toLowerCase() === nonStriker.toLowerCase()) {
    errors.push('Striker and non-striker must be two distinct players.');
  }

  if (errors.length > 0) return { valid: false, errors };

  const legalBallsBowled = oversParsed.legalBalls;
  const legalBallsRemaining = 120 - legalBallsBowled;
  let status = 'IN_PROGRESS';
  if (runs >= target) status = 'TARGET_REACHED';
  else if (wickets === 10) status = 'ALL_OUT';
  else if (legalBallsRemaining === 0) status = 'OVERS_EXHAUSTED';

  return {
    valid: true,
    errors: [],
    normalized: {
      runs,
      wickets,
      target,
      legalBallsBowled,
      legalBallsRemaining,
      oversFormatted: formatOvers(legalBallsBowled),
      striker,
      nonStriker,
      bowler,
      status
    }
  };
}

/**
 * Pure delivery state transition following ICC T20 playing conditions:
 * - Wides & no-balls do not consume a legal ball.
 * - No-ball triggers freeHitActive = true for the next delivery; if the free-hit
 *   delivery is itself a wide or no-ball, freeHitActive carries over!
 * - On a Free Hit, a wicket is only valid if dismissalMode === 'run_out'.
 * - Strike rotates on odd runs ran off bat, or odd extra runs ran by batters on wides/byes/leg-byes,
 *   and swaps at the end of every completed 6-ball legal over.
 */
export function applyDeliveryTransition(prevState, delivery) {
  if (prevState.inningsStatus !== 'IN_PROGRESS') {
    return { ...prevState };
  }

  const extraType = delivery.extraType || null;
  const isLegal = extraType !== 'wide' && extraType !== 'no_ball';
  const runsBat = Math.max(0, Number(delivery.runsBat || 0));
  const runsExtra = Math.max(0, Number(delivery.runsExtra || 0));
  const runsTotal = runsBat + runsExtra;

  // Enforce ICC Free-Hit dismissal protection: only run_out can dismiss a batter on a free hit
  const wasFreeHit = Boolean(prevState.freeHitActive);
  const rawWicket = Boolean(delivery.isWicket);
  const dismissalMode = delivery.dismissalMode || (rawWicket ? 'standard' : null);
  const isWicket = rawWicket && (!wasFreeHit || dismissalMode === 'run_out');

  const nextScoreRuns = prevState.scoreRuns + runsTotal;
  const nextScoreWickets = Math.min(10, prevState.scoreWickets + (isWicket ? 1 : 0));
  const nextLegalBallsBowled = prevState.legalBallsBowled + (isLegal ? 1 : 0);
  const nextLegalBallsRemaining = Math.max(0, 120 - nextLegalBallsBowled);

  let striker = prevState.striker;
  let nonStriker = prevState.nonStriker;

  // Physical runs ran between wickets that cause batters to cross ends:
  // - Normal / no-ball: runsBat (or byes ran on no-ball beyond the 1 penalty run)
  // - Wide: penalty is 1 run; any additional wide runs (runsExtra - 1) were physically run by batters
  // - Bye / leg_bye: all runsExtra were physically run by batters
  let physicalRunsCrossed = runsBat;
  if (extraType === 'wide' && runsExtra > 1) {
    physicalRunsCrossed += runsExtra - 1;
  } else if (extraType === 'bye' || extraType === 'leg_bye') {
    physicalRunsCrossed += runsExtra;
  } else if (extraType === 'no_ball' && runsBat === 0 && runsExtra > 1) {
    physicalRunsCrossed += runsExtra - 1;
  }

  if (isWicket && delivery.newBatter) {
    striker = delivery.newBatter;
  } else if (physicalRunsCrossed % 2 === 1) {
    const tmp = striker;
    striker = nonStriker;
    nonStriker = tmp;
  }

  // End-of-over strike rotation (only when a legal delivery completes an over)
  const overCompleted = isLegal && nextLegalBallsBowled > 0 && nextLegalBallsBowled % 6 === 0;
  if (overCompleted) {
    const tmp = striker;
    striker = nonStriker;
    nonStriker = tmp;
  }

  // Free-hit state transition (ICC Clause 21.19):
  // - A no_ball activates Free Hit for the next ball.
  // - If already on a Free Hit and the bowler bowls a wide or no_ball, Free Hit carries over!
  // - A legal delivery consumes the Free Hit.
  let nextFreeHitActive = false;
  if (extraType === 'no_ball') {
    nextFreeHitActive = true;
  } else if (wasFreeHit && !isLegal) {
    nextFreeHitActive = true;
  }

  const isBoundary = runsBat === 4 || runsBat === 6;
  const nextBoundaryDrought = isBoundary ? 0 : prevState.boundaryDroughtBalls + (isLegal ? 1 : 0);

  let inningsStatus = 'IN_PROGRESS';
  if (nextScoreRuns >= prevState.target) {
    inningsStatus = 'TARGET_REACHED';
  } else if (nextScoreWickets >= 10) {
    inningsStatus = 'ALL_OUT';
  } else if (nextLegalBallsRemaining === 0) {
    inningsStatus = 'OVERS_EXHAUSTED';
  } else if (delivery.interruption === 'RAIN_STOPPAGE') {
    inningsStatus = 'INTERRUPTED';
  }

  return {
    scoreRuns: nextScoreRuns,
    scoreWickets: nextScoreWickets,
    target: prevState.target,
    legalBallsBowled: nextLegalBallsBowled,
    legalBallsRemaining: nextLegalBallsRemaining,
    oversFormatted: formatOvers(nextLegalBallsBowled),
    runsRequired: Math.max(0, prevState.target - nextScoreRuns),
    striker,
    nonStriker,
    bowler: delivery.nextBowler || delivery.bowler || prevState.bowler,
    boundaryDroughtBalls: nextBoundaryDrought,
    freeHitActive: inningsStatus === 'IN_PROGRESS' ? nextFreeHitActive : false,
    inningsStatus,
    overCompleted
  };
}

/**
 * Pure projection function: getViewerSafeState(scenario, viewerCursorSeq)
 * Physically strips all events with seq > viewerCursorSeq before computing state,
 * and recursively deep-freezes the output so no downstream consumer can mutate it.
 */
export function getViewerSafeState(scenario, viewerCursorSeq) {
  const safeCursor = Math.max(0, Number(viewerCursorSeq) || 0);
  const authorizedEvents = scenario.events
    .filter((ev) => ev.seq <= safeCursor)
    .map((ev) => structuredClone(ev));

  let state = {
    scenarioId: scenario.id,
    title: scenario.title,
    teams: structuredClone(scenario.teams),
    venue: scenario.venue,
    target: scenario.initialState.target,
    scoreRuns: scenario.initialState.scoreRuns,
    scoreWickets: scenario.initialState.scoreWickets,
    legalBallsBowled: scenario.initialState.legalBallsBowled,
    legalBallsRemaining: 120 - scenario.initialState.legalBallsBowled,
    oversFormatted: formatOvers(scenario.initialState.legalBallsBowled),
    runsRequired: Math.max(0, scenario.initialState.target - scenario.initialState.scoreRuns),
    striker: scenario.initialState.striker,
    nonStriker: scenario.initialState.nonStriker,
    bowler: scenario.initialState.bowler,
    boundaryDroughtBalls: scenario.initialState.boundaryDroughtBalls || 0,
    freeHitActive: Boolean(scenario.initialState.freeHitActive),
    inningsStatus: scenario.initialState.inningsStatus || 'IN_PROGRESS',
    overCompleted: false
  };

  const timeline = [];
  for (const ev of authorizedEvents) {
    const wasFreeHitBeforeBall = state.freeHitActive;
    const batterFaced = state.striker;
    state = applyDeliveryTransition(state, ev);
    const isLegal = ev.extraType !== 'wide' && ev.extraType !== 'no_ball';
    const runsTotal = (ev.runsBat || 0) + (ev.runsExtra || 0);
    timeline.push({
      id: ev.id,
      seq: ev.seq,
      overBallLabel: state.oversFormatted,
      isLegal,
      isLegalBall: isLegal,
      extraType: ev.extraType || null,
      wasFreeHitDelivery: wasFreeHitBeforeBall,
      freeHitAfter: state.freeHitActive,
      runsBat: ev.runsBat || 0,
      runsExtra: ev.runsExtra || 0,
      runsTotal,
      totalRunsBall: runsTotal,
      isWicket: Boolean(ev.isWicket) && (!wasFreeHitBeforeBall || ev.dismissalMode === 'run_out'),
      dismissalText: ev.dismissalText || null,
      batterFaced,
      strikerAfter: state.striker,
      nonStrikerAfter: state.nonStriker,
      bowler: ev.bowler,
      scoreRunsAfter: state.scoreRuns,
      scoreWicketsAfter: state.scoreWickets,
      runsRequiredAfter: state.runsRequired,
      legalBallsRemainingAfter: state.legalBallsRemaining,
      receiptTimestampMs: ev.receiptTimestampMs,
      tacticalNote: structuredClone(ev.tacticalNote || {}),
      provenance: 'synthetic_demo_event'
    });
  }

  const phase =
    state.legalBallsBowled < 36
      ? 'POWERPLAY (Overs 1–6)'
      : state.legalBallsBowled < 90
      ? 'MIDDLE OVERS (Overs 7–15)'
      : 'DEATH OVERS (Overs 16–20)';

  const currentRunRate =
    state.legalBallsBowled > 0 ? +((state.scoreRuns / state.legalBallsBowled) * 6).toFixed(2) : 0;
  const requiredRunRate =
    state.legalBallsRemaining > 0
      ? +((state.runsRequired / state.legalBallsRemaining) * 6).toFixed(2)
      : state.runsRequired > 0
      ? 99.99
      : 0;

  return deepFreeze({
    scenarioId: scenario.id,
    title: scenario.title,
    teams: structuredClone(scenario.teams),
    venue: scenario.venue,
    viewerCursorSeq: safeCursor,
    viewerVisibleThrough: state.oversFormatted,
    scoreRuns: state.scoreRuns,
    scoreWickets: state.scoreWickets,
    target: state.target,
    runsRequired: state.runsRequired,
    legalBallsBowled: state.legalBallsBowled,
    legalBallsRemaining: state.legalBallsRemaining,
    oversFormatted: state.oversFormatted,
    currentRunRate,
    requiredRunRate,
    phase,
    striker: state.striker,
    nonStriker: state.nonStriker,
    bowler: state.bowler,
    boundaryDroughtBalls: state.boundaryDroughtBalls,
    freeHitActive: state.freeHitActive,
    inningsStatus: state.inningsStatus,
    overCompleted: state.overCompleted,
    visibleEvents: timeline,
    latestEvent: timeline.length > 0 ? timeline[timeline.length - 1] : null,
    fieldPreset:
      timeline.length > 0 && timeline[timeline.length - 1].tacticalNote?.fieldPreset
        ? timeline[timeline.length - 1].tacticalNote.fieldPreset
        : scenario.initialState.fieldPreset || 'DEATH_YORKER_TRAP'
  });
}
