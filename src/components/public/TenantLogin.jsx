import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import '../../styles/PublicWebsite.css';
import { useAuth } from '../../context/AuthContext';

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
    <div className="tenant-login-page">
      <div className="tenant-login-card">
        <h1>Tenant Portal</h1>
        <p>Login to view your dues, room details, and maintenance requests.</p>

        <form className="tenant-login-form" onSubmit={handleSubmit}>
          <label htmlFor="tenant-email">Email</label>
          <input
            id="tenant-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tenant@email.com"
            required
          />

          <label htmlFor="tenant-password">Password</label>
          <input
            id="tenant-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="tenant-login-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {!isFirebaseConfigured && (
          <p className="tenant-login-help">Firebase env values are missing. Add `VITE_FIREBASE_*` variables.</p>
        )}

        <div className="tenant-login-links">
          <Link to="/">Back to Public Website</Link>
        </div>
      </div>
    </div>
  );
}

export default TenantLogin;
