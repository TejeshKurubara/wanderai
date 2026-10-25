import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  TrendingDown,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Footprints,
  Car,
  Train,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { Trip, RouteOptimizationProposal } from '../../types/trip';
import { tripService } from '../../services/tripService';
import { CustomSelect } from '../common/CustomSelect';
import { RouteMap } from './RouteMap';

interface RouteOptimizationTabProps {
  trip: Trip;
  onTripUpdated: (updatedTrip: Trip) => void;
}

export const RouteOptimizationTab: React.FC<RouteOptimizationTabProps> = ({
  trip,
  onTripUpdated,
}) => {
  const itineraryDays = Array.isArray(trip.itinerary?.days)
    ? trip.itinerary.days
    : Array.isArray(trip.itinerary)
    ? trip.itinerary
    : [];
  const totalDays = Math.max(Number(trip.days) || 0, itineraryDays.length, 1);

  const dayScopeOptions = [
    { value: 'all', label: `Entire Trip (${totalDays} Days Scope)` },
    ...(itineraryDays.length > 0
      ? itineraryDays.map((d: any, idx: number) => {
          const dNum = d.day_number || d.day || idx + 1;
          const dTitle = d.theme || d.title || `Day ${dNum}`;
          return {
            value: dNum,
            label: `Day ${dNum}: ${dTitle}`,
          };
        })
      : Array.from({ length: totalDays }, (_, i) => ({
          value: i + 1,
          label: `Day ${i + 1} Only`,
        }))),
  ];

  const [mode, setMode] = useState<string>('auto');
  const [maxWalkingKm, setMaxWalkingKm] = useState<number>(2.5);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [startingPoint, setStartingPoint] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [undoing, setUndoing] = useState<boolean>(false);

  const [proposal, setProposal] = useState<RouteOptimizationProposal | null>(null);
  const [undoAvailable, setUndoAvailable] = useState<boolean>(
    Boolean(trip.has_revision_history)
  );
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const currencySymbol =
    trip.currency === 'USD'
      ? '$'
      : trip.currency === 'EUR'
      ? '€'
      : trip.currency === 'GBP'
      ? '£'
      : '₹';

  const handleOptimize = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const res = await tripService.optimizeRoute(trip.id, {
        mode,
        max_walking_km: maxWalkingKm,
        day_number: selectedDay === 'all' ? undefined : selectedDay,
        starting_point: startingPoint.trim() || undefined,
      });

      setProposal(res.proposal);
      setUndoAvailable(res.undo_available || Boolean(trip.has_revision_history));
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to calculate optimized route.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!proposal) return;
    try {
      setApplying(true);
      setErrorMessage('');

      // Convert proposal days to itinerary days format
      const optimizedDays = proposal.days.map((d) => ({
        day_number: d.day_number,
        date: d.date,
        theme: d.theme,
        activities: d.activities.map((act) => ({
          title: act.name,
          name: act.name,
          time: act.time_slot,
          description: act.description,
          location: act.location,
          cost: act.estimated_cost,
          latitude: act.latitude,
          longitude: act.longitude,
          visit_duration_minutes: act.visit_duration_minutes,
          transport_to_next: act.transport_to_next,
        })),
        total_travel_km: d.total_travel_km,
        total_travel_minutes: d.total_travel_minutes,
      }));

      const res = await tripService.applyRouteOptimization(trip.id, {
        optimized_days: optimizedDays,
        change_summary: `Smart Route Optimization (${proposal.algorithm}) - ${proposal.summary_metrics.distance_saved_km} km saved`,
      });

      onTripUpdated(res.trip);
      setUndoAvailable(true);
      setSuccessMessage(
        'Route optimization approved and saved to your itinerary successfully!'
      );
      setProposal(null);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to apply route optimization.'
      );
    } finally {
      setApplying(false);
    }
  };

  const handleUndo = async () => {
    try {
      setUndoing(true);
      setErrorMessage('');
      const res = await tripService.undoRouteOptimization(trip.id);
      onTripUpdated(res.trip);
      setUndoAvailable(Boolean(res.trip.has_revision_history));
      setSuccessMessage('Itinerary reverted to the previous version.');
      setProposal(null);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'No previous version available to restore.'
      );
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-surface to-surface-alt border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span>AI & Heuristic TSP Optimization</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-text">
              Smart Route Optimizer
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-2xl">
              Eliminates zigzagging across {trip.destination} using 2-opt Travelling
              Salesperson algorithms. Reduces total commute time, enforces attraction
              opening hours, and clusters stops efficiently.
            </p>
          </div>

          {undoAvailable && (
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-accent text-accent rounded-2xl text-xs font-semibold transition-all shadow-sm hover:bg-accent/10 whitespace-nowrap"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${undoing ? 'animate-spin' : ''}`} />
              <span>{undoing ? 'Reverting...' : 'Revert Last Optimization'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/30 text-primary rounded-2xl text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-accent/10 border border-accent/30 text-accent rounded-2xl text-xs sm:text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Optimizer Configuration Card */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <span>1. Optimization Constraints & Preferences</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Transport Mode */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">
              Primary Transit Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'auto', label: 'Smart Auto', icon: Sparkles },
                { id: 'transit', label: 'Metro / Bus', icon: Train },
                { id: 'cab', label: 'Taxi / Cab', icon: Car },
                { id: 'walking', label: 'Walking Only', icon: Footprints },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      mode === m.id
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-surface-alt/50 text-muted hover:text-text'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Walking Distance */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">
              Max Walking Distance per Leg: {maxWalkingKm} km
            </label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={maxWalkingKm}
              onChange={(e) => setMaxWalkingKm(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted mt-1">
              <span>0.5 km (Min)</span>
              <span>2.5 km (Standard)</span>
              <span>5.0 km (Hiker)</span>
            </div>
          </div>

          {/* Target Day */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">
              Target Day Scope
            </label>
            <CustomSelect
              value={selectedDay}
              onChange={(val) => setSelectedDay(val === 'all' ? 'all' : Number(val))}
              options={dayScopeOptions}
            />
          </div>
        </div>

        {/* Optional Starting Hotel */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">
            Starting Hub / Accommodation (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. The Taj Mahal Hotel, Downtown Hotel, Central Station"
            value={startingPoint}
            onChange={(e) => setStartingPoint(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary"
          />
          <p className="text-[11px] text-muted mt-1">
            Setting your hotel pin calculates door-to-door morning start and evening
            return commute.
          </p>
        </div>

        {/* Calculate Action */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-background rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {loading ? 'Running 2-Opt Algorithm...' : 'Calculate Optimized Route'}
            </span>
          </button>
        </div>
      </div>

      {/* PROPOSAL PREVIEW & METRICS */}
      {proposal && (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 text-muted text-xs font-medium mb-1">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                <span>Distance Saved</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text">
                {proposal.summary_metrics.distance_saved_km} km
              </div>
              <div className="flex items-center gap-1 text-[11px] text-primary font-semibold mt-1">
                <TrendingDown className="w-3 h-3" />
                <span>
                  {proposal.summary_metrics.distance_saved_percentage}% less travel
                </span>
              </div>
            </div>

            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 text-muted text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5 text-secondary" />
                <span>Time Saved</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text">
                {proposal.summary_metrics.time_saved_minutes} min
              </div>
              <div className="flex items-center gap-1 text-[11px] text-secondary font-semibold mt-1">
                <TrendingDown className="w-3 h-3" />
                <span>
                  {proposal.summary_metrics.time_saved_percentage}% faster commute
                </span>
              </div>
            </div>

            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 text-muted text-xs font-medium mb-1">
                <Navigation className="w-3.5 h-3.5 text-muted" />
                <span>Optimized Total</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text">
                {proposal.summary_metrics.optimized_distance_km} km
              </div>
              <div className="text-[11px] text-muted mt-1">
                {proposal.summary_metrics.optimized_travel_minutes} min total transit
              </div>
            </div>

            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 text-muted text-xs font-medium mb-1">
                <Car className="w-3.5 h-3.5 text-accent" />
                <span>Est. Transit Cost</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text">
                {currencySymbol}
                {proposal.summary_metrics.estimated_transit_cost.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted mt-1 capitalize">
                Via {proposal.mode} Mode
              </div>
            </div>
          </div>

          {/* Conflict Warnings */}
          {proposal.conflicts && proposal.conflicts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Schedule & Distance Observations ({proposal.conflicts.length})</span>
              </h4>
              <div className="space-y-1.5">
                {proposal.conflicts.map((c, i) => (
                  <div key={i} className="text-xs text-amber-400 flex items-start gap-2">
                    <span className="font-semibold shrink-0">Day {c.day}:</span>
                    <span>{c.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {proposal.recommendations && proposal.recommendations.length > 0 && (
            <div className="bg-surface border border-border p-5 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Routing Recommendations</span>
              </h4>
              <ul className="space-y-1.5">
                {proposal.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day-by-Day Reordered Sequence */}
          <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-base font-bold text-text">
              2. Proposed Stop Sequence & Timings
            </h3>

            <div className="space-y-6">
              {proposal.days.map((day) => (
                <div
                  key={day.day_number}
                  className="bg-surface-alt/40 border border-border rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-primary text-background font-bold text-xs rounded-lg">
                        Day {day.day_number}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-text">
                        {day.theme || `Day ${day.day_number}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {day.stops_count} stops • {day.total_travel_km} km •{' '}
                      {day.total_travel_minutes} min travel
                    </div>
                  </div>

                  {/* Interactive Leaflet Map for Day Route */}
                  <div className="pt-1 pb-2">
                    <RouteMap
                      waypoints={day.activities.map((stop, sIdx) => ({
                        order: sIdx + 1,
                        name: stop.name || 'Stop',
                        latitude: Number(stop.latitude) || 0,
                        longitude: Number(stop.longitude) || 0,
                        time: stop.time_slot,
                        location: stop.location || stop.description,
                      }))}
                      routeGeometry={day.map_data?.route_geometry}
                      isRoadRoute={day.activities.some((act) => act.transport_to_next?.is_road_route)}
                      attribution={day.map_data?.attribution}
                      height="260px"
                    />
                  </div>

                  <div className="space-y-3">
                    {day.activities.map((stop, sIdx) => (
                      <div key={sIdx} className="space-y-2">
                        <div className="flex items-start justify-between bg-surface p-3.5 rounded-xl border border-border/80">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {sIdx + 1}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-text">
                                {stop.name}
                              </div>
                              <div className="text-xs text-muted line-clamp-1 mt-0.5">
                                {stop.location || stop.description}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md">
                              {stop.time_slot || 'Flexible'}
                            </span>
                          </div>
                        </div>

                        {/* Leg connector */}
                        {stop.transport_to_next && (
                          <div className="flex flex-wrap items-center gap-2 pl-6 text-[11px] text-muted">
                            <ArrowRight className="w-3 h-3 text-primary" />
                            <span className="capitalize font-medium text-text">
                              {stop.transport_to_next.mode}
                            </span>
                            <span>• {stop.transport_to_next.distance_km} km</span>
                            <span>
                              • ~{stop.transport_to_next.duration_minutes} min
                            </span>
                            {stop.transport_to_next.estimated_cost > 0 && (
                              <span>
                                • {currencySymbol}
                                {stop.transport_to_next.estimated_cost}
                              </span>
                            )}
                            {stop.transport_to_next.is_road_route ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                OSRM Road
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded" title="OSRM unavailable - straight-line estimate">
                                Straight-line est.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Approval Action Bar */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-muted flex items-center gap-1.5">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Your previous itinerary version is preserved and can be reverted at
                  any time with 1-click.
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="w-1/2 sm:w-auto px-4 py-2.5 bg-surface border border-border text-muted hover:text-text rounded-2xl text-xs font-semibold"
                >
                  Discard Proposal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-background font-bold rounded-2xl text-xs sm:text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${applying ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {applying ? 'Applying & Saving...' : 'Approve & Save Optimized Route'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
