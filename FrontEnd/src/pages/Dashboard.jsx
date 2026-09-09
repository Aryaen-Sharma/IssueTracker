import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import TopBar from '../components/TopBar'
import { useToast } from '../context/useToast'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']
const PAGE_SIZE = 6

const statusClass = (status) => `badge-${status.toLowerCase().replace(/\s+/g, '-')}`
const priorityClass = (priority) => `priority-${priority.toLowerCase()}`
const isOverdue = (issue) => issue.due_date && issue.status !== 'Closed' && issue.due_date < new Date().toISOString().slice(0, 10)

const Dashboard = () => {
  const { showToast } = useToast()

  const [issues, setIssues] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingIssues, setLoadingIssues] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    due_date: '',
    labels: '',
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Search / filter / sort controls
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [labelFilter, setLabelFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  const fetchIssues = async (targetPage = page) => {
    setLoadingIssues(true)
    try {
      const response = await api.get('/auth/', {
        params: { skip: targetPage * PAGE_SIZE, limit: PAGE_SIZE },
      })
      setIssues(response.data.items)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Error fetching issues:', error.response?.data || error.message)
    } finally {
      setLoadingIssues(false)
    }
  }

  useEffect(() => {
    fetchIssues(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value })
  }

  const handleNewIssueSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)

    const payload = {
      ...formData,
      due_date: formData.due_date || null,
      labels: formData.labels
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean),
    }

    try {
      await api.post('/auth/createIssue', payload)
      setFormData({ title: '', description: '', status: 'Open', priority: 'Medium', due_date: '', labels: '' })
      showToast('Issue created', 'success')
      setPage(0)
      await fetchIssues(0)
    } catch (error) {
      console.error('Error creating issue:', error.response?.data || error.message)
      setFormError('Could not create the issue. Please check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Optimistic update: flip the status in the UI immediately, then confirm
  // with the server. If the request fails, roll back to the previous value.
  const handleStatusChange = async (id, newStatus) => {
    const previous = issues
    setIssues((prev) => prev.map((issue) => (issue.id === id ? { ...issue, status: newStatus } : issue)))

    try {
      await api.patch(`/auth/${id}`, { status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error.response?.data || error.message)
      setIssues(previous)
      showToast('Could not update status', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return
    try {
      await api.delete(`/auth/${id}`)
      showToast('Issue deleted', 'success')
      await fetchIssues(page)
    } catch (error) {
      console.error('Error deleting issue:', error.response?.data || error.message)
      showToast('Could not delete issue', 'error')
    }
  }

  const allLabels = useMemo(() => {
    const labelSet = new Set()
    issues.forEach((issue) => (issue.labels || []).forEach((label) => labelSet.add(label)))
    return Array.from(labelSet).sort()
  }, [issues])

  const visibleIssues = useMemo(() => {
    let result = issues

    if (statusFilter !== 'All') {
      result = result.filter((issue) => issue.status === statusFilter)
    }

    if (labelFilter !== 'All') {
      result = result.filter((issue) => (issue.labels || []).includes(labelFilter))
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
      if (sortBy === 'due_date') return (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99')
      return 0
    })

    return result
  }, [issues, searchTerm, statusFilter, labelFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

            <div className="field field-status">
              <label htmlFor="due_date">Due date</label>
              <input
                id="due_date"
                type="date"
                className="input"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="field field-desc">
              <label htmlFor="labels">Labels</label>
              <input
                id="labels"
                type="text"
                className="input"
                placeholder="bug, backend (comma separated)"
                name="labels"
                value={formData.labels}
                onChange={handleInputChange}
              />
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

          <select className="input" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
            <option value="All">All labels</option>
            {allLabels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>

          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
            <option value="due_date">By due date</option>
          </select>
        </section>

        <div className="list-header">
          <h2>Issues ({visibleIssues.length})</h2>
          <button className="btn btn-outline btn-sm" onClick={() => fetchIssues(page)} disabled={loadingIssues}>
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
                  <div className="issue-tags">
                    <span className={`priority-tag ${priorityClass(issue.priority || 'Medium')}`}>
                      {issue.priority || 'Medium'} priority
                    </span>
                    {issue.due_date && (
                      <span className={`due-tag ${isOverdue(issue) ? 'due-overdue' : ''}`}>
                        {isOverdue(issue) ? 'Overdue: ' : 'Due '}{issue.due_date}
                      </span>
                    )}
                    {(issue.labels || []).map((label) => (
                      <span className="label-tag" key={label}>{label}</span>
                    ))}
                  </div>
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

        {total > PAGE_SIZE && (
          <div className="pagination">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loadingIssues}
            >
              ← Previous
            </button>
            <span className="hint" style={{ margin: 0 }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages || loadingIssues}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
