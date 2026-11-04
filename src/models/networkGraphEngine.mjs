/**
 * SyncPulse11 V5.5 — Dynamic NetworkX-Style Tactical & Markov State-Transition Graph Engine
 * Module: src/models/networkGraphEngine.mjs
 *
 * Implements a deterministic, strictly spoiler-safe (ViewerSafeState-only) graph topology engine:
 * 1. MARKOV_STATE_FLOW: Directed weighted state-transition network from current state S_t -> 8 delivery
 *    transition nodes -> 3 Over-Horizon Attractor basins (Batting Dominance, Knife-Edge, Bowling Squeeze).
 * 2. TACTICAL_ENTITY_GRAPH: Directed interaction network across Bowler, Release Zones, Striker, Non-Striker,
 *    and Fielding Ring nodes with 20-step Power-Iteration PageRank Centrality (alpha = 0.85) and Shannon Entropy.
 */

import {
  computeFeatureSensitivityAndWhatIf,
  getConditionalDeliveryDist
} from './winProbAndMonteCarlo.mjs';

/**
 * Runs 20 iterations of Power-Iteration PageRank on a directed weighted graph.
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string, weight: number}>} edges
 * @param {number} damping
 * @returns {Record<string, number>} PageRank percentage (sums to 100.0)
 */
export function computePageRankCentrality(nodes, edges, damping = 0.85) {
  const n = nodes.length;
  if (n === 0) return {};
  const idxMap = new Map();
  nodes.forEach((nd, i) => idxMap.set(nd.id, i));

  let pr = new Array(n).fill(1 / n);
  const outWeight = new Array(n).fill(0);
  for (const e of edges) {
    const u = idxMap.get(e.source);
    const v = idxMap.get(e.target);
    if (u !== undefined && v !== undefined && e.weight > 0) {
      outWeight[u] += e.weight;
    }
  }

  for (let iter = 0; iter < 20; iter++) {
    const next = new Array(n).fill((1 - damping) / n);
    let sinkMass = 0;
    for (let u = 0; u < n; u++) {
      if (outWeight[u] <= 0) {
        sinkMass += pr[u];
      }
    }
    for (const e of edges) {
      const u = idxMap.get(e.source);
      const v = idxMap.get(e.target);
      if (u !== undefined && v !== undefined && e.weight > 0 && outWeight[u] > 0) {
        next[v] += damping * pr[u] * (e.weight / outWeight[u]);
      }
    }
    if (sinkMass > 0) {
      const addSink = (damping * sinkMass) / n;
      for (let i = 0; i < n; i++) next[i] += addSink;
    }
    pr = next;
  }

  const total = pr.reduce((a, b) => a + b, 0) || 1;
  const result = {};
  nodes.forEach((nd, i) => {
    result[nd.id] = +((pr[i] / total) * 100).toFixed(1);
  });
  return result;
}

/**
 * Builds both the Markov State-Transition Flow Graph and the Tactical Entity Interaction Graph
 * strictly from ViewerSafeState (zero access to buffered stadium events).
 */
export function buildDynamicCricketNetwork(safeState, graphMode = 'MARKOV_STATE_FLOW') {
  const sens = computeFeatureSensitivityAndWhatIf(safeState);
  const dist = getConditionalDeliveryDist(
    safeState.legalBallsBowled,
    safeState.scoreWickets,
    Boolean(safeState.freeHitActive)
  );

  // Shannon transition entropy H = -sum p_i log2(p_i)
  let shannonEntropyBits = 0;
  for (const item of dist) {
    if (item.p > 0) {
      shannonEntropyBits -= item.p * Math.log2(item.p);
    }
  }
  shannonEntropyBits = +shannonEntropyBits.toFixed(2);

  if (graphMode === 'TACTICAL_ENTITY_GRAPH') {
    const visibleBalls = safeState.visibleEvents.length;
    const recentBoundaries = safeState.visibleEvents.filter((e) => e.runsBat === 4 || e.runsBat === 6).length;
    const recentDots = safeState.visibleEvents.filter((e) => (e.isLegal || e.isLegalBall) && (e.runsTotal ?? e.totalRunsBall) === 0).length;
    const recentSingles = safeState.visibleEvents.filter((e) => (e.runsBat === 1 || e.runsBat === 2)).length;

    const nodes = [
      {
        id: 'entity_bowler',
        label: safeState.bowler,
        subLabel: 'Bowler Source',
        category: 'BOWLER',
        x: 78,
        y: 118,
        r: 22,
        color: '#F43F5E',
        metricLabel: `${sens.matchup.shrunkBowlerWktPct}% Wkt Haz`,
        detail: `${safeState.bowler} (${sens.matchup.bowlerSpecialty}) initiates delivery release vectors.`
      },
      {
        id: 'zone_yorker',
        label: 'Blockhole / Full',
        subLabel: 'Dot & Wkt Channel',
        category: 'PITCH_ZONE',
        x: 215,
        y: 52,
        r: 17,
        color: '#0EA5E9',
        metricLabel: `Dot ${(dist.find((d) => d.type === 'dot')?.p * 100 || 32).toFixed(1)}%`,
        detail: `Yorker/blockhole channel suppresses boundary flow and forces dot balls (${recentDots} visible dots).`
      },
      {
        id: 'zone_hard_length',
        label: 'Hard Length / Spin',
        subLabel: 'Rotation Channel',
        category: 'PITCH_ZONE',
        x: 215,
        y: 118,
        r: 17,
        color: '#14B8A6',
        metricLabel: `1s/2s ${(((dist.find((d) => d.type === '1')?.p || 0) + (dist.find((d) => d.type === '2')?.p || 0)) * 100).toFixed(1)}%`,
        detail: `Cramping hard-length / stump line channels singles & twos (${recentSingles} visible rotations).`
      },
      {
        id: 'zone_slot_arc',
        label: 'Slot / Hitting Arc',
        subLabel: 'Boundary Risk',
        category: 'PITCH_ZONE',
        x: 215,
        y: 184,
        r: 17,
        color: '#F59E0B',
        metricLabel: `4/6 ${(((dist.find((d) => d.type === '4')?.p || 0) + (dist.find((d) => d.type === '6')?.p || 0)) * 100).toFixed(1)}%`,
        detail: `Missed length in hitting arc unlocks boundary trajectories (${recentBoundaries} visible boundaries).`
      },
      {
        id: 'entity_striker',
        label: `${safeState.striker}*`,
        subLabel: 'Active Striker Hub',
        category: 'BATTER',
        x: 365,
        y: 92,
        r: 23,
        color: '#10B981',
        metricLabel: `${sens.matchup.shrunkPosteriorSr} Bayes SR`,
        detail: `${safeState.striker} on strike (Empirical Bayes Shrunk SR ${sens.matchup.shrunkPosteriorSr} vs phase par ${sens.matchup.phaseBaselineSr}).`
      },
      {
        id: 'entity_nonstriker',
        label: safeState.nonStriker,
        subLabel: 'Non-Striker Partner',
        category: 'BATTER',
        x: 365,
        y: 176,
        r: 18,
        color: '#8B5CF6',
        metricLabel: `Rotation Partner`,
        detail: `${safeState.nonStriker} at non-striker's end; receives strike on odd runs or over completion.`
      },
      {
        id: 'field_circle',
        label: 'Inner 30yd Ring',
        subLabel: 'Dot Pressure Sink',
        category: 'FIELD',
        x: 520,
        y: 66,
        r: 18,
        color: '#38BDF8',
        metricLabel: `Drought ${safeState.boundaryDroughtBalls}b`,
        detail: `Inner ring fielders absorb dot balls and build boundary drought pressure (${safeState.boundaryDroughtBalls} balls since 4/6).`
      },
      {
        id: 'field_rope',
        label: 'Boundary Riders',
        subLabel: safeState.fieldPreset,
        category: 'FIELD',
        x: 520,
        y: 164,
        r: 19,
        color: '#F97316',
        metricLabel: `WP ${sens.currentWinProbPct}%`,
        detail: `Outer rope protection (${safeState.fieldPreset}) governs 4/6 vs caught-on-boundary leverage (${sens.leverageIndex}x).`
      }
    ];

    const pDot = (dist.find((d) => d.type === 'dot')?.p || 0.3) * 100;
    const pRot = ((dist.find((d) => d.type === '1')?.p || 0.35) + (dist.find((d) => d.type === '2')?.p || 0.08)) * 100;
    const pBnd = ((dist.find((d) => d.type === '4')?.p || 0.12) + (dist.find((d) => d.type === '6')?.p || 0.06)) * 100;
    const pWkt = (dist.find((d) => d.type === 'W')?.p || 0.05) * 100;

    const edges = [
      { id: 'e_b_y', source: 'entity_bowler', target: 'zone_yorker', weight: +(pDot + pWkt).toFixed(1), label: `${(pDot + pWkt).toFixed(0)}%`, color: '#0EA5E9' },
      { id: 'e_b_h', source: 'entity_bowler', target: 'zone_hard_length', weight: +pRot.toFixed(1), label: `${pRot.toFixed(0)}%`, color: '#14B8A6' },
      { id: 'e_b_s', source: 'entity_bowler', target: 'zone_slot_arc', weight: +pBnd.toFixed(1), label: `${pBnd.toFixed(0)}%`, color: '#F59E0B' },
      { id: 'e_y_st', source: 'zone_yorker', target: 'entity_striker', weight: +(pDot + pWkt).toFixed(1), label: 'Defense', color: '#38BDF8' },
      { id: 'e_h_st', source: 'zone_hard_length', target: 'entity_striker', weight: +pRot.toFixed(1), label: 'Work 1/2', color: '#10B981' },
      { id: 'e_s_st', source: 'zone_slot_arc', target: 'entity_striker', weight: +pBnd.toFixed(1), label: 'Attack 4/6', color: '#F59E0B' },
      { id: 'e_st_ns', source: 'entity_striker', target: 'entity_nonstriker', weight: +(pRot * 0.75).toFixed(1), label: 'Rotate Strike', color: '#8B5CF6' },
      { id: 'e_ns_st', source: 'entity_nonstriker', target: 'entity_striker', weight: +(12 + visibleBalls * 2).toFixed(1), label: 'Partnership', color: '#A78BFA' },
      { id: 'e_st_fc', source: 'entity_striker', target: 'field_circle', weight: +pDot.toFixed(1), label: `Dot ${pDot.toFixed(0)}%`, color: '#0EA5E9' },
      { id: 'e_st_fr', source: 'entity_striker', target: 'field_rope', weight: +(pBnd + pWkt).toFixed(1), label: `Rope ${(pBnd + pWkt).toFixed(0)}%`, color: '#10B981' },
      { id: 'e_fc_b', source: 'field_circle', target: 'entity_bowler', weight: +(10 + safeState.boundaryDroughtBalls * 1.5).toFixed(1), label: 'Squeeze', color: '#F43F5E' },
      { id: 'e_fr_b', source: 'field_rope', target: 'entity_bowler', weight: +(15 + sens.leverageIndex * 8).toFixed(1), label: 'Field Feedback', color: '#FB923C' }
    ];

    const pageRank = computePageRankCentrality(nodes, edges);
    let dominantNode = nodes[0];
    for (const nd of nodes) {
      nd.pageRankPct = pageRank[nd.id] ?? 12.5;
      if (nd.pageRankPct > (dominantNode.pageRankPct ?? 0)) {
        dominantNode = nd;
      }
    }

    return {
      graphMode: 'TACTICAL_ENTITY_GRAPH',
      viewerVisibleThrough: safeState.viewerVisibleThrough,
      nodes,
      edges,
      metrics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        shannonEntropyBits,
        dominantNodeId: dominantNode.id,
        dominantNodeLabel: dominantNode.label,
        dominantPageRankPct: dominantNode.pageRankPct,
        leverageIndex: sens.leverageIndex
      }
    };
  }

  // Default Mode: MARKOV_STATE_FLOW (Current State -> 8 Next-Ball Outcomes -> 3 Over-Horizon Attractors)
  const curNode = {
    id: 'state_current',
    label: `${safeState.teams.batting} ${safeState.scoreRuns}/${safeState.scoreWickets}`,
    subLabel: `${safeState.oversFormatted} ov • WP ${sens.currentWinProbPct}%`,
    category: 'CURRENT_STATE',
    x: 78,
    y: 118,
    r: 24,
    color: '#10B981',
    metricLabel: `WP ${sens.currentWinProbPct}%`,
    detail: `Current ViewerSafeState at ${safeState.oversFormatted} overs: Need ${safeState.runsRequired} from ${safeState.legalBallsRemaining} balls (Leverage ${sens.leverageIndex}x).`
  };

  const outcomeYPositions = [22, 49, 76, 103, 130, 157, 184, 211];
  const outcomeNodes = sens.nextBallWhatIf.map((o, idx) => {
    const isPos = o.wpaDeltaPct >= 1.0;
    const isNeg = o.wpaDeltaPct <= -1.0;
    const color = o.code === 'W' ? '#F43F5E' : (o.code === '4' || o.code === '6') ? '#10B981' : isPos ? '#38BDF8' : isNeg ? '#FB923C' : '#94A3B8';
    const sign = o.wpaDeltaPct > 0 ? '+' : '';
    return {
      id: `out_${o.code}`,
      label: o.code === 'dot' ? '0 (Dot)' : o.code === 'wide' ? 'Wide' : o.code === 'no_ball' ? 'No-Ball' : o.code === 'W' ? 'Wicket' : `+${o.code} Run${o.code === '1' ? '' : 's'}`,
      subLabel: `${sign}${o.wpaDeltaPct}% WPA`,
      category: 'TRANSITION',
      x: 300,
      y: outcomeYPositions[idx] ?? (24 + idx * 26),
      r: Math.max(11, Math.min(18, 10 + (o.transitionProbPct || 5) * 0.18)),
      color,
      metricLabel: `P=${o.transitionProbPct}% • WP ${o.winProbAfterPct}%`,
      wpaDeltaPct: o.wpaDeltaPct,
      winProbAfterPct: o.winProbAfterPct,
      transitionProbPct: o.transitionProbPct,
      detail: `If next delivery is ${o.label}: Transition Prob ${o.transitionProbPct}%, Win Probability shifts to ${o.winProbAfterPct}% (${sign}${o.wpaDeltaPct}% WPA).`
    };
  });

  const attractors = [
    {
      id: 'attr_chase_surge',
      label: 'Chase Surge Basin',
      subLabel: 'Positive WPA Attractor',
      category: 'ATTRACTOR',
      x: 522,
      y: 54,
      r: 21,
      color: '#10B981',
      metricLabel: `Boundary / Extra Flow`,
      detail: `High-momentum chasing basin reached via boundaries (4/6) or illegal extras (Wide/No-Ball Free Hit).`
    },
    {
      id: 'attr_par_equilibrium',
      label: 'Par Equilibrium',
      subLabel: 'Strike Rotation Basin',
      category: 'ATTRACTOR',
      x: 522,
      y: 118,
      r: 20,
      color: '#0EA5E9',
      metricLabel: `DLS Par ${sens.dls.dlsParScore}`,
      detail: `Balanced rotation state maintained by singles and doubles around DLS Par (${sens.dls.dlsParScore}).`
    },
    {
      id: 'attr_bowling_squeeze',
      label: 'Bowling Squeeze',
      subLabel: 'Dot / Wicket Attractor',
      category: 'ATTRACTOR',
      x: 522,
      y: 184,
      r: 21,
      color: '#F43F5E',
      metricLabel: `Plan: ${sens.recommendedBowlingPlan.id.slice(0, 11)}`,
      detail: `High-pressure bowling suppression basin driven by dot balls and wickets (${sens.recommendedBowlingPlan.name}).`
    }
  ];

  const nodes = [curNode, ...outcomeNodes, ...attractors];
  const edges = [];

  for (const on of outcomeNodes) {
    const w = Math.max(0.8, on.transitionProbPct || 2.0);
    edges.push({
      id: `e_cur_${on.id}`,
      source: 'state_current',
      target: on.id,
      weight: w,
      label: `${on.transitionProbPct}%`,
      color: on.color
    });

    const targetAttr =
      on.wpaDeltaPct >= 1.5
        ? 'attr_chase_surge'
        : on.wpaDeltaPct <= -1.2
        ? 'attr_bowling_squeeze'
        : 'attr_par_equilibrium';

    edges.push({
      id: `e_${on.id}_${targetAttr}`,
      source: on.id,
      target: targetAttr,
      weight: Math.max(1.0, Math.abs(on.wpaDeltaPct) + w * 0.25),
      label: `${on.winProbAfterPct}%`,
      color: on.color
    });
  }

  // Feedback edges from attractors to current state for closed-loop ergodic PageRank
  edges.push(
    { id: 'e_fb_surge', source: 'attr_chase_surge', target: 'state_current', weight: 12, label: '', color: '#10B981' },
    { id: 'e_fb_eq', source: 'attr_par_equilibrium', target: 'state_current', weight: 12, label: '', color: '#0EA5E9' },
    { id: 'e_fb_sq', source: 'attr_bowling_squeeze', target: 'state_current', weight: 12, label: '', color: '#F43F5E' }
  );

  const pageRank = computePageRankCentrality(nodes, edges);
  let dominantNode = outcomeNodes[0] || curNode;
  for (const nd of nodes) {
    nd.pageRankPct = pageRank[nd.id] ?? 5.0;
    if (nd.category === 'TRANSITION' && nd.pageRankPct > (dominantNode.pageRankPct ?? 0)) {
      dominantNode = nd;
    }
  }

  return {
    graphMode: 'MARKOV_STATE_FLOW',
    viewerVisibleThrough: safeState.viewerVisibleThrough,
    nodes,
    edges,
    metrics: {
      nodeCount: nodes.length,
      edgeCount: edges.length - 3,
      shannonEntropyBits,
      dominantNodeId: dominantNode.id,
      dominantNodeLabel: dominantNode.label,
      dominantPageRankPct: dominantNode.pageRankPct,
      leverageIndex: sens.leverageIndex
    }
  };
}
