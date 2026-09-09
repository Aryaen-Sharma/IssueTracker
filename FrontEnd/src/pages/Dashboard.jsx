import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import TopBar from '../components/TopBar'
import { useToast } from '../context/useToast'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

const statusClass = (status) => `badge-${status.toLowerCase().replace(/\s+/g, '-')}`
const priorityClass = (priority) => `priority-${priority.toLowerCase()}`

const Dashboard = () => {
  const { showToast } = useToast()

  const [issues, setIssues] = useState([])
  const [loadingIssues, setLoadingIssues] = useState(false)

  const [formData, setFormData] = useState({ title: '', description: '', status: 'Open', priority: 'Medium' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Search / filter / sort controls
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  const fetchIssues = async () => {
    setLoadingIssues(true)
    try {
      const response = await api.get('/auth/')
      setIssues(response.data)
    } catch (error) {
      console.error('Error fetching issues:', error.response?.data || error.message)
    } finally {
      setLoadingIssues(false)
    }
  }

  useEffect(() => {
    fetchIssues()
  }, [])

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
  }

  const handleNewIssueSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      await api.post('/auth/createIssue', formData)
      setFormData({ title: '', description: '', status: 'Open', priority: 'Medium' })
      showToast('Issue created', 'success')
      await fetchIssues()
    } catch (error) {
      console.error('Error creating issue:', error.response?.data || error.message)
      setFormError('Could not create the issue. Please check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/auth/${id}`, { status: newStatus })
      await fetchIssues()
    } catch (error) {
      console.error('Error updating status:', error.response?.data || error.message)
      showToast('Could not update status', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return
    try {
      await api.delete(`/auth/${id}`)
      setIssues((prev) => prev.filter((issue) => issue.id !== id))
      showToast('Issue deleted', 'success')
    } catch (error) {
      console.error('Error deleting issue:', error.response?.data || error.message)
      showToast('Could not delete issue', 'error')
    }
  }

  const visibleIssues = useMemo(() => {
    let result = issues

    if (statusFilter !== 'All') {
      result = result.filter((issue) => issue.status === statusFilter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      result = result.filter(
        (issue) =>
          issue.title.toLowerCase().includes(term) ||
          (issue.description || '').toLowerCase().includes(term)
      )
    }

    const priorityRank = { High: 3, Medium: 2, Low: 1 }
    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') return (b.created_at || '').localeCompare(a.created_at || '')
      if (sortBy === 'oldest') return (a.created_at || '').localeCompare(b.created_at || '')
      if (sortBy === 'priority') return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
      return 0
    })

    return result
  }, [issues, searchTerm, statusFilter, sortBy])

  return (
    <div className="page">
      <TopBar />

      <div className="container">
        {/* Create Issue */}
        <section className="panel">
          <h2>New Issue</h2>
          <form className="new-issue-form" onSubmit={handleNewIssueSubmit}>
            <div className="field field-title">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder="Issue title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="field field-desc">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                className="input"
                placeholder="Describe the issue"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="field field-status">
              <label htmlFor="status">Status</label>
              <select id="status" className="input" name="status" value={formData.status} onChange={handleInputChange}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="field field-status">
              <label htmlFor="priority">Priority</label>
              <select id="priority" className="input" name="priority" value={formData.priority} onChange={handleInputChange}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Issue'}
            </button>
          </form>
          {formError && <div className="alert alert-danger">{formError}</div>}
        </section>

        {/* Controls */}
        <section className="controls-bar">
          <input
            type="text"
            className="input search-input"
            placeholder="Search issues…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
          </select>
        </section>

        <div className="list-header">
          <h2>Issues ({visibleIssues.length})</h2>
          <button className="btn btn-outline btn-sm" onClick={fetchIssues} disabled={loadingIssues}>
            {loadingIssues ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {visibleIssues.length === 0 ? (
          <div className="empty-state">
            {loadingIssues
              ? 'Loading issues…'
              : issues.length === 0
                ? 'No issues yet. Create one above.'
                : 'No issues match your search/filter.'}
          </div>
        ) : (
          <div className="issue-list">
            {visibleIssues.map((issue) => (
              <div className="issue-card" key={issue.id}>
                <div className="issue-main">
                  <Link to={`/issues/${issue.id}`} className="issue-title-link">
                    <p className="issue-title">{issue.title}</p>
                  </Link>
                  <p className="issue-desc">{issue.description || 'No description'}</p>
                  <span className={`priority-tag ${priorityClass(issue.priority || 'Medium')}`}>
                    {issue.priority || 'Medium'} priority
                  </span>
                </div>

                <div className="issue-side">
                  <select
                    className={`badge-select ${statusClass(issue.status)}`}
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>

                  <div className="issue-actions">
                    <Link to={`/issues/${issue.id}`} className="btn btn-outline btn-sm">
                      View
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(issue.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
