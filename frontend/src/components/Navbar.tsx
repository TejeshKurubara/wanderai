import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, PlusCircle, User as UserIcon, LogOut, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold tracking-wide text-text">WanderAI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/currency" className="text-muted hover:text-text transition-colors flex items-center gap-1.5 text-sm font-medium">
              <Coins className="w-4 h-4 text-primary" />
              <span>Currency Exchange</span>
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-muted hover:text-text transition-colors text-sm font-medium">Dashboard</Link>
                <Link to="/create-trip" className="text-muted hover:text-text transition-colors text-sm font-medium">Create Trip</Link>
                <span className="text-sm text-primary font-medium px-3 py-1 bg-primary/10 rounded-full">
                  {user?.name}
                </span>
                <button onClick={handleLogout} className="text-muted hover:text-red-400 transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-muted hover:text-text transition-colors text-sm font-medium">Login</Link>
                <Link to="/register" className="bg-primary hover:bg-primary/90 text-background px-4 py-2 rounded-full font-medium transition-colors text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link to="/" className="flex flex-col items-center gap-1 text-muted hover:text-primary">
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link to="/currency" className="flex flex-col items-center gap-1 text-muted hover:text-primary">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-[10px]">Currency</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted hover:text-primary">
                <Compass className="w-5 h-5" />
                <span className="text-[10px]">Trips</span>
              </Link>
              <Link to="/create-trip" className="flex flex-col items-center justify-center w-12 h-12 bg-primary text-background rounded-full -mt-6 shadow-lg shadow-primary/20">
                <PlusCircle className="w-6 h-6" />
              </Link>
              <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-muted hover:text-red-400">
                <LogOut className="w-5 h-5" />
                <span className="text-[10px]">Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="flex flex-col items-center gap-1 text-muted hover:text-primary">
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px]">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
