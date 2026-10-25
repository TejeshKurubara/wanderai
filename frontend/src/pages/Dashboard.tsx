import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Compass, AlertCircle, RefreshCw, X, Check, Calendar, Users, IndianRupee, Coins } from 'lucide-react';
import { tripService } from '../services/tripService';
import { Trip } from '../types/trip';
import { useAuth } from '../context/AuthContext';
import TripCard from '../components/TripCard';
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    origin: '',
    travelers: 1,
    budget: 0,
    booking_status: 'Planning',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError('');
      // Lightweight summary request for lightning-fast dashboard load
      const data = await tripService.getTrips(false);
      setTrips(data.trips || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trip itinerary and its saved bookings?')) {
      try {
        await tripService.deleteTrip(id);
        setTrips((prev) => prev.filter((t) => t.id !== id));
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Failed to delete trip.');
      }
    }
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setEditFormData({
      title: trip.title || '',
      origin: trip.origin || '',
      travelers: trip.travelers || 1,
      budget: trip.budget || 0,
      booking_status: trip.booking_status || 'Planning',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    try {
      setSavingEdit(true);
      const res = await tripService.updateTrip(editingTrip.id, {
        title: editFormData.title,
        origin: editFormData.origin,
        travelers: Number(editFormData.travelers),
        budget: Number(editFormData.budget),
        booking_status: editFormData.booking_status,
      });
      setTrips((prev) =>
        prev.map((t) => (t.id === editingTrip.id ? { ...t, ...res.trip } : t))
      );
      setEditingTrip(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update trip details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const totalDays = trips.reduce((acc, t) => acc + (t.days || 0), 0);
  const totalTravelers = trips.reduce((acc, t) => acc + (t.travelers || 1), 0);
  const totalBudget = trips.reduce((acc, t) => acc + (t.budget || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">
            Welcome back, <span className="text-primary">{user?.name || 'Explorer'}</span>
          </h1>
          <p className="text-muted text-sm">
            AI-driven itineraries, live hotel & flight search, and smart budget analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCurrencyModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface-alt border border-border px-4 py-3 rounded-xl font-semibold shadow-sm transition-colors text-xs sm:text-sm text-text"
          >
            <Coins className="w-4 h-4 text-primary" />
            <span>Currency Converter</span>
          </button>
          <Link
            to="/create-trip"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-background px-6 py-3 rounded-xl font-semibold shadow-md transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Plan New Journey</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Journeys</div>
          <div className="text-2xl font-bold text-text">{trips.length}</div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Days Planned</div>
          <div className="text-2xl font-bold text-text">{totalDays}</div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Travelers</div>
          <div className="text-2xl font-bold text-text">{totalTravelers}</div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Total Budget</div>
          <div className="text-2xl font-bold text-accent">₹{totalBudget.toLocaleString()}</div>
        </div>
      </div>

      {/* Section Title */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Your Itineraries & Trips</h2>
          <p className="text-xs text-muted">
            Destination imagery, multi-modal routing, and real-time expense monitoring
          </p>
        </div>

        <button
          onClick={fetchTrips}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center justify-between text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={fetchTrips}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse h-80 flex flex-col"
            >
              <div className="h-44 bg-neutral-800" />
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                </div>
                <div className="h-9 bg-neutral-800 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        /* Empty State */
        <div className="bg-surface border border-border rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Ready for your next expedition?</h3>
          <p className="text-muted mb-6 max-w-md text-sm">
            No journeys planned yet. WanderAI leverages a 5-agent AI pipeline to craft personalized,
            budgeted, day-by-day itineraries with photos, flights, and hotels in seconds.
          </p>
          <Link
            to="/create-trip"
            className="bg-primary text-background px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md"
          >
            Create Your First Trip
          </Link>
        </div>
      ) : (
        /* Trip Cards Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingTrip(null)}
              className="absolute top-4 right-4 text-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-white mb-1">Edit Trip Details</h3>
            <p className="text-xs text-muted mb-5">
              Update summary information for {editingTrip.destination}
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Origin City
                  </label>
                  <input
                    type="text"
                    value={editFormData.origin}
                    onChange={(e) => setEditFormData({ ...editFormData, origin: e.target.value })}
                    placeholder="e.g. Mumbai, New Delhi"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Travelers Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editFormData.travelers}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, travelers: Number(e.target.value) })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Budget ({editingTrip.currency || 'INR'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editFormData.budget}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, budget: Number(e.target.value) })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Booking Status
                  </label>
                  <select
                    value={editFormData.booking_status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, booking_status: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Booked">Booked</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-white border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-background transition-colors disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency Converter Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setShowCurrencyModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-surface-alt text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CurrencyConverterWidget defaultFrom="INR" defaultTo="USD" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
