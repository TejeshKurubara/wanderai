import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Trash2,
  ExternalLink,
  Plane,
  Hotel,
  Navigation,
  Car,
  Activity,
  CheckCircle,
  Tag,
  Clock,
} from 'lucide-react';
import { Trip, Booking } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface BookingsManagerTabProps {
  trip: Trip;
}

export const BookingsManagerTab: React.FC<BookingsManagerTabProps> = ({ trip }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual booking form
  const [formData, setFormData] = useState({
    booking_type: 'hotel' as Booking['booking_type'],
    title: '',
    provider: '',
    reference_number: '',
    status: 'planned' as Booking['status'],
    amount: '',
    start_date: trip.start_date || '',
    end_date: trip.end_date || '',
    notes: '',
  });

  useEffect(() => {
    loadBookings();
  }, [trip.id]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await tripService.getBookings(trip.id);
      setBookings(res.bookings || []);
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      const res = await tripService.updateBooking(trip.id, bookingId, {
        status: newStatus,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? res.booking : b))
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Delete this reservation?')) return;
    try {
      await tripService.deleteBooking(trip.id, bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete booking.');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setSubmitting(true);
      const res = await tripService.createBooking(trip.id, {
        booking_type: formData.booking_type,
        title: formData.title.trim(),
        provider: formData.provider.trim() || 'Direct',
        reference_number: formData.reference_number.trim(),
        status: formData.status,
        amount: Number(formData.amount) || 0,
        currency: trip.currency || 'INR',
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        notes: formData.notes.trim() || undefined,
      });

      setBookings((prev) => [res.booking, ...prev]);
      setShowAddModal(false);
      setFormData({
        booking_type: 'hotel',
        title: '',
        provider: '',
        reference_number: '',
        status: 'planned',
        amount: '',
        start_date: trip.start_date || '',
        end_date: trip.end_date || '',
        notes: '',
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'hotel':
        return <Hotel className="w-4 h-4 text-purple-400" />;
      case 'car_rental':
      case 'rental_car':
        return <Car className="w-4 h-4 text-emerald-400" />;
      case 'train':
      case 'bus':
        return <Navigation className="w-4 h-4 text-emerald-400" />;
      default:
        return <Activity className="w-4 h-4 text-amber-400" />;
    }
  };

  const filteredBookings =
    filterType === 'all'
      ? bookings
      : bookings.filter((b) => {
          if (filterType === 'rental_car') {
            return b.booking_type === 'rental_car' || b.booking_type === 'car_rental';
          }
          return b.booking_type === filterType;
        });

  const currencySymbol = trip.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Trip Reservations & Confirmation Tracker
          </h3>
          <p className="text-xs text-muted">
            Saved flights, hotel bookings, tickets, and external confirmation codes
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-background px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Reservation</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['all', 'flight', 'hotel', 'rental_car', 'train', 'activity', 'other'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-xl border font-medium capitalize transition-colors ${
              filterType === type
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-surface border-border text-muted hover:border-primary/40'
            }`}
          >
            {type === 'rental_car' ? 'Vehicles' : type}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          No {filterType !== 'all' ? filterType : ''} reservations recorded yet. Search flights or
          hotels in the tabs above, or add a custom reservation.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            const isPlanned = b.status === 'planned';
            const isPending = b.status === 'pending';
            const isCancelled = b.status === 'cancelled';
            const isRefunded = b.status === 'refunded';

            return (
              <div
                key={b.id}
                className="bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-background rounded-xl border border-border">
                        {getBookingIcon(b.booking_type)}
                      </div>
                      <div>
                        <div className="font-bold text-text text-sm leading-snug">{b.title}</div>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          <span>{b.provider}</span>
                          {b.reference_number && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-primary">
                                Ref: {b.reference_number}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBooking(b.id)}
                      className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete reservation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {b.notes && (
                    <p className="text-xs text-muted bg-background/60 p-2.5 rounded-xl border border-border/50 my-3">
                      {b.notes}
                    </p>
                  )}

                  {b.start_date && (
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-2">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {b.start_date} {b.end_date ? `to ${b.end_date}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-accent">
                      {currencySymbol}
                      {b.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted capitalize">{b.booking_type}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        handleStatusChange(b.id, e.target.value as Booking['status'])
                      }
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border bg-background ${
                        isConfirmed
                          ? 'text-emerald-400 border-emerald-500/40'
                          : isPlanned
                          ? 'text-sky-400 border-sky-500/40'
                          : isPending
                          ? 'text-yellow-400 border-yellow-500/40'
                          : isCancelled
                          ? 'text-red-400 border-red-500/40'
                          : isRefunded
                          ? 'text-cyan-400 border-cyan-500/40'
                          : 'text-neutral-400 border-neutral-700'
                      }`}
                    >
                      <option value="planned">Planned (Unbooked)</option>
                      <option value="quoted">Quoted</option>
                      <option value="pending">Pending Payment</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>

                    {b.booking_url && (
                      <a
                        href={b.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-primary hover:bg-primary/20 rounded-lg transition-colors border border-border"
                        title="Open external booking provider link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h4 className="text-lg font-bold text-white mb-1">Add Travel Reservation</h4>
            <p className="text-xs text-muted mb-4">
              Save an existing booking reference or planned reservation.
            </p>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={formData.booking_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        booking_type: e.target.value as Booking['booking_type'],
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="hotel">Hotel / Stay</option>
                    <option value="flight">Flight</option>
                    <option value="train">Train</option>
                    <option value="bus">Bus</option>
                    <option value="car_rental">Car Rental</option>
                    <option value="activity">Activity / Tour</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Booking['status'],
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="planned">Planned</option>
                    <option value="quoted">Quoted</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Beach Resort Deluxe Room"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Provider
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MakeMyTrip, IndiGo"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PNR / Booking ID"
                    value={formData.reference_number}
                    onChange={(e) =>
                      setFormData({ ...formData, reference_number: e.target.value })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Total Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 12000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-white border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-background transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
