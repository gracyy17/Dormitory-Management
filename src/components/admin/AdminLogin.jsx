import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../../styles/AdminLogin.css';
import { useAuth } from '../../context/AuthContext';

function AdminLogin() {
  const navigate = useNavigate();
  const { loginWithRole, user, role, isFirebaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginWithRole({ email, password, expectedRole: 'admin' });
      navigate('/admin');
    } catch (authError) {
      setError(authError.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (user && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-shape shape-1"></div>
        <div className="background-shape shape-2"></div>
        <div className="background-shape shape-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏢</div>
          <h1 className="login-title">MZ Dormitory</h1>
          <p className="login-subtitle">Dormitory Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="email"
                type="email"
                placeholder="admin@mzdormitory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-credentials">Client/Admin access requires a Firebase user with role: <strong>admin</strong>.</p>
          {!isFirebaseConfigured && <p className="demo-credentials">Firebase env values are missing. Check your .env file.</p>}
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
