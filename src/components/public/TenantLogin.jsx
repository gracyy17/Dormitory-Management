import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import '../../styles/AdminLogin.css';
import { useAuth } from '../../context/AuthContext';
import { BrandIcon, LockIcon, MailIcon } from '../common/LineIcons';

function TenantLogin() {
  const navigate = useNavigate();
  const { loginWithRole, user, role, mustChangePassword, isFirebaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginWithRole({ email, password, expectedRole: 'tenant' });
      navigate(result.mustChangePassword ? '/tenant/profile' : '/tenant/dues');
    } catch (authError) {
      setError(authError.message || 'Unable to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  if (user && role === 'tenant') {
    return <Navigate to={mustChangePassword ? '/tenant/profile' : '/tenant/dues'} replace />;
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
          <div className="login-logo" aria-hidden="true">
            <BrandIcon className="ui-icon" size={34} />
          </div>
          <h1 className="login-title">MZ Dormitory</h1>
          <p className="login-subtitle">Tenant Portal Access</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tenant-email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <MailIcon className="ui-icon" size={16} />
              </span>
              <input
                id="tenant-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tenant@mzdormitory.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tenant-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">
                <LockIcon className="ui-icon" size={16} />
              </span>
              <input
                id="tenant-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-credentials">Tenant login requires a Firebase user with role: <strong>tenant</strong>.</p>
          {!isFirebaseConfigured && <p className="demo-credentials">Firebase env values are missing. Check your .env file.</p>}
          <p className="demo-credentials">
            <Link className="login-nav-link" to="/">Back to Public Website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default TenantLogin;
