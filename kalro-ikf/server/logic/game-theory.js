/**
 * Game Theory Engine for Strategic Decision Support
 * Implements Nash Equilibrium calculation for incident response strategies
 */

const { read, write } = require('../store');

/**
 * Calculate payoff matrix for defense vs attacker strategies
 * P(D, A) where D = Defense Cost, A = Attacker's Gain
 */
function calculatePayoffMatrix(incident, config = {}) {
  const {
    businessImpactHours = (incident.sla_minutes_remaining || 480) / 60,
    hourlyBusinessCost = 500, // $ per hour of downtime
    isolationCost = businessImpactHours * hourlyBusinessCost,
    monitoringCost = 100, // $ for monitoring infrastructure
    attackerGain = incident.severity === 'critical' ? 50000 : 
                   incident.severity === 'high' ? 25000 : 5000,
    riskAppetite = config.riskAppetite || 0.5 // 0 = conservative, 1 = aggressive
  } = {
    ...config,
    ...((read('game-theory-config') || [{}])[0] || {})
  };

  return {
    isolation: {
      businessCost: isolationCost,
      riskReduction: 0.98, // 98% risk reduced
      knowledgeGain: 0.3,
      score: (10 * 0.98) - (isolationCost / 1000) // Weighted score
    },
    monitoring: {
      businessCost: monitoringCost,
      riskReduction: 0.4,
      knowledgeGain: 0.8, // More learning from monitoring
      score: (7 * 0.4) + (monitoringCost / 100) // Different weight
    },
    attackerGain: attackerGain,
    defenseCost: Math.min(isolationCost, monitoringCost),
    riskAppetite: riskAppetite
  };
}

/**
 * Calculate Nash Equilibrium for mixed strategy
 * Returns recommended action: 'isolate' | 'monitor' | 'hybrid'
 */
function calculateNashEquilibrium(payoffMatrix, incident) {
  const isolateScore = payoffMatrix.isolation.score;
  const monitorScore = payoffMatrix.monitoring.score;
  
  // Pure strategy Nash Equilibrium
  let recommendedAction = isolateScore > monitorScore ? 'isolate' : 'monitor';
  let confidence = Math.abs(isolateScore - monitorScore) / (isolateScore + monitorScore);
  
  // Consider STS complexity - if high social factors, lean toward monitoring/training
  if (incident.socio_technical?.social_factors?.length > 2) {
    monitorScore += 2; // Boost monitoring for social complexity
    if (monitorScore > isolateScore) {
      recommendedAction = 'monitor';
      confidence = 0.7;
    }
  }
  
  // If scores are close, suggest hybrid
  if (Math.abs(isolateScore - monitorScore) < 1) {
    recommendedAction = 'hybrid';
    confidence = 0.5;
  }

  return {
    recommendedAction,
    isolateScore: Math.round(isolateScore * 100) / 100,
    monitorScore: Math.round(monitorScore * 100) / 100,
    confidence: Math.min(confidence, 0.95),
    reasoning: generateReasoning(recommendedAction, payoffMatrix, incident)
  };
}

/**
 * Generate human-readable reasoning for decision
 */
function generateReasoning(action, payoff, incident) {
  if (action === 'isolate') {
    return `High severity (${incident.severity}) + High business impact (${payoff.isolation.businessCost}$ cost) suggests immediate isolation to contain threat.`;
  } else if (action === 'monitor') {
    return `Lower immediate risk + High knowledge gain potential. Monitor to learn about threat patterns before taking action.`;
  } else {
    return `Trade-off scenario. Consider phased approach: Monitor initially, then isolate if threat escalates.`;
  }
}

/**
 * Create strategic decision record
 */
function recordStrategicDecision(incidentId, decision, userId) {
  const incidents = read('incidents');
  const incident = incidents.find(i => i.id === incidentId);
  if (!incident) throw new Error('Incident not found');

  if (!incident.strategic_decisions) incident.strategic_decisions = [];
  
  incident.strategic_decisions.push({
    id: 'dec' + Math.random().toString(36).slice(2, 9),
    decision_type: decision.recommendedAction,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
    user_id: userId,
    payoff_matrix: decision.payoffMatrix,
    created_at: new Date().toISOString(),
    implemented_at: null,
    outcome: null
  });

  write('incidents', incidents);
  return incident.strategic_decisions[incident.strategic_decisions.length - 1];
}

/**
 * Calculate aggregate resilience metrics
 */
function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function calculateResilienceMetrics() {
  const incidents = read('incidents');
  const knowledge = read('knowledge');
  const pirs = read('pirs');
  
  // SLA Breach Rate
  const totalActive = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
  const slaBreach = incidents.filter(i => i.sla_breached === true).length;
  const slaBreachRate = totalActive > 0 ? slaBreach / totalActive : 0;

  // Knowledge Utilization Rate (KUR)
  const closedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status));
  const resolvedWithKnowledge = closedIncidents.filter(i =>
    (i.applied_defensive_routines?.length || 0) > 0 ||
    (i.used_knowledge_ids?.length || 0) > 0
  ).length;
  const knowledgeUtilization = closedIncidents.length > 0 ? (resolvedWithKnowledge / closedIncidents.length) * 100 : 0;

  // Mean Time to Wisdom (MTTW)
  const timeToWisdomMs = [];
  pirs.filter(p => p.status === 'converted').forEach(pir => {
    const convertedRoutines = knowledge.filter(k =>
      k.knowledge_type === 'defensive-routine' &&
      k.incident_id === pir.incident_id &&
      new Date(k.created_at) >= new Date(pir.created_at)
    );
    convertedRoutines.forEach(routine => {
      timeToWisdomMs.push(new Date(routine.created_at) - new Date(pir.created_at));
    });
  });
  const meanTimeToWisdom = timeToWisdomMs.length > 0
    ? formatDuration(timeToWisdomMs.reduce((sum, ms) => sum + ms, 0) / timeToWisdomMs.length)
    : 'N/A';

  // Socio-Technical Balance Score
  const totalTechFactors = incidents.reduce((sum, i) => sum + (i.socio_technical?.technical_factors?.length || 0), 0);
  const totalSocialFactors = incidents.reduce((sum, i) => sum + (i.socio_technical?.social_factors?.length || 0), 0);
  const totalFactors = totalTechFactors + totalSocialFactors;
  const balanceScore = totalFactors === 0
    ? 50
    : Math.round(((totalSocialFactors - totalTechFactors) / totalFactors) * 50 + 50);
  const technicalRatio = totalFactors === 0 ? 50 : Math.round((totalTechFactors / totalFactors) * 100);
  const socialRatio = totalFactors === 0 ? 50 : Math.round((totalSocialFactors / totalFactors) * 100);

  // Avg STS Risk
  const avgStsRisk = incidents.reduce((sum, i) => {
    if (!i.socio_technical) return sum;
    const techFactors = i.socio_technical.technical_factors?.length || 0;
    const socialFactors = i.socio_technical.social_factors?.length || 0;
    const stsRisk = (techFactors * 0.4) + (socialFactors * 0.6);
    return sum + stsRisk;
  }, 0) / Math.max(incidents.length, 1);

  // Defensive Routine Success Rate
  const routineUses = knowledge.filter(k => k.defensive_routine?.times_applied > 0);
  const avgSuccessRate = routineUses.length > 0
    ? routineUses.reduce((sum, k) => sum + (k.defensive_routine?.success_rate || 0), 0) / routineUses.length
    : 0;

  // RESILIENCE SCORE (0-100)
  const resilience = 
    (100 - (slaBreachRate * 100)) * 0.25 +
    knowledgeUtilization * 0.35 +
    ((1 - (avgStsRisk / 10)) * 100) * 0.25 +
    (avgSuccessRate * 100) * 0.15;

  return {
    resilience_score: Math.round(resilience * 100) / 100,
    sla_breach_rate: (slaBreachRate * 100).toFixed(1) + '%',
    knowledge_utilization_rate: knowledgeUtilization.toFixed(1) + '%',
    mean_time_to_wisdom: meanTimeToWisdom,
    socio_technical_balance_score: balanceScore,
    socio_technical_balance: {
      technical: technicalRatio,
      social: socialRatio
    },
    knowledge_utilization: knowledgeUtilization.toFixed(1) + '%',
    routine_success_rate: (avgSuccessRate * 100).toFixed(1) + '%',
    avg_sts_risk: avgStsRisk.toFixed(2),
    impact_reduction_hours: closedIncidents.length > 0 ? ((slaBreachRate * 100) * 0.25).toFixed(1) : '0'
  };
}

module.exports = {
  calculatePayoffMatrix,
  calculateNashEquilibrium,
  recordStrategicDecision,
  calculateResilienceMetrics
};
