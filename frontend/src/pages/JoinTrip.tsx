import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { tripService } from '../services/tripService';

export const JoinTrip: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.trim().toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await tripService.joinTrip(code.trim().toUpperCase());
      setSuccess(res.message || 'Successfully joined trip!');
      setTimeout(() => {
        navigate(`/trip/${res.trip.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 bg-background min-h-[75vh]">
      <div className="bg-surface border border-border rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
          <Users className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Join a Shared Trip</h2>
          <p className="text-xs text-muted leading-relaxed">
            Enter the 6-character trip invite code shared by your travel companion to access the group itinerary and expense pool.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success} Redirecting to itinerary...</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K2M9P"
              className="w-full bg-background border-2 border-border focus:border-emerald-500 rounded-2xl py-3 text-center text-2xl font-mono font-bold tracking-widest text-emerald-400 uppercase focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <span>Join Group Trip</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-border/50 text-[11px] text-muted">
          Want to create your own trip?{' '}
          <button
            onClick={() => navigate('/create-trip')}
            className="text-primary hover:underline font-semibold"
          >
            Create Itinerary
          </button>
        </div>
      </div>
    </div>
  );
};
