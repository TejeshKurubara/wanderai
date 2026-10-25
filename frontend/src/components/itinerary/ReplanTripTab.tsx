import React, { useState } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CloudRain,
  Hotel,
  Clock,
  Wallet,
  Coffee,
  PlusCircle,
  Car,
  Plane,
  CheckCircle2,
  CheckSquare,
  Square,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { Trip, ReplanningProposal } from '../../types/trip';
import { tripService } from '../../services/tripService';
import { CustomSelect } from '../common/CustomSelect';

interface ReplanTripTabProps {
  trip: Trip;
  onTripUpdated: (updatedTrip: Trip) => void;
}

const SCENARIOS = [
  {
    id: 'missed_transit',
    title: 'Missed Transit / Delayed Flight',
    description: 'Delayed by flight/train delay or missed morning bus.',
    icon: Plane,
    detailsPlaceholder: 'e.g. Delayed by 3 hours, arriving at 2 PM instead',
  },
  {
    id: 'closed_attraction',
    title: 'Attraction Unexpectedly Closed',
    description: 'Monument, museum, or spot is shut for maintenance/holiday.',
    icon: AlertTriangle,
    detailsPlaceholder: 'e.g. Louvre Museum / Taj Mahal is closed today',
  },
  {
    id: 'bad_weather',
    title: 'Severe Weather / Heavy Rain',
    description: 'Torrential downpour, heatwave, or storm limits outdoor visits.',
    icon: CloudRain,
    detailsPlaceholder: 'e.g. Heavy rain forecasted all afternoon',
  },
  {
    id: 'hotel_changed',
    title: 'Accommodation Changed',
    description: 'Switched hotel to a different district or neighborhood.',
    icon: Hotel,
    detailsPlaceholder: 'e.g. Moved from North Beach to Downtown hotel',
  },
  {
    id: 'skip_activity',
    title: 'Skipped Activity / Late Morning',
    description: 'Decided to sleep in or skip an earlier stop.',
    icon: Clock,
    detailsPlaceholder: 'e.g. Skipped 9 AM museum tour, starting day at noon',
  },
  {
    id: 'budget_cut',
    title: 'Budget Cut / Limit Expenses',
    description: 'Need to reduce spending by substituting paid stops with free gems.',
    icon: Wallet,
    detailsPlaceholder: 'e.g. Need to cut expenses by 30% for remainder of trip',
  },
  {
    id: 'fatigue',
    title: 'Traveler Fatigue / Slower Pace',
    description: 'Exhausted from walking; need more relaxed cafe & leisure buffers.',
    icon: Coffee,
    detailsPlaceholder: 'e.g. Reduce daily stops to max 2-3 per day with restful breaks',
  },
  {
    id: 'added_attraction',
    title: 'New Must-See Attraction Found',
    description: 'Local recommendation discovered that traveler wants to fit in.',
    icon: PlusCircle,
    detailsPlaceholder: 'e.g. Add hidden rooftop observatory or evening food market',
  },
  {
    id: 'changed_transport',
    title: 'Transportation Mode Changed',
    description: 'Transit strike or switched from public metro to private taxis.',
    icon: Car,
    detailsPlaceholder: 'e.g. Public transit unavailable, routing via cab/walking only',
  },
];

export const ReplanTripTab: React.FC<ReplanTripTabProps> = ({
  trip,
  onTripUpdated,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('missed_transit');
  const [scenarioDetails, setScenarioDetails] = useState<string>('');
  const [dayOffset, setDayOffset] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [undoing, setUndoing] = useState<boolean>(false);
  const [togglingActivity, setTogglingActivity] = useState<string | null>(null);

  const [proposal, setProposal] = useState<ReplanningProposal | null>(null);
  const [undoAvailable, setUndoAvailable] = useState<boolean>(
    Boolean(trip.has_revision_history)
  );
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const completedActivities = trip.completed_activities || [];
  const days = Array.isArray(trip.itinerary?.days)
    ? trip.itinerary.days
    : Array.isArray(trip.itinerary)
    ? trip.itinerary
    : [];
  const totalDays = Math.max(Number(trip.days) || 0, days.length, 1);

  const replanDayOptions = [
    { value: 0, label: 'From Current Day (Day 1 Onward)' },
    ...(days.length > 0
      ? days.map((d: any, idx: number) => {
          const dNum = d.day_number || d.day || idx + 1;
          const dTitle = d.theme || d.title || `Day ${dNum}`;
          return {
            value: dNum,
            label: `From Day ${dNum}: ${dTitle}`,
          };
        })
      : Array.from({ length: totalDays }, (_, i) => ({
          value: i + 1,
          label: `From Day ${i + 1}`,
        }))),
  ];

  const currencySymbol =
    trip.currency === 'USD'
      ? '$'
      : trip.currency === 'EUR'
      ? '€'
      : trip.currency === 'GBP'
      ? '£'
      : '₹';

  const handleToggleCompleted = async (activityName: string, isCompleted: boolean) => {
    try {
      setTogglingActivity(activityName);
      const res = await tripService.toggleActivityCompletion(
        trip.id,
        activityName,
        !isCompleted
      );
      onTripUpdated(res.trip);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to update activity.');
    } finally {
      setTogglingActivity(null);
    }
  };

  const handlePreviewReplan = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      const res = await tripService.previewReplanning(trip.id, {
        scenario: selectedScenario,
        details: scenarioDetails.trim() || undefined,
        day_offset: dayOffset,
      });

      setProposal(res.proposal);
      setUndoAvailable(res.undo_available || Boolean(trip.has_revision_history));
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to generate replanning proposal.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReplan = async () => {
    if (!proposal) return;
    try {
      setApplying(true);
      setErrorMessage('');

      const res = await tripService.applyReplanning(trip.id, {
        new_itinerary: proposal.new_itinerary,
        scenario: proposal.scenario,
      });

      onTripUpdated(res.trip);
      setUndoAvailable(true);
      setSuccessMessage('Replanned itinerary approved and updated successfully!');
      setProposal(null);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to apply replanned itinerary.'
      );
    } finally {
      setApplying(false);
    }
  };

  const handleUndo = async () => {
    try {
      setUndoing(true);
      setErrorMessage('');
      const res = await tripService.undoReplanning(trip.id);
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

  const activeScenarioConfig =
    SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-surface to-surface-alt border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>Real-Time Itinerary Replanning</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-text">
              Automatic Trip Replanner
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-2xl">
              Travel plans change. Select your situation to intelligently adjust remaining
              stops, avoid closed venues, protect finished experiences, and keep your
              budget balanced.
            </p>
          </div>

          {undoAvailable && (
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-accent text-accent rounded-2xl text-xs font-semibold transition-all shadow-sm hover:bg-accent/10 whitespace-nowrap"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${undoing ? 'animate-spin' : ''}`} />
              <span>{undoing ? 'Reverting...' : 'Revert Last Replan'}</span>
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

      {/* COMPLETED ACTIVITIES TRACKER (PROTECTION LIST) */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Already Completed Activities ({completedActivities.length})</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Activities checked below are locked and preserved from being modified or
              removed during replanning.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-2">
          {days.flatMap((day: any, dIdx: number) =>
            (day.activities || []).map((act: any, aIdx: number) => {
              const actName = act.title || act.name || `Activity ${aIdx + 1}`;
              const isDone = completedActivities.includes(actName);
              const isToggling = togglingActivity === actName;

              return (
                <button
                  key={`${dIdx}-${aIdx}`}
                  type="button"
                  onClick={() => handleToggleCompleted(actName, isDone)}
                  disabled={isToggling}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    isDone
                      ? 'bg-primary/10 border-primary/40 text-text font-medium'
                      : 'bg-surface-alt/40 border-border text-muted hover:text-text'
                  }`}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                  )}
                  <div className="overflow-hidden">
                    <div
                      className={`text-xs truncate ${
                        isDone ? 'line-through text-muted font-normal' : 'font-semibold'
                      }`}
                    >
                      {actName}
                    </div>
                    <div className="text-[10px] text-muted">
                      Day {day.day_number || dIdx + 1}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* DISRUPTION SCENARIO PICKER */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6">
        <h3 className="text-base font-bold text-text">
          Select Your Disruption / Change Scenario
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenario(scenario.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border bg-surface-alt/30 hover:bg-surface-alt hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-2 rounded-xl ${
                      isSelected
                        ? 'bg-primary text-background'
                        : 'bg-surface text-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-primary' : 'text-text'
                    }`}
                  >
                    {scenario.title}
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Scenario Details & Day Offset */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Specific Situation Details (Optional)
            </label>
            <input
              type="text"
              placeholder={activeScenarioConfig.detailsPlaceholder}
              value={scenarioDetails}
              onChange={(e) => setScenarioDetails(e.target.value)}
              className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Apply From Day
            </label>
            <CustomSelect
              value={dayOffset}
              onChange={(val) => setDayOffset(Number(val))}
              options={replanDayOptions}
            />
          </div>
        </div>

        {/* Generate Proposal Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handlePreviewReplan}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-background rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {loading ? 'Evaluating Adjustments...' : 'Generate Replanning Proposal'}
            </span>
          </button>
        </div>
      </div>

      {/* PROPOSAL PREVIEW & DIFF */}
      {proposal && (
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4">
            <div>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Proposed Replan
              </span>
              <h3 className="text-lg font-bold text-text mt-0.5">
                {proposal.summary}
              </h3>
            </div>

            {/* Cost Delta Tag */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  proposal.cost_delta > 0
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    : proposal.cost_delta < 0
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-surface-alt text-muted'
                }`}
              >
                {proposal.cost_delta > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : proposal.cost_delta < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                <span>
                  Budget Impact:{' '}
                  {proposal.cost_delta === 0
                    ? 'Neutral'
                    : `${proposal.cost_delta > 0 ? '+' : ''}${currencySymbol}${proposal.cost_delta}`}
                </span>
              </div>
            </div>
          </div>

          {/* Open-Meteo Live Weather Forecast Banner */}
          {proposal.weather_data && proposal.weather_data.daily_forecast && (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm">
                  <CloudRain className="w-4 h-4 text-sky-400" />
                  <span>
                    Open-Meteo Live Forecast — {proposal.weather_data.destination || trip.destination}
                  </span>
                </div>
                <div className="text-[11px] text-sky-300 font-medium">
                  {proposal.weather_attribution || 'Weather data by Open-Meteo.com (CC BY 4.0)'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {proposal.weather_data.daily_forecast.slice(0, 7).map((d: any, i: number) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-center text-xs flex flex-col justify-between ${
                      d.is_inclement
                        ? 'bg-sky-950/40 border-sky-400/40 text-sky-200'
                        : 'bg-surface/60 border-border text-muted'
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-text">
                      {d.date ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }) : `Day ${d.day_index || i + 1}`}
                    </div>
                    <div className="my-1">
                      <div className="font-bold text-sm text-text">
                        {d.temp_max_c !== null ? `${Math.round(d.temp_max_c)}°C` : '—'}
                      </div>
                      <div className="text-[10px] text-muted truncate">{d.condition_label || d.condition}</div>
                    </div>
                    <div
                      className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                        d.precipitation_probability >= 50
                          ? 'bg-sky-500/20 text-sky-300 font-bold'
                          : 'text-muted'
                      }`}
                    >
                      💧 {d.precipitation_probability}% rain
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preserved Activities & Change Log */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-alt/40 border border-border rounded-2xl p-4">
              <h4 className="text-xs font-bold text-text mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>
                  Preserved Completed Activities ({proposal.completed_activities_preserved})
                </span>
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                All previously checked activities have been kept intact at their verified
                locations and dates.
              </p>
            </div>

            <div className="bg-surface-alt/40 border border-border rounded-2xl p-4">
              <h4 className="text-xs font-bold text-text mb-2 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-secondary" />
                <span>Adjustments Made ({proposal.changes_made.length})</span>
              </h4>
              <ul className="space-y-1">
                {proposal.changes_made.map((change, i) => (
                  <li key={i} className="text-xs text-muted flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* New Schedule Preview */}
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
              New Itinerary Schedule Preview
            </h4>
            <div className="space-y-3">
              {(proposal.new_itinerary.days || []).map((day: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-surface-alt/30 border border-border rounded-2xl p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-primary">
                      Day {day.day_number || idx + 1}: {day.theme || day.title}
                    </span>
                    <span className="text-[11px] text-muted">
                      {(day.activities || []).length} activities
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(day.activities || []).map((act: any, aIdx: number) => (
                      <div
                        key={aIdx}
                        className="bg-surface p-2.5 rounded-xl border border-border/80 text-xs"
                      >
                        <div className="font-semibold text-text truncate">
                          {act.title || act.name}
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">
                          {act.time || 'Flexible'} • {currencySymbol}
                          {act.cost || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-muted flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Applying this replanned itinerary creates a safety snapshot so you can
                revert back anytime.
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
                onClick={handleApplyReplan}
                disabled={applying}
                className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-background font-bold rounded-2xl text-xs sm:text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <CheckCircle2
                  className={`w-4 h-4 ${applying ? 'animate-spin' : ''}`}
                />
                <span>
                  {applying ? 'Updating Itinerary...' : 'Approve & Save New Itinerary'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
