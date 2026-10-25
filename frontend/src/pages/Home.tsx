import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Compass, MapPin, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 flex flex-col items-center text-center">
          <span className="text-primary text-sm font-bold tracking-wider uppercase mb-4">Curation Redefined</span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
            Plan smarter.<br />
            <span className="gradient-text">Travel better.</span>
          </h1>
          <p className="max-w-xl mx-auto text-lg text-muted mb-10 leading-relaxed">
            Personalized AI-crafted itineraries tailored to your dates, budget, travel style, and passions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link to="/register" className="bg-primary hover:bg-primary/90 text-background px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              Plan My Trip <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="bg-surface border border-border hover:bg-border px-8 py-4 rounded-full font-semibold flex items-center justify-center transition-all">
              Explore
            </Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-serif font-bold mb-12 text-center">How WanderAI Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: <MapPin />, title: 'Tell us where', desc: 'Destination, date window, and travel group size.' },
            { icon: <Compass />, title: 'Choose style', desc: 'Slow-paced, foodie, architectural, luxury or nomadic.' },
            { icon: <Sparkles />, title: 'Let AI build', desc: 'Algorithmic timing, transit routes, and reservation slots.' },
            { icon: <Calendar />, title: 'Embark', titleExt: 'on your journey', desc: 'Real-time adaptive alerts and offline turn-by-turn syncing.' }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-surface border border-border rounded-2xl">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title} <br className="hidden md:block"/>{item.titleExt}</h3>
              <p className="text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
