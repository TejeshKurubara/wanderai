import React, { useState, useEffect } from 'react';
import {
  Plane,
  Clock,
  ArrowRight,
  ExternalLink,
  BookmarkPlus,
  Check,
  Search,
  Luggage,
  Sparkles,
} from 'lucide-react';
import { Trip, FlightOffer } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface FlightSearchTabProps {
  trip: Trip;
  onBookingAdded?: () => void;
}

export const FlightSearchTab: React.FC<FlightSearchTabProps> = ({
  trip,
  onBookingAdded,
}) => {
  const [origin, setOrigin] = useState(trip.origin || 'Mumbai (BOM)');
  const [destination, setDestination] = useState(trip.destination || '');
  const [departureDate, setDepartureDate] = useState(trip.start_date || '');
  const [passengers, setPassengers] = useState(trip.travelers || 1);
  const [cabinClass, setCabinClass] = useState('economy');
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [savedFlightIds, setSavedFlightIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Perform initial flight search automatically for convenience
    handleSearch();
  }, [trip.destination]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!destination) return;

    try {
      setLoading(true);
      const res = await tripService.searchFlights({
        origin,
        destination,
        departure_date: departureDate || undefined,
        passengers,
        cabin_class: cabinClass,
        currency: trip.currency || 'INR',
      });
      setFlights(res.flights || []);
      setIsDemo(res.is_demo);
      setSearched(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to search flights.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBookings = async (flight: FlightOffer) => {
    try {
      await tripService.createBooking(trip.id, {
        booking_type: 'flight',
        title: `Flight: ${flight.airline} (${flight.flight_number}) ${flight.origin_airport} → ${flight.destination_airport}`,
        provider: flight.airline,
        reference_number: flight.flight_number,
        status: 'planned', // Defaults to planned, never automatically confirmed
        amount: flight.price,
        currency: flight.currency,
        start_date: departureDate || undefined,
        booking_url: flight.booking_url,
        details: {
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration: flight.duration,
          stops: flight.stops,
          baggage: flight.baggage_included,
        },
      });

      setSavedFlightIds((prev) => ({ ...prev, [flight.id]: true }));
      if (onBookingAdded) onBookingAdded();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save flight to reservations.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Departure (Origin)
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="City or Airport (e.g. BOM)"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Arrival (Destination)
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City or Airport (e.g. GOI, LHR)"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Travelers
              </label>
              <input
                type="number"
                min="1"
                max="9"
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <div className="flex items-center gap-4 text-xs text-muted">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cabin"
                  value="economy"
                  checked={cabinClass === 'economy'}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="text-primary"
                />
                Economy
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cabin"
                  value="business"
                  checked={cabinClass === 'business'}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="text-primary"
                />
                Business
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Search Flights'}</span>
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
              Showing verified realistic flight fares. External GDS API keys can be configured
              anytime in <code>backend/.env</code>.
            </span>
          </div>
          <span className="font-semibold px-2 py-0.5 rounded bg-primary/20 text-[10px] uppercase">
            Live Preview
          </span>
        </div>
      )}

      {/* Flight Results List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : flights.length === 0 ? (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          No flight offers found for this route. Adjust your cities and dates above.
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => {
            const isSaved = !!savedFlightIds[flight.id];
            const currencySymbol = flight.currency === 'USD' ? '$' : '₹';

            return (
              <div
                key={flight.id}
                className="bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Airline & Details */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-background rounded-xl border border-border flex items-center justify-center font-bold text-primary font-mono text-base">
                      {flight.airline_code}
                    </div>
                    <div>
                      <div className="font-bold text-text text-base flex items-center gap-2">
                        <span>{flight.airline}</span>
                        <span className="text-xs font-normal text-muted bg-background px-2 py-0.5 rounded border border-border">
                          {flight.flight_number}
                        </span>
                      </div>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <Luggage className="w-3.5 h-3.5 text-primary" />
                        <span>{flight.baggage_included}</span>
                        <span>•</span>
                        <span className="capitalize">{flight.cabin_class}</span>
                        <span>•</span>
                        <span className="text-emerald-400">
                          {flight.seats_remaining} seats left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Flight Times & Duration */}
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <div className="text-lg font-bold text-text">{flight.departure_time}</div>
                      <div className="text-xs text-muted font-mono">{flight.origin_airport}</div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="text-[11px] text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {flight.duration}
                      </div>
                      <div className="w-20 sm:w-28 h-px bg-border my-1 relative">
                        <Plane className="w-3.5 h-3.5 text-primary absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      </div>
                      <div className="text-[10px] text-primary">
                        {flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop`}
                      </div>
                    </div>

                    <div>
                      <div className="text-lg font-bold text-text">{flight.arrival_time}</div>
                      <div className="text-xs text-muted font-mono">{flight.destination_airport}</div>
                    </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border gap-2">
                    <div className="text-left sm:text-right">
                      <div className="text-xl font-bold text-accent">
                        {currencySymbol}
                        {flight.price.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted">per passenger</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveToBookings(flight)}
                        disabled={isSaved}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSaved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-background hover:bg-primary/20 text-text hover:text-primary border border-border'
                        }`}
                        title="Add to trip reservations as planned booking"
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      <a
                        href={flight.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 bg-primary/10 hover:bg-primary hover:text-background text-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-primary/30"
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
