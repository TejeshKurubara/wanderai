import React, { useEffect, useState } from 'react';
import { X, Map, ExternalLink, Clock, Calendar, IndianRupee, Sparkles, MapPin, Image as ImageIcon } from 'lucide-react';
import { placeService, PlaceDetails } from '../services/placeService';

interface PlaceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  city: string;
  country: string;
  description: string;
  duration?: string;
  timeOfDay?: string;
  estimatedCost: string;
  aiRecommendation: string;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  isOpen,
  onClose,
  placeName,
  city,
  country,
  description,
  duration,
  timeOfDay,
  estimatedCost,
  aiRecommendation,
}) => {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && placeName) {
      setLoading(true);
      const locationQuery = city ? (country ? `${city}, ${country}` : city) : '';
      placeService.getPlaceDetails(placeName, locationQuery).then((data) => {
        setDetails(data);
        setLoading(false);
      });
    }
  }, [isOpen, placeName, city, country]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const locationQuery = encodeURIComponent(`${placeName} ${city || ''} ${country || ''}`.trim());
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${locationQuery}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-border w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 relative"
        role="dialog"
        aria-modal="true"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Image Area */}
        <div className="relative h-64 bg-surface/50 w-full flex-shrink-0 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="animate-pulse flex items-center justify-center w-full h-full bg-border/20">
              <ImageIcon className="w-10 h-10 text-muted" />
            </div>
          ) : details?.thumbnailUrl ? (
            <img 
              src={details.thumbnailUrl} 
              alt={details.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted h-full w-full bg-gradient-to-br from-background to-surface">
              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Place image unavailable</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-text mb-1 leading-tight">
              {placeName}
            </h2>
            <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
              <MapPin className="w-4 h-4" />
              <span>{[city, country].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6 scrollbar-thin scrollbar-thumb-border">
          
          <div>
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
              <InfoIcon /> Place Information
            </h3>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              {loading ? (
                <span className="animate-pulse inline-block h-4 bg-border/30 w-3/4 rounded"></span>
              ) : (
                details?.extract || description
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {duration && (
              <div className="flex items-start gap-3 bg-background/50 p-3 rounded-xl border border-border/50">
                <Clock className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted">Recommended Time</p>
                  <p className="text-sm font-medium">{duration}</p>
                </div>
              </div>
            )}
            
            {timeOfDay && (
              <div className="flex items-start gap-3 bg-background/50 p-3 rounded-xl border border-border/50">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted">Best Time to Visit</p>
                  <p className="text-sm font-medium">{timeOfDay}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 bg-background/50 p-3 rounded-xl border border-border/50 sm:col-span-2">
              <IndianRupee className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted">Estimated Cost</p>
                <p className="text-sm font-medium">{estimatedCost}</p>
                <p className="text-xs text-muted/70 mt-1">Estimated from your total trip budget</p>
              </div>
            </div>
          </div>

          {aiRecommendation && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Why WanderAI recommends this
              </h3>
              <p className="text-sm text-primary/90 leading-relaxed relative z-10">
                {aiRecommendation}
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-border bg-surface shrink-0 flex flex-col sm:flex-row gap-3">
          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-background font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] text-sm"
          >
            <Map className="w-4 h-4" /> Open in Google Maps
          </a>
          <a 
            href={directionsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-background hover:bg-border border border-border text-text font-medium py-3 px-4 rounded-xl transition-all text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Get Directions
          </a>
        </div>
      </div>
    </div>
  );
};

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
