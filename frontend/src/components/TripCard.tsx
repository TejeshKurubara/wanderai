import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, IndianRupee, Trash2, MapPin, Edit3, ArrowRight } from 'lucide-react';
import { Trip } from '../types/trip';

interface TripCardProps {
  trip: Trip;
  onDelete?: (id: string) => void;
  onEdit?: (trip: Trip) => void;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

const TripCard: React.FC<TripCardProps> = ({ trip, onDelete, onEdit }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(trip.image_url || DEFAULT_FALLBACK_IMAGE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const datesDisplay =
    trip.start_date && trip.end_date
      ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
      : `${trip.days} ${trip.days === 1 ? 'Day' : 'Days'}`;

  const travelerGrammar = `${trip.travelers || 1} ${(trip.travelers || 1) === 1 ? 'Traveler' : 'Travelers'}`;

  const currencySymbol = trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : '₹';

  return (
    <div className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full relative shadow-md hover:shadow-xl">
      {/* Destination Image Area */}
      <div className="h-44 w-full relative overflow-hidden bg-surface-alt">
        {/* Loading skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center">
            <span className="text-xs text-muted">Loading destination...</span>
          </div>
        )}

        <img
          src={imgSrc}
          alt={trip.destination}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            if (imgSrc !== DEFAULT_FALLBACK_IMAGE) {
              setImgSrc(DEFAULT_FALLBACK_IMAGE);
            }
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-black/40 to-black/20" />

        {/* Badges & Actions */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 uppercase tracking-wider">
            {trip.booking_status || 'Planning'}
          </span>

          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(trip);
                }}
                className="p-2 bg-black/50 hover:bg-primary/90 text-white rounded-full transition-colors backdrop-blur-sm shadow"
                title="Edit trip details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(trip.id);
                }}
                className="p-2 bg-black/50 hover:bg-red-500/90 text-white rounded-full transition-colors backdrop-blur-sm shadow"
                title="Delete trip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Title on top of gradient */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-serif font-bold text-white drop-shadow-md truncate">
            {trip.title || `Journey to ${trip.destination}`}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-0.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination}
            </span>
          </div>
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-4 flex-grow flex flex-col justify-between gap-3">
        <div className="grid grid-cols-2 gap-2.5 text-xs text-muted">
          <div className="flex items-center gap-1.5 bg-background/50 p-2 rounded-lg border border-border/40">
            <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate">{datesDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/50 p-2 rounded-lg border border-border/40">
            <Users className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
            <span className="truncate">{travelerGrammar}</span>
          </div>

          {trip.budget !== null && trip.budget !== undefined && (
            <div className="flex items-center gap-1.5 bg-background/50 p-2 rounded-lg border border-border/40 col-span-2">
              <span className="text-accent font-bold text-xs">{currencySymbol}</span>
              <span className="truncate text-text font-medium">
                {trip.budget.toLocaleString()} {trip.currency || 'INR'}
                <span className="text-muted font-normal text-[11px] ml-1">Planned Budget</span>
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            to={`/itinerary/${trip.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-background border border-primary/30 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            <span>Explore Trip & Itinerary</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TripCard;
