import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api'
import TopBar from '../components/TopBar'

const STATUS_COLORS = { Open: '#6c8cff', 'In Progress': '#e0a63e', Closed: '#46c085' }
const PRIORITY_COLORS = { High: '#ef5a5a', Medium: '#e0a63e', Low: '#46c085' }

const Stats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/auth/stats')
        setStats(response.data)
      } catch (error) {
        console.error('Error fetching stats:', error.response?.data || error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statusData = stats
    ? [
        { name: 'Open', count: stats.open },
        { name: 'In Progress', count: stats.in_progress },
        { name: 'Closed', count: stats.closed },
      ]
    : []

  const priorityData = stats
    ? [
        { name: 'High', count: stats.high },
        { name: 'Medium', count: stats.medium },
        { name: 'Low', count: stats.low },
      ]
    : []

  return (
    <div className="page">
      <TopBar />
      <div className="container">
        <Link to="/" className="btn-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to dashboard
        </Link>

        <h2 style={{ marginBottom: '1rem' }}>Overview</h2>

        {loading ? (
          <div className="empty-state">Loading stats…</div>
        ) : !stats || stats.total === 0 ? (
          <div className="empty-state">No issues yet, so nothing to chart.</div>
        ) : (
          <>
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total issues</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.open}</span>
                <span className="stat-label">Open</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.in_progress}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.closed}</span>
                <span className="stat-label">Closed</span>
              </div>
            </div>

            <div className="charts-grid">
              <section className="panel chart-panel">
                <h2>By Status</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </section>

              <section className="panel chart-panel">
                <h2>By Priority</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Stats
