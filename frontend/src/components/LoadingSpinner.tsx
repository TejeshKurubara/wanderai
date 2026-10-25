import React from 'react';
import { Sparkles } from 'lucide-react';

const LoadingSpinner = ({ message = 'AI is crafting your cinematic adventure...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        <Sparkles className="text-primary w-6 h-6 animate-pulse" />
      </div>
      <p className="text-muted text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
