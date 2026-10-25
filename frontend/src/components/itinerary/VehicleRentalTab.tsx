import React, { useState, useEffect } from 'react';
import {
  Car,
  Star,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Check,
  BookmarkPlus,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Zap,
  Fuel,
  Info,
} from 'lucide-react';
import { Trip, RentalOffer } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface VehicleRentalTabProps {
  trip: Trip;
  onBookingAdded?: () => void;
}

const VEHICLE_CATEGORIES = [
  'All',
  'Economy / Compact',
  'SUV',
  'Electric / Hybrid',
  'Luxury',
  'Van / Minivan',
];

const TRANSMISSION_OPTIONS = ['All', 'Automatic', 'Manual'];

export const VehicleRentalTab: React.FC<VehicleRentalTabProps> = ({
  trip,
  onBookingAdded,
}) => {
  const [location, setLocation] = useState(trip.destination || '');
  const [pickupDate, setPickupDate] = useState(trip.start_date || '');
  const [dropoffDate, setDropoffDate] = useState(trip.end_date || '');
  const [passengers, setPassengers] = useState(trip.travelers || 2);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTransmission, setSelectedTransmission] = useState('All');

  const [rentals, setRentals] = useState<RentalOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [rentalDays, setRentalDays] = useState(1);
  const [savedRentalIds, setSavedRentalIds] = useState<Record<string, boolean>>({});
  const [bookedRentalIds, setBookedRentalIds] = useState<Record<string, boolean>>({});

  // Booking Confirmation Modal
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<RentalOffer | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    handleSearch();
  }, [trip.destination]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!location.trim()) return;

    try {
      setLoading(true);
      const res = await tripService.searchRentals({
        location: location.trim(),
        pickup_date: pickupDate || undefined,
        dropoff_date: dropoffDate || undefined,
        passengers,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        transmission: selectedTransmission !== 'All' ? selectedTransmission : undefined,
        currency: trip.display_currency || trip.currency || 'INR',
      });
      setRentals(res.rentals || []);
      setRentalDays(res.days || 1);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to search rental vehicles.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Save to Bookings as Planned Reservation
  const handleSaveToBookings = async (rental: RentalOffer) => {
    try {
      await tripService.createBooking(trip.id, {
        booking_type: 'rental_car',
        title: `Rental: ${rental.vehicle_name} (${rental.provider})`,
        provider: rental.provider,
        reference_number: rental.id,
        status: 'planned',
        amount: rental.total_price,
        currency: rental.currency,
        start_date: rental.pickup_date || pickupDate,
        end_date: rental.dropoff_date || dropoffDate,
        details: {
          vehicle_name: rental.vehicle_name,
          category: rental.category,
          transmission: rental.transmission,
          pickup_location: rental.pickup_location,
          dropoff_location: rental.dropoff_location,
          daily_rate: rental.daily_rate,
          days: rental.days,
          seats: rental.seats,
          bags: rental.bags,
          cancellation_policy: rental.cancellation_policy,
        },
      });

      setSavedRentalIds((prev) => ({ ...prev, [rental.id]: true }));
      if (onBookingAdded) onBookingAdded();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save vehicle reservation.');
    }
  };

  // 2. Pre-Book Now (Confirmation Modal Trigger)
  const handleOpenBookingModal = (rental: RentalOffer) => {
    setSelectedVehicleForBooking(rental);
    setIsBookingModalOpen(true);
    setBookingSuccessMessage(null);
  };

  const handleConfirmPreBooking = async () => {
    if (!selectedVehicleForBooking) return;

    try {
      setBookingLoading(true);
      await tripService.bookRental(trip.id, {
        vehicle_name: selectedVehicleForBooking.vehicle_name,
        provider: selectedVehicleForBooking.provider,
        category: selectedVehicleForBooking.category,
        transmission: selectedVehicleForBooking.transmission,
        pickup_location: selectedVehicleForBooking.pickup_location,
        dropoff_location: selectedVehicleForBooking.dropoff_location,
        pickup_date: selectedVehicleForBooking.pickup_date || pickupDate,
        dropoff_date: selectedVehicleForBooking.dropoff_date || dropoffDate,
        days: selectedVehicleForBooking.days || rentalDays,
        daily_rate: selectedVehicleForBooking.daily_rate,
        total_price: selectedVehicleForBooking.total_price,
        currency: selectedVehicleForBooking.currency,
        seats: selectedVehicleForBooking.seats,
        bags: selectedVehicleForBooking.bags,
        spec_tags: selectedVehicleForBooking.spec_tags,
        badge: selectedVehicleForBooking.badge,
        image_url: selectedVehicleForBooking.image_url,
        cancellation_policy: selectedVehicleForBooking.cancellation_policy,
      });

      setBookedRentalIds((prev) => ({ ...prev, [selectedVehicleForBooking.id]: true }));
      setBookingSuccessMessage(
        `Pre-booked ${selectedVehicleForBooking.vehicle_name}! Reservation saved & logged under Transportation expenses.`
      );

      if (onBookingAdded) onBookingAdded();

      setTimeout(() => {
        setIsBookingModalOpen(false);
        setSelectedVehicleForBooking(null);
      }, 1800);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete vehicle pre-booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const activeCurrency = trip.display_currency || trip.currency || 'INR';
  const currencySymbol =
    activeCurrency === 'USD'
      ? '$'
      : activeCurrency === 'EUR'
      ? '€'
      : activeCurrency === 'GBP'
      ? '£'
      : activeCurrency === 'AED'
      ? 'AED '
      : activeCurrency === 'CAD'
      ? 'CA$'
      : activeCurrency === 'AUD'
      ? 'A$'
      : '₹';

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Pick-up Location */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Pick-up Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Airport or Station"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Pick-up Date */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Pick-up Date
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Drop-off Date */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Drop-off Date
              </label>
              <input
                type="date"
                value={dropoffDate}
                min={pickupDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Seats / Passengers */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Passengers / Seats
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted font-medium mr-1">Vehicle Type:</span>
              {VEHICLE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl border text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-background border-border text-muted hover:border-emerald-500/40 hover:text-text'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted font-medium mr-1">Transmission:</span>
                {TRANSMISSION_OPTIONS.map((trans) => (
                  <button
                    key={trans}
                    type="button"
                    onClick={() => setSelectedTransmission(trans)}
                    className={`px-3 py-1 rounded-xl border text-xs font-medium transition-all ${
                      selectedTransmission === trans
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                        : 'bg-background border-border text-muted hover:border-emerald-500/40 hover:text-text'
                    }`}
                  >
                    {trans}
                  </button>
                ))}
              </div>

              {/* CTA Search Button matching Q Search Lodging */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 ml-auto"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Searching Vehicles...' : '🔍 Search Vehicles'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>
            Searching verified vehicle inventory for <strong>{location}</strong> ({rentalDays} {rentalDays === 1 ? 'day' : 'days'}). Pre-booking automatically syncs with your Transportation budget and itinerary schedule.
          </span>
        </div>
        <span className="font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] uppercase tracking-wider shrink-0">
          Verified Fleets
        </span>
      </div>

      {/* Vehicle Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
        </div>
      ) : rentals.length === 0 ? (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          No vehicles matched your search filters. Try adjusting dates, passenger requirements, or vehicle categories.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rentals.map((rental) => {
            const isSaved = !!savedRentalIds[rental.id];
            const isBooked = !!bookedRentalIds[rental.id];

            return (
              <div
                key={rental.id}
                className="bg-surface border border-border hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all group hover:shadow-lg hover:shadow-emerald-500/5"
              >
                {/* Vehicle Photo Banner */}
                <div className="h-48 w-full relative overflow-hidden bg-neutral-800">
                  <img
                    src={rental.image_url}
                    alt={rental.vehicle_name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                      {rental.badge}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 uppercase">
                      {rental.category}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <div>
                      <h4 className="text-lg font-bold text-white drop-shadow truncate">
                        {rental.vehicle_name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-yellow-400 mt-0.5">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-semibold text-white">
                          {rental.provider}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-white font-semibold">{rental.rating.toFixed(1)}</span>
                          <span className="text-gray-300 text-[11px]">({rental.review_count} reviews)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    {/* Pickup / Return Location */}
                    <div className="flex items-start gap-1.5 text-xs text-muted bg-background p-2.5 rounded-xl border border-border/60">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="text-text font-medium">Pick-up:</span> {rental.pickup_location}
                      </div>
                    </div>

                    {/* Spec Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-background border border-border px-2.5 py-1 rounded-lg text-text">
                        <Users className="w-3 h-3 text-emerald-400" />
                        {rental.seats} Seats
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-background border border-border px-2.5 py-1 rounded-lg text-text">
                        <Briefcase className="w-3 h-3 text-secondary" />
                        {rental.bags} Large Bags
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-background border border-border px-2.5 py-1 rounded-lg text-text">
                        <Fuel className="w-3 h-3 text-primary" />
                        {rental.transmission}
                      </span>
                      {rental.spec_tags.slice(3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-background border border-border px-2 py-0.5 rounded-md text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Cancellation Policy */}
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{rental.cancellation_policy}</span>
                    </div>
                  </div>

                  {/* Pricing and Actions Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-accent">
                        {currencySymbol}
                        {rental.daily_rate.toLocaleString()}
                        <span className="text-xs text-muted font-normal"> / day</span>
                      </div>
                      <div className="text-[11px] text-muted font-medium">
                        Total {currencySymbol}
                        {rental.total_price.toLocaleString()} for {rental.days} {rental.days === 1 ? 'day' : 'days'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Save Button */}
                      <button
                        onClick={() => handleSaveToBookings(rental)}
                        disabled={isSaved || isBooked}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isSaved || isBooked
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-background hover:bg-emerald-500/10 text-text hover:text-emerald-400 border border-border'
                        }`}
                        title="Save to reservations as planned rental"
                      >
                        {isSaved || isBooked ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                        <span>{isSaved || isBooked ? 'Saved' : 'Save'}</span>
                      </button>

                      {/* Pre-Book Now Button */}
                      <button
                        onClick={() => handleOpenBookingModal(rental)}
                        disabled={isBooked}
                        className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                          isBooked
                            ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        }`}
                      >
                        {isBooked ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pre-Booked</span>
                          </>
                        ) : (
                          <span>Pre-Book Now</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pre-Booking Confirmation Modal */}
      {isBookingModalOpen && selectedVehicleForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pre-Book Rental Vehicle</h3>
                  <p className="text-xs text-muted">Confirm vehicle reservation & expense tracking</p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-alt text-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success notification inside modal */}
            {bookingSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white">Booking Confirmed!</h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  {bookingSuccessMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {/* Vehicle Banner */}
                <div className="flex items-center gap-4 bg-background p-3.5 rounded-2xl border border-border">
                  <img
                    src={selectedVehicleForBooking.image_url}
                    alt={selectedVehicleForBooking.vehicle_name}
                    className="w-20 h-16 object-cover rounded-xl shrink-0"
                  />
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-sm font-bold text-white truncate">
                      {selectedVehicleForBooking.vehicle_name}
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium">
                      {selectedVehicleForBooking.provider} • {selectedVehicleForBooking.category}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {selectedVehicleForBooking.seats} Seats • {selectedVehicleForBooking.transmission}
                    </p>
                  </div>
                </div>

                {/* Rental Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted block text-[10px] uppercase font-semibold">Pick-up Date</span>
                    <span className="font-semibold text-text">
                      {selectedVehicleForBooking.pickup_date || pickupDate}
                    </span>
                  </div>
                  <div className="bg-background p-3 rounded-xl border border-border">
                    <span className="text-muted block text-[10px] uppercase font-semibold">Drop-off Date</span>
                    <span className="font-semibold text-text">
                      {selectedVehicleForBooking.dropoff_date || dropoffDate}
                    </span>
                  </div>
                  <div className="bg-background p-3 rounded-xl border border-border col-span-2">
                    <span className="text-muted block text-[10px] uppercase font-semibold">Pick-up & Drop Location</span>
                    <span className="font-semibold text-text truncate block">
                      {selectedVehicleForBooking.pickup_location}
                    </span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-300 font-medium block">
                      {currencySymbol}
                      {selectedVehicleForBooking.daily_rate.toLocaleString()} / day × {selectedVehicleForBooking.days || rentalDays} days
                    </span>
                    <span className="text-[11px] text-muted">Includes taxes & unlimited kilometers</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400 block">
                      {currencySymbol}
                      {selectedVehicleForBooking.total_price.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted uppercase">Total Reservation Cost</span>
                  </div>
                </div>

                {/* Automation & Cross-Feature Notes */}
                <div className="bg-background/80 p-3 rounded-xl border border-border space-y-1.5 text-[11px] text-muted">
                  <div className="flex items-center gap-1.5 text-text font-medium">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Automated Trip Sync:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li>Adds a confirmed entry to your <strong>Reservations</strong> tab.</li>
                    <li>Logs an expense under <strong>Transportation</strong> category.</li>
                    <li>Displays a <strong>🚗 Car Rental Active</strong> badge on itinerary days.</li>
                    <li>Grounds the <strong>AI Companion</strong> with your pickup station and return deadlines.</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPreBooking}
                    disabled={bookingLoading}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{bookingLoading ? 'Confirming...' : 'Confirm Pre-Booking'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
