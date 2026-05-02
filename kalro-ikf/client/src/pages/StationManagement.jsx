import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function StationManagement() {
  const { isAdmin } = useAuth();
  const [stations, setStations] = useState([]);
  const [globalRoutines, setGlobalRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // 'overview', 'global-routines'

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [stRes, grRes] = await Promise.all([
        api.get('/sync/stations'),
        api.get('/sync/global-routines')
      ]);
      setStations(stRes.data);
      setGlobalRoutines(grRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Load failed:', err);
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>Super Admin access required for Station Management</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🏛️ Station Management</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Configure and monitor the hub-spoke network of security stations
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setTab('overview')}
          style={{
            padding: '10px 20px',
            backgroundColor: tab === 'overview' ? 'var(--kalro-green)' : 'var(--surface)',
            color: tab === 'overview' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📊 Network Overview
        </button>
        <button
          onClick={() => setTab('global-routines')}
          style={{
            padding: '10px 20px',
            backgroundColor: tab === 'global-routines' ? 'var(--kalro-green)' : 'var(--surface)',
            color: tab === 'global-routines' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔄 Global Routines ({globalRoutines.length})
        </button>
      </div>

      {loading ? (
        <p>Loading station data...</p>
      ) : (
        <>
          {tab === 'overview' && (
            <div>
              <h2>Hub-Spoke Network</h2>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px',
                  marginBottom: '30px',
                  border: '1px solid #ddd'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      width: '80px',
                      height: '80px',
                      backgroundColor: 'var(--kalro-red)',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      marginBottom: '10px'
                    }}
                  >
                    🏢
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }}>KALRO Headquarters (HUB)</p>
                  <p style={{ color: '#666', fontSize: '14px' }}>Central policy management, approvals, consolidated reporting</p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px',
                    marginTop: '30px'
                  }}
                >
                  {stations.map(station => (
                    <div
                      key={station.name}
                      style={{
                        padding: '15px',
                        backgroundColor: 'white',
                        border: '2px solid var(--kalro-green)',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}
                    >
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--kalro-green)', margin: '0 0 10px 0' }}>
                        🔗 SPOKE: {station.name}
                      </p>
                      <div style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                        <p>📋 Incidents: {station.total_incidents}</p>
                        <p>👥 Users: {station.users}</p>
                        <p>📚 Local Routines: {station.local_routines}</p>
                      </div>
                      <p style={{ fontSize: '10px', color: '#999', margin: '10px 0 0 0' }}>
                        Last sync: {new Date(station.synced_at).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Statistics */}
              <h2>Network Statistics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                {[
                  { label: 'Total Stations', value: stations.length, color: 'var(--kalro-green)' },
                  {
                    label: 'Total Incidents',
                    value: stations.reduce((sum, s) => sum + s.total_incidents, 0),
                    color: 'var(--kalro-red)'
                  },
                  {
                    label: 'Total Users',
                    value: stations.reduce((sum, s) => sum + s.users, 0),
                    color: 'var(--kalro-green-light)'
                  },
                  {
                    label: 'Local Routines',
                    value: stations.reduce((sum, s) => sum + s.local_routines, 0),
                    color: 'var(--kalro-red-light)'
                  }
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '20px',
                      backgroundColor: stat.color,
                      color: 'white',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{stat.value}</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'global-routines' && (
            <div>
              <h2>Globally Approved Defensive Routines</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                These routines are approved and available to all stations across the network
              </p>
              {globalRoutines.length === 0 ? (
                <p style={{ color: '#999' }}>No global routines approved yet</p>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {globalRoutines.map(routine => (
                    <div
                      key={routine.id}
                      style={{
                        padding: '15px',
                        border: '1px solid var(--kalro-green)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--kalro-green-pale)',
                        borderLeft: '4px solid var(--kalro-green)'
                      }}
                    >
                      <h4 style={{ margin: '0 0 10px 0' }}>{routine.title}</h4>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Source:</strong> {routine.station_id || 'Hub'}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Approved:</strong> {new Date(routine.approved_at).toLocaleDateString()}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '14px', lineHeight: '1.5' }}>
                        {routine.content.substring(0, 200)}...
                      </p>
                      {routine.tags && routine.tags.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          {routine.tags.map((tag, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                backgroundColor: 'var(--kalro-green)',
                                color: 'white',
                                borderRadius: '3px',
                                fontSize: '12px',
                                marginRight: '5px',
                                marginBottom: '5px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
