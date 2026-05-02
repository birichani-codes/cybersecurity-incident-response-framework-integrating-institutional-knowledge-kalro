/**
 * Defensive Routines Engine
 * Recommends defensive strategies based on historical success rates
 * and institutional knowledge
 */

const { read, write } = require('../store');

/**
 * Link knowledge entry to defensive routine
 * Marks knowledge as a reusable defensive routine
 */
function linkKnowledgeToRoutine(knowledgeId, routine) {
  const knowledge = read('knowledge');
  const entry = knowledge.find(k => k.id === knowledgeId);
  
  if (!entry) throw new Error('Knowledge entry not found');

  entry.defensive_routine = {
    enabled: routine.enabled !== undefined ? routine.enabled : true,
    category: routine.category || 'general', // playbook, runbook, procedure, response-checklist
    primary_goal: routine.primary_goal || '',
    payoff_weight: Math.min(1, Math.max(0, routine.payoff_weight !== undefined ? routine.payoff_weight : 0.5)),
    payoff_rating: routine.payoff_rating || null,
    nist_function: routine.nist_function || 'PR',
    associated_scripts: routine.associated_scripts || [],
    institutional_enablers: routine.institutional_enablers || [],
    socio_technical_focus: routine.socio_technical_focus || 'technical',
    success_rate: routine.success_rate || 0.5,
    times_applied: routine.times_applied || 0,
    avg_resolution_time: routine.avg_resolution_time || '0h',
    applicable_severities: routine.applicable_severities || ['critical', 'high', 'medium', 'low'],
    applicable_incident_types: routine.applicable_incident_types || [],
    prerequisites: routine.prerequisites || [],
    estimated_cost: routine.estimated_cost || null,
    estimated_time_to_resolve: routine.estimated_time_to_resolve || null,
    routine_signature: routine.routine_signature || []
  };

  write('knowledge', knowledge);
  return entry;
}

/**
 * Suggest defensive routines for an incident
 * Returns ranked list of applicable routines
 */
function suggestRoutines(incident) {
  const knowledge = read('knowledge');
  const candidates = [];

  knowledge.forEach(k => {
    if (!k.defensive_routine || !k.defensive_routine.enabled) return;
    if (k.status !== 'active') return;

    // Match by incident type
    const typeMatch = k.defensive_routine.applicable_incident_types.length === 0 ||
                     k.defensive_routine.applicable_incident_types.includes(incident.type);

    // Match by severity
    const severityMatch = k.defensive_routine.applicable_severities.includes(incident.severity);

    // Match by tags
    const tagMatch = k.tags && k.tags.some(tag =>
      incident.type?.toLowerCase().includes(tag.toLowerCase()) ||
      (incident.description?.toLowerCase() || '').includes(tag.toLowerCase())
    );

    if ((typeMatch || tagMatch) && severityMatch) {
      // Calculate match score
      const typeScore = typeMatch ? 1.0 : 0.7;
      const confidenceScore = k.defensive_routine.success_rate * k.confidence_score;
      const usageScore = Math.min(k.defensive_routine.times_applied / 10, 1.0); // Boost well-tested routines
      const payoffWeight = k.defensive_routine.payoff_weight || 0.5;
      const enablerMatch = k.defensive_routine.institutional_enablers?.some(enabler =>
        incident.description?.toLowerCase().includes(enabler.toLowerCase()) ||
        incident.title?.toLowerCase().includes(enabler.toLowerCase())
      ) ? 1 : 0;
      const payoffScore = Math.min(1, Math.max(0, payoffWeight));
      const matchScore = (typeScore * 0.35) + (confidenceScore * 0.35) + (usageScore * 0.15) + (enablerMatch * 0.15);
      const payoffRating = Math.round(((confidenceScore * 0.6) + (payoffScore * 0.3) + (usageScore * 0.1)) * 100) / 100;

      candidates.push({
        knowledge_id: k.id,
        title: k.title,
        content_preview: k.content.substring(0, 200) + '...',
        match_score: matchScore,
        payoff_rating: payoffRating,
        defensive_routine: k.defensive_routine,
        confidence_score: k.confidence_score,
        contributor_name: getContributorName(k.contributor_id),
        last_used: k.last_used_at,
        use_count: k.use_count,
        tags: k.tags
      });
    }
  });

  // Sort by match score descending
  candidates.sort((a, b) => b.match_score - a.match_score);
  
  return {
    incident_id: incident.id,
    total_candidates: candidates.length,
    top_recommendations: candidates.slice(0, 5),
    all_recommendations: candidates
  };
}

/**
 * Record routine application
 * Updates success metrics when routine is used
 */
function recordRoutineApplication(knowledgeId, incidentId, outcome = {}) {
  const knowledge = read('knowledge');
  const incidents = read('incidents');
  
  const entry = knowledge.find(k => k.id === knowledgeId);
  const incident = incidents.find(i => i.id === incidentId);

  if (!entry || !incident) throw new Error('Knowledge or incident not found');

  if (!entry.defensive_routine) {
    entry.defensive_routine = {
      enabled: true,
      times_applied: 0,
      success_rate: 0.5
    };
  }

  // Track application
  entry.defensive_routine.times_applied = (entry.defensive_routine.times_applied || 0) + 1;
  entry.last_used_at = new Date().toISOString();
  entry.use_count = (entry.use_count || 0) + 1;
  
  // Update success rate based on outcome
  if (outcome.success !== undefined) {
    const currentSuccess = entry.defensive_routine.success_rate || 0.5;
    const timesApplied = entry.defensive_routine.times_applied;
    
    // Exponential smoothing: new_rate = (old_rate * (n-1) + outcome) / n
    entry.defensive_routine.success_rate = 
      ((currentSuccess * (timesApplied - 1)) + (outcome.success ? 1 : 0)) / timesApplied;
  }

  const payoffWeight = entry.defensive_routine.payoff_weight || 0.5;
  entry.defensive_routine.payoff_rating = Math.round((((entry.defensive_routine.success_rate || 0.5) * 0.7) + (payoffWeight * 0.3)) * 100) / 100;

  // Record routine use on the incident for knowledge utilization tracking
  if (incident) {
    if (!incident.applied_defensive_routines) incident.applied_defensive_routines = [];
    incident.applied_defensive_routines.push({
      knowledge_id: knowledgeId,
      title: entry.title,
      applied_at: new Date().toISOString(),
      outcome: outcome.success === undefined ? 'unknown' : (outcome.success ? 'success' : 'failure')
    });

    if (!incident.used_knowledge_ids) incident.used_knowledge_ids = [];
    if (!incident.used_knowledge_ids.includes(knowledgeId)) incident.used_knowledge_ids.push(knowledgeId);
    write('incidents', incidents);
  }

  // Update confidence score
  entry.confidence_score = Math.min(1.0, (entry.confidence_score || 0.5) + 0.05);

  write('knowledge', knowledge);
  return entry;
}

/**
 * Review a defensive routine after incident closure and update payoffs
 */
function reviewRoutineEffectiveness(incidentId, knowledgeId, review = {}) {
  const incidents = read('incidents');
  const knowledge = read('knowledge');
  const incident = incidents.find(i => i.id === incidentId);
  const entry = knowledge.find(k => k.id === knowledgeId);

  if (!incident) throw new Error('Incident not found');
  if (!entry || !entry.defensive_routine) throw new Error('Routine not found');
  if (incident.status !== 'closed') throw new Error('Incident must be closed before review');

  const rating = Math.min(1, Math.max(0, review.rating !== undefined ? review.rating : 0.5));
  const existingSuccess = entry.defensive_routine.success_rate || 0.5;
  const existingWeight = entry.defensive_routine.times_applied || 1;

  const updatedSuccess = ((existingSuccess * existingWeight) + rating) / (existingWeight + 1);
  entry.defensive_routine.success_rate = Math.round(updatedSuccess * 100) / 100;
  entry.defensive_routine.review_count = (entry.defensive_routine.review_count || 0) + 1;
  entry.defensive_routine.last_reviewed_at = new Date().toISOString();
  entry.defensive_routine.review_history = entry.defensive_routine.review_history || [];
  entry.defensive_routine.review_history.push({
    review_id: 'rev' + Math.random().toString(36).slice(2, 9),
    incident_id: incidentId,
    reviewed_at: new Date().toISOString(),
    rating,
    comments: review.comments || ''
  });

  const payoffWeight = entry.defensive_routine.payoff_weight || 0.5;
  entry.defensive_routine.payoff_rating = Math.round((((entry.defensive_routine.success_rate || 0.5) * 0.7) + (payoffWeight * 0.3)) * 100) / 100;

  write('knowledge', knowledge);
  return entry;
}

/**
 * Get routine effectiveness metrics
 */
function getRoutineMetrics() {
  const knowledge = read('knowledge');
  const routines = knowledge.filter(k => k.defensive_routine && k.defensive_routine.enabled);

  const metrics = {
    total_routines: routines.length,
    highly_effective: routines.filter(r => r.defensive_routine.success_rate >= 0.85).length,
    moderately_effective: routines.filter(r => r.defensive_routine.success_rate >= 0.6 && r.defensive_routine.success_rate < 0.85).length,
    needs_improvement: routines.filter(r => r.defensive_routine.success_rate < 0.6).length,
    avg_success_rate: routines.length > 0 
      ? (routines.reduce((sum, r) => sum + r.defensive_routine.success_rate, 0) / routines.length).toFixed(2)
      : 0,
    avg_payoff_weight: routines.length > 0
      ? (routines.reduce((sum, r) => sum + (r.defensive_routine.payoff_weight || 0.5), 0) / routines.length).toFixed(2)
      : 0,
    avg_payoff_rating: routines.length > 0
      ? (routines.reduce((sum, r) => sum + (r.defensive_routine.payoff_rating || 0), 0) / routines.length).toFixed(2)
      : 0,
    most_applied: routines
      .sort((a, b) => b.defensive_routine.times_applied - a.defensive_routine.times_applied)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        title: r.title,
        times_applied: r.defensive_routine.times_applied,
        success_rate: (r.defensive_routine.success_rate * 100).toFixed(1) + '%'
      })),
    highest_success: routines
      .filter(r => r.defensive_routine.times_applied >= 3) // Only those with enough uses
      .sort((a, b) => b.defensive_routine.success_rate - a.defensive_routine.success_rate)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        title: r.title,
        success_rate: (r.defensive_routine.success_rate * 100).toFixed(1) + '%',
        times_applied: r.defensive_routine.times_applied
      }))
  };

  return metrics;
}

/**
 * Create defensive routine checklist for incident response
 */
function createResponseChecklist(incidentId) {
  const incidents = read('incidents');
  const incident = incidents.find(i => i.id === incidentId);

  if (!incident) throw new Error('Incident not found');

  const suggestions = suggestRoutines(incident);
  
  const checklist = {
    id: 'chk' + Math.random().toString(36).slice(2, 9),
    incident_id: incidentId,
    status: 'in-progress',
    created_at: new Date().toISOString(),
    items: []
  };

  // Generate checklist items from top recommendations
  suggestions.top_recommendations.forEach((routine, idx) => {
    const steps = parseStepsFromContent(routine.content_preview);
    
    steps.forEach((step, stepIdx) => {
      checklist.items.push({
        id: 'item' + Math.random().toString(36).slice(2, 9),
        routine_id: routine.knowledge_id,
        routine_title: routine.title,
        priority: idx === 0 ? 'critical' : idx < 2 ? 'high' : 'medium',
        description: step,
        completed: false,
        completed_at: null,
        completed_by: null,
        notes: null
      });
    });
  });

  return checklist;
}

/**
 * Helper: Extract steps from knowledge content
 */
function parseStepsFromContent(content) {
  const lines = content.split('\n');
  const steps = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    // Match numbered steps like "1. Do something" or "- Do something"
    if (/^\d+\.|^-|^•/.test(trimmed)) {
      steps.push(trimmed.replace(/^\d+\.|^-|^•/, '').trim());
    }
  });

  return steps.slice(0, 5); // Limit to 5 steps
}

/**
 * Helper: Get contributor name
 */
function getContributorName(userId) {
  const users = read('users') || [];
  const user = users.find(u => u.id === userId);
  return user ? user.name : 'Unknown';
}

/**
 * Analyze routine library coverage
 */
function analyzeCoverage() {
  const knowledge = read('knowledge');
  const incidents = read('incidents');
  const routines = knowledge.filter(k => k.defensive_routine && k.defensive_routine.enabled);

  // Group incidents by type
  const incidentsByType = {};
  incidents.forEach(inc => {
    if (!incidentsByType[inc.type]) {
      incidentsByType[inc.type] = [];
    }
    incidentsByType[inc.type].push(inc);
  });

  // Check routine coverage
  const coverage = {};
  Object.entries(incidentsByType).forEach(([type, incs]) => {
    const covered = routines.filter(r => 
      r.defensive_routine.applicable_incident_types.includes(type) ||
      r.tags?.some(tag => type.toLowerCase().includes(tag.toLowerCase()))
    ).length;

    coverage[type] = {
      total_incidents: incs.length,
      covered_by_routines: covered > 0 ? 'Yes' : 'No',
      available_routines: covered,
      coverage_percentage: covered > 0 ? Math.round((covered / routines.length) * 100) : 0
    };
  });

  const nistFunctionCounts = routines.reduce((counts, r) => {
    const fn = r.defensive_routine.nist_function || 'PR';
    counts[fn] = (counts[fn] || 0) + 1;
    return counts;
  }, {});

  return {
    total_routines: routines.length,
    incident_types_covered: Object.keys(coverage).filter(t => coverage[t].covered_by_routines === 'Yes').length,
    coverage_by_type: coverage,
    nist_function_counts: nistFunctionCounts,
    gaps: Object.entries(coverage)
      .filter(([_, data]) => data.covered_by_routines === 'No')
      .map(([type, _]) => `${type} - Consider creating a defensive routine`)
  };
}

module.exports = {
  linkKnowledgeToRoutine,
  suggestRoutines,
  recordRoutineApplication,
  reviewRoutineEffectiveness,
  getRoutineMetrics,
  createResponseChecklist,
  analyzeCoverage
};
