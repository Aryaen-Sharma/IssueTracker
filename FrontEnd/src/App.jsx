import React, { useState, useEffect } from 'react'
import api from './api'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const App = () => {
  const [issues, setIssues] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: ''  
});
const [isLoggedIn, setIsLoggedIn] = useState(false);


const handleLogin = async (username, password) => {
  try {
    const response = await api.post('/auth/token', new URLSearchParams({
      username: username,
      password: password
    }));

    const token = response.data.access_token;

    localStorage.setItem('token', token);
    localStorage.setItem('user_id', response.data.user_id);
    setIsLoggedIn(true);
    setFormData({
    ...formData,
      owner_id: localStorage.getItem('user_id'),
    });

  } catch (error) {
    console.error("Login failed", error);
  }
};




const fetchIssues = async () => {
  const token = localStorage.getItem('token');

  if (token) {
    const response = await api.get('/auth/', {
      headers: {
        Authorization: `Bearer ${token}` 
      }
    });
    setIssues(response.data);
  }
};

useEffect(() => {
  fetchIssues();
}, []);


const handleInputChange = (event) => {
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  setFormData({
      ...formData,
      [event.target.name] : value,
      created_at: new Date(),
      updated_at: new Date()
  });
};

const handleNewIssueSubmit = async (event) => {
    
  
  event.preventDefault(); 
  const token = localStorage.getItem('token'); 
  

  
  try {
   
    await api.post('/auth/createIssue', formData, {
      headers: {
        Authorization: `Bearer ${token}` // Injects the JWT for authentication
      }
    });
    
      setFormData({
      ...formData,
      status: 'Open'
  });

       
    fetchIssues();

    // 4. Reset the form fields back to empty strings
    setFormData({
      ...formData,
      title: '',
      description: '',
      status: 'Open', // Resetting to a default value is better for UX
      created_at: "",
      updated_at: ""
    });

  } catch (error) {
    console.error("Error creating issue:", error.response?.data || error.message);
    // Pro-tip: Check error.response.status to see if it's a 401 (Auth) or 422 (Data) error
  }
};




  return (
   <>
    {!isLoggedIn ? (
      // LOGIN PAGE (username + password)
      <div className="container" style={{ maxWidth: '420px', marginTop: '100px' }}>
        <div className="card">
          <div className="card-body">
            <h3 className="text-center mb-4">Issue Tracker</h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault()

                const username = e.target.username.value
                const password = e.target.password.value

                await handleLogin(username, password)
                await fetchIssues()
              }}
            >
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  className="form-control"
                  name="username"
                  type="text"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Login
              </button>

              <div className="text-muted mt-3" style={{ fontSize: '0.9rem' }}>
                Test user: <code>test</code> / <code>testpass</code>
              </div>
            </form>
          </div>
        </div>
      </div>
    ) : (
      // ISSUES DASHBOARD
      <>
        <nav className="navbar navbar-dark bg-primary">
          <div className="container-fluid">
            <span className="navbar-brand">Issue Tracker</span>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => {
                localStorage.removeItem('token')
                setIsLoggedIn(false)
              }}
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="container mt-4">
          {/* Create Issue Form */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">New Issue</h5>

              <form onSubmit={handleNewIssueSubmit}>
                <div className="row g-2">
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Issue title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Hidden default status so backend always receives one */}
                  <input type="hidden" name="status" value={formData.status || "Open"} />

                  <div className="col-md-2">
                    <button type="submit" className="btn btn-primary w-100">
                      Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>


          {/* Issues Table */}
          <h5>Issues ({issues.length})</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-dark">
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">
                      No issues yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id || issue._id}>
                      <td>{issue.title}</td>
                      <td>{issue.description || '-'}</td>
                      <td>{issue.status || '-'}</td>
                      <td>
                        <button type="submit" className="btn btn-danger btn-sm">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </>
  )
}

export default App
