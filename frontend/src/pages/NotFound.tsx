import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
      <MapPinOff className="w-24 h-24 text-muted mb-6" />
      <h1 className="text-6xl font-serif font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Off the Beaten Path</h2>
      <p className="text-muted max-w-md mb-8">
        The destination you're looking for doesn't exist on our map. Let's get you back to familiar territory.
      </p>
      <Link to="/" className="bg-primary text-background px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">
        Return Home
      </Link>
    </div>
  );
};

export default NotFound;
