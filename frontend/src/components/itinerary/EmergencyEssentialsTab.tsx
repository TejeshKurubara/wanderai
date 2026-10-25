import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Hospital,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Printer,
} from 'lucide-react';
import { Trip, EmergencyServices } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface EmergencyEssentialsTabProps {
  trip: Trip;
}

export const EmergencyEssentialsTab: React.FC<EmergencyEssentialsTabProps> = ({
  trip,
}) => {
  const [services, setServices] = useState<EmergencyServices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencyData();
  }, [trip.destination]);

  const loadEmergencyData = async () => {
    try {
      setLoading(true);
      const data = await tripService.getEmergencyServices(trip.destination);
      setServices(data);
    } catch (err: any) {
      console.error('Failed to load emergency services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Traveler Safety & Medical Directory</span>
          </div>
          <h3 className="text-xl font-serif font-bold text-text">
            Emergency Contacts & Hospitals for {trip.destination}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Always have local emergency helplines and nearest healthcare facilities accessible
            offline.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-background border border-border hover:border-primary/50 text-text px-4 py-2 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-primary" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : services ? (
        <>
          {/* Emergency Phone Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-muted uppercase">Police</div>
              <div className="text-xl font-bold text-red-400 mt-1">
                {services.emergency_police}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-muted uppercase">Ambulance</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {services.emergency_ambulance}
              </div>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-2xl text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-muted uppercase">General Emergency</div>
              <div className="text-xl font-bold text-sky-400 mt-1">
                {services.emergency_general}
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-muted uppercase">Tourist Helpline</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {services.tourist_helpline}
              </div>
            </div>
          </div>

          {/* Hospitals List */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h4 className="text-base font-bold text-text flex items-center gap-2 mb-4">
              <Hospital className="w-4 h-4 text-primary" />
              <span>Major Hospitals & 24/7 Medical Care</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.major_hospitals.map((hosp, idx) => (
                <div
                  key={idx}
                  className="bg-background/70 border border-border/60 p-4 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-text text-sm">{hosp.name}</div>
                    <div className="text-xs text-muted mt-1">{hosp.type}</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs text-primary font-mono font-medium">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{hosp.contact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Notes & Traveler Advice */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-xs text-text space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Traveler Safety & Medical Advisory:</span>
            </div>
            <p className="text-muted leading-relaxed">{services.notes}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Keep passport & visa copies in cloud storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Carry personal medical prescriptions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Note hotel reception 24/7 desk number</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          Emergency info currently unavailable for this destination.
        </div>
      )}
    </div>
  );
};
