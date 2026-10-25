import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await authService.login({ email, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-serif font-bold">Welcome Back</h2>
          <p className="text-muted mt-2">Sign in to access your curated journeys.</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted" />
              </div>
              <input 
                type="email" 
                required
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="explorer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted" />
              </div>
              <input 
                type="password" 
                required
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-background font-semibold py-3 px-4 rounded-xl transition-colors flex justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
