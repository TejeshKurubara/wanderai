import React, { useState, useEffect } from 'react';
import {
  Hotel,
  Star,
  MapPin,
  ExternalLink,
  BookmarkPlus,
  Check,
  Search,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Trip, HotelOffer } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface HotelSearchTabProps {
  trip: Trip;
  onBookingAdded?: () => void;
}

export const HotelSearchTab: React.FC<HotelSearchTabProps> = ({
  trip,
  onBookingAdded,
}) => {
  const [destination, setDestination] = useState(trip.destination || '');
  const [checkIn, setCheckIn] = useState(trip.start_date || '');
  const [checkOut, setCheckOut] = useState(trip.end_date || '');
  const [guests, setGuests] = useState(trip.travelers || 2);
  const [minStars, setMinStars] = useState(3);
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [savedHotelIds, setSavedHotelIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    handleSearch();
  }, [trip.destination]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!destination) return;

    try {
      setLoading(true);
      const res = await tripService.searchHotels({
        destination,
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        guests,
        min_stars: minStars,
        currency: trip.currency || 'INR',
      });
      setHotels(res.hotels || []);
      setIsDemo(res.is_demo);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to search hotels.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBookings = async (hotel: HotelOffer) => {
    try {
      await tripService.createBooking(trip.id, {
        booking_type: 'hotel',
        title: `Hotel: ${hotel.name} (${hotel.room_type})`,
        provider: 'Booking.com',
        reference_number: hotel.id,
        status: 'planned', // Defaults to planned, never automatically confirmed
        amount: hotel.total_price,
        currency: hotel.currency,
        start_date: checkIn || undefined,
        end_date: checkOut || undefined,
        booking_url: hotel.booking_url,
        details: {
          address: hotel.address,
          room_type: hotel.room_type,
          stars: hotel.stars,
          rating: hotel.rating,
          cancellation_policy: hotel.cancellation_policy,
        },
      });

      setSavedHotelIds((prev) => ({ ...prev, [hotel.id]: true }));
      if (onBookingAdded) onBookingAdded();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save hotel reservation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City or Region"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Guests
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Min Class:</span>
              {[3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setMinStars(stars)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    minStars === stars
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-background border-border text-muted hover:border-primary/40'
                  }`}
                >
                  {stars}★
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Search Lodging'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Demo Mode Notice */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>
              Showing curated verified hotels and resorts in {destination}. Live API keys can be
              configured in <code>backend/.env</code>.
            </span>
          </div>
          <span className="font-semibold px-2 py-0.5 rounded bg-primary/20 text-[10px] uppercase">
            Curated Stays
          </span>
        </div>
      )}

      {/* Hotels Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          No hotels found. Try modifying your check-in dates or star filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((hotel) => {
            const isSaved = !!savedHotelIds[hotel.id];
            const currencySymbol = hotel.currency === 'USD' ? '$' : '₹';

            return (
              <div
                key={hotel.id}
                className="bg-surface border border-border hover:border-primary/50 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all group"
              >
                {/* Hotel Photo Banner */}
                <div className="h-48 w-full relative overflow-hidden bg-neutral-800">
                  <img
                    src={hotel.image_url}
                    alt={hotel.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-black/20" />

                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary text-background uppercase tracking-wider">
                      {hotel.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <div>
                      <h4 className="text-lg font-bold text-white drop-shadow truncate">
                        {hotel.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-yellow-400 mt-0.5">
                        <div className="flex">
                          {Array.from({ length: hotel.stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-white font-semibold ml-1">
                          {hotel.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-300 text-[11px]">
                          ({hotel.review_count} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{hotel.address}</span>
                    </div>

                    <div className="text-xs text-text font-medium bg-background p-2.5 rounded-xl border border-border/60">
                      Room:{' '}
                      <span className="text-primary font-semibold">{hotel.room_type}</span>
                    </div>

                    {/* Amenities pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.amenities.map((am) => (
                        <span
                          key={am}
                          className="text-[10px] bg-background border border-border px-2 py-0.5 rounded-md text-muted"
                        >
                          {am}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{hotel.cancellation_policy}</span>
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-accent">
                        {currencySymbol}
                        {hotel.price_per_night.toLocaleString()}
                        <span className="text-xs text-muted font-normal"> / night</span>
                      </div>
                      <div className="text-[11px] text-muted">
                        Total {currencySymbol}
                        {hotel.total_price.toLocaleString()} for stay
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveToBookings(hotel)}
                        disabled={isSaved}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isSaved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-background hover:bg-primary/20 text-text hover:text-primary border border-border'
                        }`}
                        title="Save to trip reservations as planned booking"
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      <a
                        href={hotel.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 bg-primary/10 hover:bg-primary hover:text-background text-primary px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border border-primary/30"
                      >
                        <span>Book</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
