import React from 'react';
import { ArrowLeft, Coins, Globe, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget';

export const CurrencyConverterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-grow bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border hover:border-primary text-xs font-semibold text-text transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>WanderAI Financial Suite</span>
          </div>
        </div>

        {/* Converter Widget */}
        <CurrencyConverterWidget defaultFrom="INR" defaultTo="USD" />
      </div>
    </div>
  );
};

export default CurrencyConverterPage;
