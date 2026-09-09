import axios from 'axios'

// In production, set VITE_API_URL to your deployed backend's URL.
// Falls back to localhost for local development.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
});

// Automatically attach the JWT (if we have one) to every request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If the token is expired/invalid, clear it and send the user back to login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
