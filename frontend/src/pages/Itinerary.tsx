import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Info,
  ExternalLink,
  Plane,
  Hotel,
  Navigation,
  Wallet,
  CalendarCheck,
  ShieldAlert,
  Edit3,
  X,
  Users,
  Zap,
  RefreshCw,
  MessageSquare,
  Coins,
  CheckSquare,
  Square,
  Globe,
  Sparkles,
  Compass,
  AlertTriangle,
  PlusCircle,
  Car,
  WifiOff,
  Download,
} from 'lucide-react';
import { tripService } from '../services/tripService';
import { Trip, Booking } from '../types/trip';
import { PlaceDetailsModal } from '../components/PlaceDetailsModal';
import { BudgetExpenseTracker } from '../components/itinerary/BudgetExpenseTracker';
import { FlightSearchTab } from '../components/itinerary/FlightSearchTab';
import { HotelSearchTab } from '../components/itinerary/HotelSearchTab';
import { VehicleRentalTab } from '../components/itinerary/VehicleRentalTab';
import { TransportGuideTab } from '../components/itinerary/TransportGuideTab';
import { BookingsManagerTab } from '../components/itinerary/BookingsManagerTab';
import { EmergencyEssentialsTab } from '../components/itinerary/EmergencyEssentialsTab';
import { RouteOptimizationTab } from '../components/itinerary/RouteOptimizationTab';
import { ReplanTripTab } from '../components/itinerary/ReplanTripTab';
import { AICompanionTab } from '../components/itinerary/AICompanionTab';
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget';
import { CollaboratorModal } from '../components/itinerary/CollaboratorModal';
import { offlineStorage } from '../services/offlineStorage';
import { useAuth } from '../context/AuthContext';
import ItineraryLoadingSkeleton from '../components/itinerary/ItineraryLoadingSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

type ActiveTab =
  | 'itinerary'
  | 'optimize'
  | 'replan'
  | 'companion'
  | 'currency'
  | 'flights'
  | 'hotels'
  | 'rentals'
  | 'transport'
  | 'budget'
  | 'bookings'
  | 'emergency';

const Itinerary: React.FC = () => {
  const { user } = useAuth();
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  // Place Modal
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit Trip Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    origin: '',
    budget: 0,
    travelers: 1,
    booking_status: 'Planning',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [tripBookings, setTripBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (tripId) {
      fetchTrip(tripId);
      loadTripBookings(tripId);
    }
  }, [tripId]);

  const loadTripBookings = async (id: string) => {
    try {
      if (!navigator.onLine) {
        const cached = await offlineStorage.getCachedBookings(id);
        if (cached && cached.length > 0) {
          setTripBookings(cached);
          return;
        }
      }
      const res = await tripService.getBookings(id);
      setTripBookings(res.bookings || []);
      await offlineStorage.cacheBookings(id, res.bookings || []);
    } catch (err) {
      const cached = await offlineStorage.getCachedBookings(id);
      if (cached && cached.length > 0) {
        setTripBookings(cached);
      } else {
        console.warn('Could not load reservations for car rental timeline badge:', err);
      }
    }
  };

  const isCarRentalActiveForDay = (dayDateStr?: string) => {
    if (!tripBookings || tripBookings.length === 0) return false;
    const rentalBookings = tripBookings.filter(
      (b) =>
        (b.booking_type === 'rental_car' || b.booking_type === 'car_rental') &&
        (b.status === 'confirmed' || b.status === 'planned')
    );
    if (rentalBookings.length === 0) return false;

    if (!dayDateStr) {
      return rentalBookings.length > 0;
    }

    return rentalBookings.some((b) => {
      const start = b.start_date;
      const end = b.end_date;
      if (!start && !end) return true;
      if (start && end) {
        return dayDateStr >= start && dayDateStr <= end;
      }
      if (start && !end) return dayDateStr >= start;
      return false;
    });
  };

  const handleOpenGoogleCalendar = () => {
    if (!trip) return;
    const title = encodeURIComponent(trip.title || `Trip to ${trip.destination}`);
    const details = encodeURIComponent(
      `WanderAI Itinerary: ${trip.title}\nDestination: ${trip.destination}\nDuration: ${trip.days} days\nBudget: ${trip.currency} ${trip.budget || 'N/A'}`
    );
    const location = encodeURIComponent(trip.destination || '');

    let dates = '';
    if (trip.start_date && trip.end_date) {
      const s = trip.start_date.replace(/-/g, '');
      const e = trip.end_date.replace(/-/g, '');
      dates = `${s}/${e}`;
    } else {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      dates = `${today}/${today}`;
    }

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    window.open(gcalUrl, '_blank');
  };

  const fetchTrip = async (id: string) => {
    try {
      setLoading(true);
      setError('');

      if (!navigator.onLine) {
        setIsOffline(true);
        const cached = await offlineStorage.getCachedTrip(id);
        if (cached) {
          setTrip(cached);
          setEditFormData({
            title: cached.title || '',
            origin: cached.origin || '',
            budget: cached.budget || 0,
            travelers: cached.travelers || 1,
            booking_status: cached.booking_status || 'Planning',
          });
          setLoading(false);
          return;
        }
      }

      const data = await tripService.getTrip(id);
      setTrip(data.trip);
      await offlineStorage.cacheTrip(data.trip);

      setEditFormData({
        title: data.trip.title || '',
        origin: data.trip.origin || '',
        budget: data.trip.budget || 0,
        travelers: data.trip.travelers || 1,
        booking_status: data.trip.booking_status || 'Planning',
      });
    } catch (err: any) {
      const cached = await offlineStorage.getCachedTrip(id);
      if (cached) {
        setTrip(cached);
        setEditFormData({
          title: cached.title || '',
          origin: cached.origin || '',
          budget: cached.budget || 0,
          travelers: cached.travelers || 1,
          booking_status: cached.booking_status || 'Planning',
        });
      } else {
        setError(
          err?.response?.data?.message ||
            "Failed to load itinerary. It may have been deleted or doesn't exist."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    try {
      setSavingEdit(true);
      const res = await tripService.updateTrip(trip.id, {
        title: editFormData.title,
        origin: editFormData.origin,
        budget: Number(editFormData.budget),
        travelers: Number(editFormData.travelers),
        booking_status: editFormData.booking_status,
      });
      setTrip(res.trip);
      setShowEditModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update trip.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <ItineraryLoadingSkeleton />;
  }

  if (error || !trip) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto my-16">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-5 shadow-lg shadow-red-500/5">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2">Trip Itinerary Unavailable</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          {error || "We couldn't retrieve this itinerary. It may belong to another account, may have been removed, or the server is momentarily unreachable."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {tripId && (
            <button
              onClick={() => fetchTrip(tripId)}
              className="flex items-center gap-2 bg-primary text-background font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Loading</span>
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-surface border border-border text-text px-5 py-2.5 rounded-xl font-medium text-sm hover:border-primary hover:text-white transition-all shadow-sm"
          >
            <Compass className="w-4 h-4 text-primary" />
            <span>Go to Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/create-trip')}
            className="flex items-center gap-2 bg-surface-alt border border-border/80 text-muted px-4 py-2.5 rounded-xl font-medium text-sm hover:text-white hover:border-secondary transition-all"
          >
            <PlusCircle className="w-4 h-4 text-secondary" />
            <span>Create New Trip</span>
          </button>
        </div>
      </div>
    );
  }

  // Defensively parse itinerary object
  let itineraryObj: any = trip.itinerary;
  if (typeof itineraryObj === 'string') {
    try {
      itineraryObj = JSON.parse(itineraryObj);
    } catch {
      itineraryObj = {};
    }
  }

  const overview = itineraryObj?.overview || {};
  const rawDays = Array.isArray(itineraryObj?.days)
    ? itineraryObj.days
    : Array.isArray(itineraryObj)
    ? itineraryObj
    : [];
  const days = Array.isArray(rawDays) ? rawDays : [];

  const totalCost = Number(overview.estimated_total_cost?.amount || trip.budget || 0);

  const getEstimatedCost = (placeName: any, description: any) => {
    const safeName = String(placeName || 'Attraction');
    const safeDesc = String(description || '');
    const isFree = /park|market|walk|beach|street|free|square|bridge/i.test(
      safeName + ' ' + safeDesc
    );
    if (isFree) return 'Free Admission';

    if (!totalCost) return 'Standard entry';

    const numDays = Number(trip.days) || 1;
    const activityBudget = totalCost * 0.15;
    const avgCost = activityBudget / (Math.max(1, numDays) * 3);

    const hash = safeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variation = 0.5 + (hash % 100) / 100;

    const minCost = Math.max(100, Math.round((avgCost * variation * 0.7) / 100) * 100);
    const maxCost = Math.max(minCost + 100, Math.round((avgCost * variation * 1.3) / 100) * 100);

    return `₹${minCost.toLocaleString('en-IN')} – ₹${maxCost.toLocaleString('en-IN')}`;
  };

  const getRecommendation = (placeName: any) => {
    const interests = Array.isArray(trip.interests) ? trip.interests : [];
    if (interests.length === 0)
      return `A standout destination in ${trip.destination || 'your destination'}, thoroughly vetted by WanderAI.`;
    const matchedInterests = interests.slice(0, 2).join(' and ');
    return `Tailored for your ${matchedInterests} preferences, capturing the essence of ${trip.destination || 'the region'}.`;
  };

  const handlePlaceClick = (activity: any) => {
    const placeName = activity.title || activity.name || activity.place || 'Attraction';
    if (!placeName) return;

    setSelectedPlace({
      ...activity,
      name: placeName,
      estimatedCost: activity.cost || getEstimatedCost(placeName, activity.description || ''),
      recommendation: getRecommendation(placeName),
    });
    setIsModalOpen(true);
  };

  const heroImage = trip.image_url || DEFAULT_HERO_IMAGE;
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
      : activeCurrency === 'JPY'
      ? '¥'
      : activeCurrency === 'CAD'
      ? 'CA$'
      : activeCurrency === 'AUD'
      ? 'A$'
      : '₹';

  return (
    <ErrorBoundary fallbackTitle="Itinerary Screen Error">
      <div className="flex-grow flex flex-col bg-background pb-24">
        {/* Offline Mode Banner */}
        {isOffline && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Offline Mode (Cached Data) — Viewing cached itinerary. Expense updates will sync automatically when back online.
            </span>
          </div>
        )}

      {/* Hero Header Area */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden bg-neutral-900">
        <img
          src={heroImage}
          alt={trip.destination}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_HERO_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-black/30 z-10" />

        {/* Top Bar Navigation */}
        <div className="absolute top-5 left-4 right-4 z-20 max-w-7xl mx-auto flex justify-between items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors shadow-lg shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Quick Feature Shortcut Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {/* Collaborate & Invite Button */}
            <button
              onClick={() => setShowCollaboratorModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/25 shrink-0"
              title="Group trip collaborators & invite code"
            >
              <Users className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Collaborate</span>
            </button>

            {/* Calendar Export Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowCalendarMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black/75 hover:bg-black/90 text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/20"
                title="Sync itinerary with personal calendar"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                <span>Calendar Sync</span>
              </button>

              {showCalendarMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-1 z-50 text-xs">
                  <button
                    onClick={async () => {
                      setShowCalendarMenu(false);
                      await tripService.downloadCalendarIcs(trip.id, trip.title);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-text hover:bg-background rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download .ics Calendar</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCalendarMenu(false);
                      handleOpenGoogleCalendar();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-text hover:bg-background rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    <span>Add to Google Calendar</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('optimize')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-primary text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/10"
              title="Optimize travel route (2-opt TSP)"
            >
              <Zap className="w-3.5 h-3.5 text-primary group-hover:text-white" />
              <span className="hidden sm:inline">Optimize Route</span>
            </button>

            <button
              onClick={() => setActiveTab('replan')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-secondary text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/10"
              title="Replan itinerary for disruptions"
            >
              <RefreshCw className="w-3.5 h-3.5 text-secondary group-hover:text-white" />
              <span className="hidden sm:inline">Auto Replan</span>
            </button>

            <button
              onClick={() => setActiveTab('companion')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-primary text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/10"
              title="AI Travel Companion chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">AI Companion</span>
            </button>

            <button
              onClick={() => setActiveTab('currency')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-surface text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/10"
              title="Multi-Currency Converter"
            >
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span>{activeCurrency}</span>
            </button>

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black/60 hover:bg-primary/90 text-white rounded-xl backdrop-blur-md text-xs font-semibold transition-all shadow-lg border border-white/10 shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Trip</span>
            </button>
          </div>
        </div>

        {/* Hero Title & Trip Attributes */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest mb-1.5">
              <MapPin className="w-4 h-4" />
              <span>
                {trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-3 drop-shadow-md">
              {trip.title || `Trip to ${trip.destination}`}
            </h1>

            <div className="flex flex-wrap gap-2.5 text-xs text-white">
              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>
                  {trip.days} {trip.days === 1 ? 'Day' : 'Days'}
                  {trip.start_date && trip.end_date ? ` (${trip.start_date} to ${trip.end_date})` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                <Users className="w-3.5 h-3.5 text-secondary" />
                <span>
                  {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>

              {trip.budget !== null && trip.budget !== undefined && (
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
                  <span className="text-accent font-bold">{currencySymbol}</span>
                  <span>{Number(trip.budget || 0).toLocaleString()} Planned Budget</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-xl backdrop-blur-md uppercase tracking-wider font-semibold text-[11px]">
                <span>{trip.booking_status || 'Planning'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {[
              { id: 'itinerary', label: 'Day-by-Day Itinerary', icon: Calendar },
              { id: 'optimize', label: 'Route Optimizer', icon: Zap },
              { id: 'replan', label: 'Auto Replan', icon: RefreshCw },
              { id: 'companion', label: 'AI Companion', icon: MessageSquare },
              { id: 'currency', label: 'Currency & FX', icon: Coins },
              { id: 'flights', label: 'Flights', icon: Plane },
              { id: 'hotels', label: 'Hotels & Stays', icon: Hotel },
              { id: 'rentals', label: '🚗 Vehicle Rentals', icon: Car },
              { id: 'transport', label: 'Routes & Transit', icon: Navigation },
              { id: 'budget', label: 'Budget & Expenses', icon: Wallet },
              { id: 'bookings', label: 'Reservations', icon: CalendarCheck },
              { id: 'emergency', label: 'Safety & Hospital Directory', icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isEmeraldPill = tab.id === 'rentals' || tab.id === 'hotels';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? isEmeraldPill
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-primary text-background shadow-md'
                      : 'text-muted hover:text-text hover:bg-surface-alt'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-8">
        {/* TAB 1: ITINERARY */}
        {activeTab === 'itinerary' && (
          <div className="max-w-4xl mx-auto">
            {overview.summary && (
              <p className="text-muted leading-relaxed mb-8 text-base bg-surface p-5 rounded-2xl border border-border shadow-sm">
                {overview.summary}
              </p>
            )}

            <div className="space-y-10">
              {days.length > 0 ? (
                days.map((day: any, dayIdx: number) => {
                  const dayNum = day.day_number || day.day || dayIdx + 1;
                  const dayTitle = day.theme || day.title || `Day ${dayNum}`;
                  const activities = Array.isArray(day.activities)
                    ? day.activities
                    : Array.isArray(day.schedule)
                    ? day.schedule
                    : [];

                  return (
                    <div key={dayIdx} className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-10 bottom-0 w-px bg-border -z-10" />

                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-surface border-2 border-primary text-primary rounded-2xl flex items-center justify-center font-bold font-serif shrink-0 z-10 shadow-md">
                          D{dayNum}
                        </div>
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-xl font-bold text-text">{dayTitle}</h3>
                            {isCarRentalActiveForDay(day.date) && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                <Car className="w-3.5 h-3.5" />
                                <span>🚗 Car Rental Active</span>
                              </span>
                            )}
                          </div>
                          {day.date && <p className="text-xs text-primary font-medium">{day.date}</p>}
                        </div>
                      </div>

                      <div className="space-y-5 pl-14 sm:pl-16">
                        {activities.map((activity: any, actIdx: number) => {
                          const placeName = activity.title || activity.name || activity.place || 'Attraction';
                          const isCompleted = (trip.completed_activities || []).includes(
                            placeName
                          );
                          const estimatedCost =
                            activity.cost ||
                            getEstimatedCost(placeName, activity.description || '');

                          return (
                            <div
                              key={actIdx}
                              onClick={() => handlePlaceClick(activity)}
                            className={`bg-surface border p-5 rounded-2xl relative group transition-all cursor-pointer shadow-sm hover:shadow-primary/5 hover:-translate-y-0.5 ${
                              isCompleted
                                ? 'border-primary/40 bg-surface/60 opacity-80'
                                : 'border-border hover:border-primary/50 hover:bg-surface/80'
                            }`}
                          >
                            {/* Timeline Dot */}
                            <div
                              className={`absolute -left-9 sm:-left-11 top-6 w-3 h-3 rounded-full border-2 border-background transition-colors ${
                                isCompleted
                                  ? 'bg-primary'
                                  : 'bg-secondary group-hover:bg-primary'
                              }`}
                            />

                            <div className="flex justify-between items-start mb-2 gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!placeName) return;
                                    try {
                                      const res =
                                        await tripService.toggleActivityCompletion(
                                          trip.id,
                                          placeName,
                                          !isCompleted
                                        );
                                      setTrip(res.trip);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="p-1 rounded-lg hover:bg-surface-alt transition-colors shrink-0"
                                  title={
                                    isCompleted
                                      ? 'Mark not visited'
                                      : 'Mark as completed & protect in replanning'
                                  }
                                >
                                  {isCompleted ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                  )}
                                </button>
                                <h4
                                  className={`text-base font-bold transition-colors ${
                                    isCompleted
                                      ? 'line-through text-muted'
                                      : 'text-text group-hover:text-primary'
                                  }`}
                                >
                                  {placeName}
                                </h4>
                                {isCompleted && (
                                  <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
                                    Done
                                  </span>
                                )}
                              </div>
                              {activity.time && (
                                <div className="flex items-center gap-1 text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-md whitespace-nowrap">
                                  <Clock className="w-3 h-3" />
                                  <span>{activity.time}</span>
                                </div>
                              )}
                            </div>

                            <p className="text-muted text-xs sm:text-sm mb-3 leading-relaxed">
                              {activity.description}
                            </p>

                            <div className="flex flex-wrap gap-2.5 pt-3 border-t border-border/50">
                              {activity.location && (
                                <div className="flex items-center gap-1 text-xs text-muted bg-background px-2.5 py-1 rounded-md">
                                  <MapPin className="w-3 h-3 text-primary" />
                                  <span className="truncate max-w-[200px]">
                                    {activity.location}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted bg-background px-2.5 py-1 rounded-md">
                                <span className="text-accent font-bold text-xs">
                                  {currencySymbol}
                                </span>
                                <span>{estimatedCost}</span>
                              </div>
                            </div>

                            {activity.tips && (
                              <div className="mt-3 bg-primary/5 border border-primary/20 p-2.5 rounded-xl flex gap-2">
                                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-primary/90">
                                  <span className="font-semibold">AI Pro-Tip:</span> {activity.tips}
                                </p>
                              </div>
                            )}

                            <div className="mt-3 text-right">
                              <span className="text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                                View Place Details <ExternalLink className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {activities.length === 0 && (
                        <div className="text-muted text-xs italic">
                          No scheduled activities. Free exploration day!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
              ) : (
                <div className="bg-surface p-6 rounded-2xl border border-border text-center">
                  <p className="text-muted text-sm">
                    Itinerary details are not available or currently generating.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FLIGHT SEARCH */}
        {activeTab === 'flights' && (
          <FlightSearchTab
            trip={trip}
            onBookingAdded={() => {
              // Switch to bookings tab or notify
              setActiveTab('bookings');
            }}
          />
        )}

        {/* TAB 3: HOTEL SEARCH */}
        {activeTab === 'hotels' && (
          <HotelSearchTab
            trip={trip}
            onBookingAdded={() => {
              setActiveTab('bookings');
            }}
          />
        )}

        {/* TAB: CAR & VEHICLE RENTALS */}
        {activeTab === 'rentals' && (
          <VehicleRentalTab
            trip={trip}
            onBookingAdded={() => {
              if (tripId) {
                fetchTrip(tripId);
                loadTripBookings(tripId);
              }
            }}
          />
        )}

        {/* TAB 4: TRANSPORT & ROUTES */}
        {activeTab === 'transport' && <TransportGuideTab trip={trip} />}

        {/* TAB 5: BUDGET & EXPENSES */}
        {activeTab === 'budget' && <BudgetExpenseTracker trip={trip} />}

        {/* TAB 6: BOOKINGS & RESERVATIONS */}
        {activeTab === 'bookings' && <BookingsManagerTab trip={trip} />}

        {/* TAB 7: EMERGENCY & SAFETY */}
        {activeTab === 'emergency' && <EmergencyEssentialsTab trip={trip} />}

        {/* TAB 8: SMART ROUTE OPTIMIZATION */}
        {activeTab === 'optimize' && (
          <RouteOptimizationTab trip={trip} onTripUpdated={setTrip} />
        )}

        {/* TAB 9: AUTOMATIC ITINERARY REPLANNING */}
        {activeTab === 'replan' && (
          <ReplanTripTab trip={trip} onTripUpdated={setTrip} />
        )}

        {/* TAB 10: AI TRAVEL COMPANION */}
        {activeTab === 'companion' && <AICompanionTab trip={trip} />}

        {/* TAB 11: CURRENCY CONVERTER & MULTI-CURRENCY */}
        {activeTab === 'currency' && (
          <CurrencyConverterWidget trip={trip} onTripUpdated={setTrip} />
        )}
      </div>

      {/* Place Details Modal */}
      {selectedPlace && (
        <PlaceDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          placeName={selectedPlace.name}
          city={selectedPlace.location || trip.destination}
          country=""
          description={selectedPlace.description}
          duration="2-3 hours"
          timeOfDay={selectedPlace.time}
          estimatedCost={selectedPlace.estimatedCost}
          aiRecommendation={selectedPlace.recommendation}
        />
      )}

      {/* Edit Trip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-white mb-1">Edit Trip Parameters</h3>
            <p className="text-xs text-muted mb-5">
              Update summary and destination details for this journey
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
                    placeholder="e.g. Mumbai"
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
                    Budget ({currencySymbol})
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
                  onClick={() => setShowEditModal(false)}
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

      {/* Collaborator Management Modal */}
      {showCollaboratorModal && trip && (
        <CollaboratorModal
          trip={trip}
          isOpen={showCollaboratorModal}
          onClose={() => setShowCollaboratorModal(false)}
          onTripUpdated={() => {
            if (tripId) fetchTrip(tripId);
          }}
          currentUserId={user?.id}
        />
      )}
    </div>
  </ErrorBoundary>
);
};

export default Itinerary;
