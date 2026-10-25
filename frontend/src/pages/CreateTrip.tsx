import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Users,
  Sparkles,
  AlertCircle,
  Navigation,
  Hotel,
  Utensils,
  Accessibility,
  Coins,
} from 'lucide-react';
import { tripService } from '../services/tripService';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateTrip: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    origin: '',
    destination: '',
    intermediate_stops: '',
    start_date: '',
    end_date: '',
    days: 3,
    travelers: 1,
    budget: '',
    currency: 'INR',
    transport_preference: 'Flight',
    accommodation_preference: 'Hotel',
    food_preference: 'Local Cuisine',
    accessibility_requirements: '',
    interests: [] as string[],
  });

  const availableInterests = [
    'Adventure & Trekking',
    'Food & Culinary Tours',
    'Culture & Temples',
    'Scenic Photography',
    'Nature & Wildlife',
    'Nightlife & Social',
    'Shopping & Local Bazaars',
    'Historical Heritage',
    'Beaches & Coastal',
    'Relaxation & Wellness',
  ];

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim()) {
      setError('Destination is required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload: any = {
        destination: formData.destination.trim(),
        origin: formData.origin.trim() || undefined,
        travelers: Number(formData.travelers) || 1,
        currency: formData.currency,
        interests: formData.interests,
        transport_preference: formData.transport_preference,
        accommodation_preference: formData.accommodation_preference,
        food_preference: formData.food_preference,
        accessibility_requirements: formData.accessibility_requirements.trim() || undefined,
      };

      if (formData.title.trim()) {
        payload.title = formData.title.trim();
      }

      if (formData.intermediate_stops.trim()) {
        payload.intermediate_destinations = formData.intermediate_stops
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (formData.start_date) payload.start_date = formData.start_date;
      if (formData.end_date) payload.end_date = formData.end_date;

      if (formData.start_date && formData.end_date) {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        payload.days = diffDays;
      } else {
        payload.days = Number(formData.days) || 3;
      }

      if (formData.budget) {
        payload.budget = Number(formData.budget);
      }

      const res = await tripService.createTrip(payload);
      navigate(`/itinerary/${res.trip.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to generate trip. The AI agents encountered a momentary issue. Please try again.'
      );
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <LoadingSpinner message="WanderAI 5-Agent Pipeline in Action: Researching destinations, ranking user preferences, computing deterministic budgets, scheduling multi-modal logistics, and reviewing complete itinerary..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center">
        <span className="text-xs uppercase font-bold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          5-Agent Autonomous Intelligence
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mt-3 mb-2 text-white">
          Plan Your Next Journey
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
          Tailored itineraries with curated destination imagery, real-time hotel & flight options,
          and transparent budget allocations.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 bg-surface p-6 sm:p-10 rounded-3xl border border-border shadow-xl"
      >
        {/* Destination & Origin */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Origin City (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-3.5 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="e.g. Mumbai, New Delhi, New York"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Destination City / Region <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-4 py-3.5 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="e.g. London, Goa, Paris, Tokyo, Canada"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Intermediate stops */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Intermediate Stops / En-Route Places (Optional)
          </label>
          <input
            type="text"
            className="block w-full px-4 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="e.g. Agra, Jaipur (comma-separated)"
            value={formData.intermediate_stops}
            onChange={(e) => setFormData({ ...formData, intermediate_stops: e.target.value })}
          />
        </div>

        {/* Dates & Travelers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <input
                type="date"
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              End Date
            </label>
            <input
              type="date"
              className="block w-full px-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={formData.end_date}
              min={formData.start_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Travelers
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <input
                type="number"
                min="1"
                max="50"
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={formData.travelers}
                onChange={(e) =>
                  setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
        </div>

        {/* Budget & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Budget Target (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <input
                type="number"
                min="100"
                step="100"
                className="block w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. 50000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="block w-full px-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        {/* Travel Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              Transport Mode
            </label>
            <select
              value={formData.transport_preference}
              onChange={(e) => setFormData({ ...formData, transport_preference: e.target.value })}
              className="block w-full px-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="Flight">Flight</option>
              <option value="Train">Train / Railways</option>
              <option value="Bus">Intercity Bus</option>
              <option value="Car / Self-Drive">Car / Self-Drive</option>
              <option value="Budget-Friendly">Most Economical</option>
              <option value="Fastest">Fastest Option</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Hotel className="w-3.5 h-3.5 text-secondary" />
              Lodging Style
            </label>
            <select
              value={formData.accommodation_preference}
              onChange={(e) =>
                setFormData({ ...formData, accommodation_preference: e.target.value })
              }
              className="block w-full px-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="Hotel">Standard Hotel (3-4 Star)</option>
              <option value="Luxury Resort">Luxury Resort (5 Star)</option>
              <option value="Hostel">Boutique Hostel</option>
              <option value="Homestay">Homestay / Airbnb</option>
              <option value="Budget">Budget Guesthouse</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-accent" />
              Food Preference
            </label>
            <select
              value={formData.food_preference}
              onChange={(e) => setFormData({ ...formData, food_preference: e.target.value })}
              className="block w-full px-3 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="Local Cuisine">Local Cuisine & Street Food</option>
              <option value="Vegetarian">Pure Vegetarian</option>
              <option value="Vegan">Vegan Only</option>
              <option value="Halal">Halal</option>
              <option value="Fine Dining">Fine Dining</option>
            </select>
          </div>
        </div>

        {/* Accessibility & Special Requirements */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Accessibility className="w-3.5 h-3.5 text-primary" />
            Accessibility & Special Needs (Optional)
          </label>
          <input
            type="text"
            className="block w-full px-4 py-3 border border-border rounded-xl bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            placeholder="e.g. Wheelchair access required, traveling with infant, stroller-friendly paths"
            value={formData.accessibility_requirements}
            onChange={(e) =>
              setFormData({ ...formData, accessibility_requirements: e.target.value })
            }
          />
        </div>

        {/* Interests */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
              Travel Interests & Themes
            </label>
            <span className="text-xs text-primary font-medium">
              {formData.interests.length} Selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {availableInterests.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full border text-xs font-medium transition-all ${
                  formData.interests.includes(interest)
                    ? 'bg-primary/20 border-primary text-primary shadow-sm'
                    : 'bg-background border-border text-muted hover:border-primary/50 hover:text-text'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-background font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)]"
          >
            <Sparkles className="w-5 h-5" />
            <span>Generate Autonomous Itinerary</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTrip;
