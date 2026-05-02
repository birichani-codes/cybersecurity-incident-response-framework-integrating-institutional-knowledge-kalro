/**
 * DefensiveRoutinesPanel Component
 * Displays recommended defensive routines for an incident
 */

import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function DefensiveRoutinesPanel({ incidentId, onRoutineApplied }) {
  const [routines, setRoutines] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [applyingRoutineId, setApplyingRoutineId] = useState(null);

  useEffect(() => {
    if (incidentId) {
      fetchRoutines();
    }
  }, [incidentId]);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/incidents/${incidentId}/defensive-routines`);
      setRoutines(res.data);
    } catch(err) {
      setError(err.response?.data?.error || 'Failed to fetch routines');
    } finally {
      setLoading(false);
    }
  };

  const applyRoutine = async (knowledgeId, outcome) => {
    setApplyingRoutineId(knowledgeId);
    try {
      await api.post(`/incidents/${incidentId}/apply-routine/${knowledgeId}`, { outcome });
      if (onRoutineApplied) {
        onRoutineApplied();
      }
      // Refresh routines
      fetchRoutines();
    } catch(err) {
      error('Failed to apply routine');
    } finally {
      setApplyingRoutineId(null);
    }
  };

  if (loading) {
    return (
      <div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>
        <div style={{fontSize:14,fontFamily:'var(--font-mono)'}}>Loading defensive routines...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">{error}</div>
    );
  }

  if (!routines || routines.total_candidates === 0) {
    return (
      <div style={{padding:20,textAlign:'center',color:'var(--text3)'}}>
        <div style={{fontSize:14}}>No applicable defensive routines found for this incident type</div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Recommendations */}
      <div style={{marginBottom:20}}>
        <h4 style={{fontSize:14,fontFamily:'var(--font-mono)',color:'var(--text)',marginBottom:12}}>
          🎯 TOP RECOMMENDATIONS ({routines.top_recommendations.length})
        </h4>

        <div style={{display:'grid',gap:12}}>
          {routines.top_recommendations.map((routine, idx) => (
            <div
              key={routine.knowledge_id}
              onClick={() => setSelectedRoutine(selectedRoutine === routine.knowledge_id ? null : routine.knowledge_id)}
              style={{
                background:'var(--bg3)',
                border:'1px solid var(--border)',
                borderRadius:8,
                padding:16,
                cursor:'pointer',
                transition:'all 0.2s',
                boxShadow: selectedRoutine === routine.knowledge_id ? '0 0 0 2px var(--kalro-green)' : 'none'
              }}
            >
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{
                    display:'inline-block',
                    background:'var(--kalro-green)',
                    color:'white',
                    padding:'2px 6px',
                    borderRadius:3,
                    fontSize:10,
                    fontFamily:'var(--font-mono)',
                    fontWeight:600,
                    marginRight:8,
                    marginBottom:8
                  }}>
                    #{idx + 1}
                  </div>
                  <h5 style={{fontSize:14,fontWeight:600,color:'var(--text)',margin:0}}>
                    {routine.title}
                  </h5>
                  <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--font-mono)',marginTop:4}}>
                    by {routine.contributor_name}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--font-mono)',marginBottom:2}}>Match Score</div>
                  <div style={{fontSize:18,fontWeight:700,color:'var(--kalro-green)',fontFamily:'var(--font-mono)'}}>
                    {(routine.match_score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:8,marginBottom:12,fontSize:11}}>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:9,marginBottom:2}}>Success Rate</div>
                  <div style={{color:'var(--text)',fontWeight:600}}>{(routine.defensive_routine.success_rate * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:9,marginBottom:2}}>Times Applied</div>
                  <div style={{color:'var(--text)',fontWeight:600}}>{routine.defensive_routine.times_applied}</div>
                </div>
                <div>
                  <div style={{color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:9,marginBottom:2}}>Confidence</div>
                  <div style={{color:'var(--kalro-green)',fontWeight:600}}>{(routine.confidence_score * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Tags */}
              {routine.tags && routine.tags.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                  {routine.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      background:'var(--bg2)',
                      border:'1px solid var(--border)',
                      padding:'2px 6px',
                      borderRadius:3,
                      fontSize:10,
                      color:'var(--text3)'
                    }}>
                      #{tag}
                    </span>
                  ))}
                  {routine.tags.length > 3 && (
                    <span style={{color:'var(--text3)',fontSize:10}}>+{routine.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Expanded View */}
              {selectedRoutine === routine.knowledge_id && (
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                  <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.6,marginBottom:12}}>
                    {routine.content_preview}
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyRoutine(routine.knowledge_id, { success: true });
                      }}
                      disabled={applyingRoutineId === routine.knowledge_id}
                      className="btn btn-success"
                      style={{padding:'8px 12px',fontSize:12}}
                    >
                      {applyingRoutineId === routine.knowledge_id ? 'Applying...' : '✓ Applied Successfully'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applyRoutine(routine.knowledge_id, { success: false });
                      }}
                      disabled={applyingRoutineId === routine.knowledge_id}
                      style={{padding:'8px 12px',fontSize:12,background:'var(--kalro-red)',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}
                    >
                      {applyingRoutineId === routine.knowledge_id ? 'Processing...' : '✗ Did not apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Options */}
      {routines.all_recommendations.length > routines.top_recommendations.length && (
        <div style={{padding:12,background:'var(--bg3)',border:'1px dashed var(--border)',borderRadius:8,fontSize:12,color:'var(--text3)'}}>
          💡 {routines.all_recommendations.length - routines.top_recommendations.length} more routines available
        </div>
      )}
    </div>
  );
}
