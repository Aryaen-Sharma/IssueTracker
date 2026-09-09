import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import TopBar from '../components/TopBar'
import { useToast } from '../context/useToast'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

const statusClass = (status) => `badge-${status.toLowerCase().replace(/\s+/g, '-')}`

const IssueDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '', status: 'Open', priority: 'Medium' })

  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const fetchIssue = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/auth/${id}`)
      setIssue(response.data)
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        setNotFound(true)
      }
      console.error('Error fetching issue:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const startEditing = () => {
    setEditData({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority || 'Medium',
    })
    setIsEditing(true)
  }

  const handleEditChange = (event) => {
    setEditData({ ...editData, [event.target.name]: event.target.value })
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    try {
      await api.patch(`/auth/${id}`, editData)
      setIsEditing(false)
      showToast('Issue updated', 'success')
      await fetchIssue()
    } catch (error) {
      console.error('Error updating issue:', error.response?.data || error.message)
      showToast('Could not update issue', 'error')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return
    try {
      await api.delete(`/auth/${id}`)
      showToast('Issue deleted', 'success')
      navigate('/')
    } catch (error) {
      console.error('Error deleting issue:', error.response?.data || error.message)
      showToast('Could not delete issue', 'error')
    }
  }

  const handleAddComment = async (event) => {
    event.preventDefault()
    if (!commentBody.trim()) return
    setPostingComment(true)
    try {
      const response = await api.post(`/auth/${id}/comments`, { body: commentBody.trim() })
      setIssue(response.data)
      setCommentBody('')
    } catch (error) {
      console.error('Error adding comment:', error.response?.data || error.message)
      showToast('Could not add comment', 'error')
    } finally {
      setPostingComment(false)
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <TopBar />
        <div className="container">
          <div className="empty-state">
            This issue doesn't exist or you don't have access to it.
            <br />
            <Link to="/" className="btn-link">Back to dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <TopBar />

      <div className="container">
        <Link to="/" className="btn-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to dashboard
        </Link>

        {loading || !issue ? (
          <div className="empty-state">Loading issue…</div>
        ) : isEditing ? (
          <section className="panel">
            <h2>Edit Issue</h2>
            <form onSubmit={saveEdit}>
              <div className="field">
                <label htmlFor="title">Title</label>
                <input id="title" className="input" name="title" value={editData.title} onChange={handleEditChange} required />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <input id="description" className="input" name="description" value={editData.description} onChange={handleEditChange} required />
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" className="input" name="status" value={editData.status} onChange={handleEditChange}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="priority">Priority</label>
                <select id="priority" className="input" name="priority" value={editData.priority} onChange={handleEditChange}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="issue-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel">
            <div className="detail-header">
              <div>
                <h2 style={{ marginBottom: '0.35rem' }}>{issue.title}</h2>
                <span className={`badge-select-static ${statusClass(issue.status)}`}>{issue.status}</span>
                <span className={`priority-tag priority-${(issue.priority || 'Medium').toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                  {issue.priority || 'Medium'} priority
                </span>
              </div>
              <div className="issue-actions">
                <button className="btn btn-outline btn-sm" onClick={startEditing}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              </div>
            </div>

            <p className="issue-desc" style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
              {issue.description || 'No description'}
            </p>

            <p className="hint" style={{ textAlign: 'left', marginTop: '1rem' }}>
              Created {issue.created_at} · Last updated {issue.updated_at}
            </p>
          </section>
        )}

        {issue && (
          <section className="panel">
            <h2>Comments ({issue.comments?.length || 0})</h2>

            {issue.comments && issue.comments.length > 0 ? (
              <div className="comment-list">
                {issue.comments.map((comment, index) => (
                  <div className="comment" key={index}>
                    <div className="comment-meta">
                      <strong>{comment.author}</strong>
                      <span className="hint" style={{ margin: 0 }}>{comment.created_at}</span>
                    </div>
                    <p className="comment-body">{comment.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint" style={{ textAlign: 'left' }}>No comments yet. Be the first to add one.</p>
            )}

            <form onSubmit={handleAddComment} style={{ marginTop: '1rem' }}>
              <div className="field">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={postingComment}>
                {postingComment ? 'Posting…' : 'Post Comment'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  )
}

export default IssueDetail
