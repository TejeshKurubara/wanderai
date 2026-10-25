import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Train,
  Bus,
  Car,
  Plane,
  Clock,
  ExternalLink,
  MapPin,
  Leaf,
  Info,
  Compass,
} from 'lucide-react';
import {
  Trip,
  TransportRouteOption,
  LocalTransportGuide,
} from '../../types/trip';
import { tripService } from '../../services/tripService';

interface TransportGuideTabProps {
  trip: Trip;
}

export const TransportGuideTab: React.FC<TransportGuideTabProps> = ({ trip }) => {
  const [routeOptions, setRouteOptions] = useState<TransportRouteOption[]>([]);
  const [cityGuide, setCityGuide] = useState<LocalTransportGuide | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [mapsUrl, setMapsUrl] = useState<string>('');
  const [proTip, setProTip] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [trip.destination, trip.origin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routeRes, guideRes] = await Promise.all([
        tripService.getTransportRoutes({
          origin: trip.origin || 'Mumbai',
          destination: trip.destination,
          currency: trip.currency || 'INR',
        }),
        tripService.getCityTransitGuide(trip.destination),
      ]);

      setRouteOptions(routeRes.options || []);
      setDistanceKm(routeRes.distance_estimate_km || 0);
      setMapsUrl(routeRes.google_maps_url || '');
      setProTip(routeRes.pro_tip || '');
      setCityGuide(guideRes || null);
    } catch (err: any) {
      console.error('Failed to load transport guide:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'flight':
        return <Plane className="w-5 h-5 text-sky-400" />;
      case 'train':
        return <Train className="w-5 h-5 text-emerald-400" />;
      case 'bus':
        return <Bus className="w-5 h-5 text-amber-400" />;
      case 'car':
        return <Car className="w-5 h-5 text-purple-400" />;
      default:
        return <Navigation className="w-5 h-5 text-primary" />;
    }
  };

  const currencySymbol = trip.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-8">
      {/* Route Header Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              <Compass className="w-4 h-4" />
              <span>Multi-Modal Journey Planner</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-text">
              {trip.origin ? `${trip.origin} → ${trip.destination}` : `Getting to ${trip.destination}`}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Approximate direct travel distance: ~{distanceKm.toLocaleString()} km
            </p>
          </div>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-colors"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {proTip && (
          <div className="mt-4 bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-start gap-2 text-xs text-primary">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{proTip}</span>
          </div>
        )}
      </div>

      {/* Intercity Transit Options */}
      <div>
        <h4 className="text-base font-bold text-text mb-4">
          Intercity Travel Options Comparison
        </h4>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routeOptions.map((opt, idx) => (
              <div
                key={idx}
                className="bg-surface border border-border hover:border-primary/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-background rounded-xl border border-border">
                        {getModeIcon(opt.mode)}
                      </div>
                      <div>
                        <div className="font-bold text-text text-sm">{opt.name}</div>
                        <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-secondary" />
                          <span>{opt.duration}</span>
                          <span>•</span>
                          <span>{opt.frequency}</span>
                        </div>
                      </div>
                    </div>

                    {opt.eco_friendly && (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                        <Leaf className="w-3 h-3" />
                        Eco-friendly
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted my-3 leading-relaxed">
                    {opt.route_summary}
                  </p>

                  <div className="bg-background/60 p-2.5 rounded-xl border border-border/50 text-[11px] text-text">
                    <span className="font-semibold text-primary">Recommendation: </span>
                    {opt.pros}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-accent">
                      {currencySymbol}
                      {opt.estimated_cost.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted">estimated fare</div>
                  </div>

                  {opt.booking_url && (
                    <a
                      href={opt.booking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <span>Check Tickets</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Local City Transit Guide */}
      {cityGuide && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h4 className="text-base font-bold text-text">
              Local Transit & Getting Around {cityGuide.destination}
            </h4>
            <p className="text-xs text-muted">
              Public transportation systems, tourist passes, and local mobility
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-background/60 p-4 rounded-xl border border-border/50 text-xs">
              <div className="font-semibold text-text mb-1">Transit Network</div>
              <div className="text-muted leading-relaxed">{cityGuide.local_transit_type}</div>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border/50 text-xs">
              <div className="font-semibold text-text mb-1">Daily Transit Cost</div>
              <div className="text-accent font-bold text-sm mb-1">
                {cityGuide.average_daily_transit_cost}
              </div>
              <div className="text-muted">Estimated local budget per traveler</div>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border/50 text-xs">
              <div className="font-semibold text-text mb-1">Ride-Hailing & Taxis</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {cityGuide.taxi_ride_apps.map((app) => (
                  <span
                    key={app}
                    className="bg-surface border border-border px-2 py-0.5 rounded text-[11px] text-primary"
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border/50 text-xs sm:col-span-2">
              <div className="font-semibold text-text mb-1">Airport to City Center</div>
              <div className="text-muted leading-relaxed">
                {cityGuide.airport_to_center_transfer}
              </div>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border/50 text-xs">
              <div className="font-semibold text-text mb-1">Bike & Scooter Rentals</div>
              <div className="text-muted">{cityGuide.scooter_bike_rentals}</div>
            </div>
          </div>

          {/* Tourist passes list */}
          <div>
            <div className="text-xs font-semibold text-text uppercase tracking-wider mb-2">
              Recommended Tourist Travel Passes:
            </div>
            <div className="flex flex-wrap gap-2">
              {cityGuide.transit_pass_options.map((pass, i) => (
                <div
                  key={i}
                  className="bg-background px-3 py-1.5 rounded-lg border border-border text-xs text-text flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{pass}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-xs text-secondary">
            <span className="font-semibold">Local Pro-Tip: </span>
            {cityGuide.pro_tip}
          </div>
        </div>
      )}
    </div>
  );
};
