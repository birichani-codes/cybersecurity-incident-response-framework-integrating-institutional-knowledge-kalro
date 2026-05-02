import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [user])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      const summary = await api.get('/notifications/unread')
      setNotifs(res.data)
      setUnread(summary.data.unread_count)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`)
      setNotifs(n => n.map(x => x.id === notifId ? { ...x, read: true } : x))
      setUnread(Math.max(0, unread - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifs(n => n.map(x => ({ ...x, read: true })))
      setUnread(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleDelete = async (notifId) => {
    try {
      await api.delete(`/notifications/${notifId}`)
      const wasUnread = notifs.find(n => n.id === notifId)?.read === false
      setNotifs(n => n.filter(x => x.id !== notifId))
      if (wasUnread) setUnread(Math.max(0, unread - 1))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const getIcon = (type) => {
    const icons = {
      incident_alert: '🚨',
      escalation: '⚠️',
      knowledge_alert: '💡',
      info: 'ℹ️',
      warning: '⚡',
      critical: '🔴'
    }
    return icons[type] || 'ℹ️'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'var(--kalro-red)',
      high: 'var(--kalro-red-light)',
      normal: 'var(--kalro-green)',
      low: 'var(--kalro-green-light)'
    }
    return colors[severity] || 'var(--kalro-green)'
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '5px'
        }}
        title={`${unread} unread notifications`}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#ff4444',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            width: '400px',
            maxHeight: '600px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9f9f9'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              Notifications {unread > 0 && `(${unread})`}
            </h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2196F3',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No notifications
              </div>
            ) : (
              notifs.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: notif.read ? '#fff' : '#f5f5f5',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!notif.read) e.currentTarget.style.backgroundColor = '#eee'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.read ? '#fff' : '#f5f5f5'
                  }}
                >
                  {/* Icon */}
                  <div style={{ fontSize: '16px', marginTop: '2px' }}>
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: notif.read ? 'normal' : 'bold',
                        fontSize: '13px',
                        color: '#000',
                        marginBottom: '4px'
                      }}
                    >
                      {notif.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {notif.message}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#999',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getSeverityColor(notif.severity)
                        }}
                      />
                      {new Date(notif.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center'
                    }}
                  >
                    {notif.action_url && (
                      <a
                        href={notif.action_url}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '12px',
                          color: 'var(--kalro-green)',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        →
                      </a>
                    )}
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notif.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--kalro-green-light)',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notif.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
