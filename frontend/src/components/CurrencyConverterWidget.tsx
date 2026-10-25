import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Globe,
  Sparkles,
  Info,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  Trip,
  CurrencyItem,
  CurrencyConversionResult,
  MultiCurrencyBudgetProjection,
} from '../types/trip';
import { tripService } from '../services/tripService';
import { CustomSelect } from './common/CustomSelect';

interface CurrencyConverterWidgetProps {
  trip?: Trip;
  onTripUpdated?: (updatedTrip: Trip) => void;
  defaultFrom?: string;
  defaultTo?: string;
}

// Verified offline benchmark matrix (USD base rates)
const BENCHMARK_USD_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 96.83,
  EUR: 0.92,
  GBP: 0.76,
  AED: 3.67,
  JPY: 152.4,
  CAD: 1.38,
  AUD: 1.51,
  SGD: 1.32,
  CHF: 0.86,
  THB: 33.8,
  CNY: 7.12,
  NZD: 1.66,
  MYR: 4.35,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.38,
  BHD: 0.38,
  ZAR: 17.65,
  BRL: 5.7,
  TRY: 34.2,
  KRW: 1375.0,
};

const DEFAULT_CURRENCIES: CurrencyItem[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'RO' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
];

export const CurrencyConverterWidget: React.FC<CurrencyConverterWidgetProps> = ({
  trip,
  onTripUpdated,
  defaultFrom = 'INR',
  defaultTo = 'USD',
}) => {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>(DEFAULT_CURRENCIES);
  const [amount, setAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>(
    trip?.currency || defaultFrom
  );
  const [toCurrency, setToCurrency] = useState<string>(
    trip?.display_currency || defaultTo
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);
  const [updatingDisplay, setUpdatingDisplay] = useState<boolean>(false);

  const [result, setResult] = useState<CurrencyConversionResult | null>(null);
  const [budgetProjection, setBudgetProjection] =
    useState<MultiCurrencyBudgetProjection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadSupportedCurrencies();
  }, []);

  // Compute on mount and when currency selection changes
  useEffect(() => {
    if (fromCurrency && toCurrency && amount > 0) {
      handleConvert();
    }
    if (trip && toCurrency) {
      loadBudgetProjection(toCurrency);
    }
  }, [fromCurrency, toCurrency, trip?.id]);

  const loadSupportedCurrencies = async () => {
    try {
      setLoading(true);
      const res = await tripService.getSupportedCurrencies();
      if (res.currencies && res.currencies.length > 0) {
        setCurrencies(res.currencies);
      }
    } catch {
      setCurrencies(DEFAULT_CURRENCIES);
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalFallback = (amt: number, from: string, to: string): CurrencyConversionResult => {
    const fromRate = BENCHMARK_USD_RATES[from] || 1.0;
    const toRate = BENCHMARK_USD_RATES[to] || 1.0;
    const effectiveRate = toRate / fromRate;
    const converted = Math.round(amt * effectiveRate * 100) / 100;

    return {
      original_amount: amt,
      from_currency: from,
      converted_amount: converted,
      to_currency: to,
      rate: Math.round(effectiveRate * 1000000) / 1000000,
      is_live: false,
      timestamp: new Date().toISOString(),
    };
  };

  const handleConvert = async () => {
    if (amount <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }
    try {
      setConverting(true);
      setErrorMessage('');
      const data = await tripService.convertCurrency(amount, fromCurrency, toCurrency);
      setResult(data);
    } catch {
      // Graceful instant fallback using benchmark rate matrix
      const fallback = calculateLocalFallback(amount, fromCurrency, toCurrency);
      setResult(fallback);
    } finally {
      setConverting(false);
    }
  };

  const loadBudgetProjection = async (targetCurr: string) => {
    if (!trip) return;
    try {
      const data = await tripService.getTripBudgetInCurrency(trip.id, targetCurr);
      setBudgetProjection(data.projection);
    } catch {
      // Silently ignore if no budget yet
    }
  };

  const handleSwap = () => {
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
  };

  const handleSetDisplayCurrency = async () => {
    if (!trip || !onTripUpdated) return;
    try {
      setUpdatingDisplay(true);
      setErrorMessage('');
      const res = await tripService.updateDisplayCurrency(trip.id, toCurrency);
      onTripUpdated(res.trip);
      setSuccessMessage(
        `Display currency updated to ${toCurrency}. Calculations projected on-the-fly!`
      );
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Failed to update trip display currency.'
      );
    } finally {
      setUpdatingDisplay(false);
    }
  };

  const currencyOptions = currencies.map((c) => ({
    value: c.code,
    label: `${c.code} — ${c.name} (${c.symbol})`,
  }));

  const formattedTimestamp = result?.timestamp
    ? new Date(result.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-surface to-surface-alt border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4 text-primary" />
              <span>Multi-Currency & Live FX</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-text">
              Currency Converter & Budget Projector
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-2xl">
              Convert across 25+ global currencies using verified exchange rates with 1-hour
              caching. Switch your trip display currency without mutating original expense
              records.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/30 text-primary rounded-2xl text-xs sm:text-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-accent/10 border border-accent/30 text-accent rounded-2xl text-xs sm:text-sm animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Converter Card */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <span>Interactive Exchange Calculator</span>
          </h3>
          <span className="text-[11px] text-muted">
            25+ Currencies Supported
          </span>
        </div>

        {/* Currency Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          {/* Amount input */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-muted">
              Amount
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount..."
              className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary font-semibold"
            />
          </div>

          {/* From Currency Custom Dropdown */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-muted">
              From Currency
            </label>
            <CustomSelect
              value={fromCurrency}
              onChange={(val) => setFromCurrency(val)}
              options={currencyOptions}
              disabled={loading}
            />
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pb-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2.5 rounded-full bg-surface-alt border border-border hover:border-primary text-muted hover:text-primary transition-all shadow-sm"
              title="Swap From and To Currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Currency Custom Dropdown */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-muted">
              To Currency
            </label>
            <CustomSelect
              value={toCurrency}
              onChange={(val) => setToCurrency(val)}
              options={currencyOptions}
              disabled={loading}
            />
          </div>
        </div>

        {/* Amount Quick Presets & Convert Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted mr-1">Quick Presets:</span>
            {[100, 500, 1000, 5000, 25000, 50000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  amount === preset
                    ? 'bg-primary text-background border-primary'
                    : 'bg-surface-alt border-border text-muted hover:text-text hover:border-border/80'
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleConvert}
            disabled={converting || amount <= 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${converting ? 'animate-spin' : ''}`} />
            <span>{converting ? 'Converting...' : 'Convert Currency'}</span>
          </button>
        </div>

        {/* Conversion Result Display */}
        {result ? (
          <div className="bg-surface-alt/50 border border-border/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in">
            <div>
              <div className="text-xs text-muted mb-1">
                {amount.toLocaleString()} {result.from_currency} =
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text">
                {result.converted_amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-primary">{result.to_currency}</span>
              </div>
              <div className="text-[11px] text-muted mt-1.5 flex items-center gap-3 flex-wrap">
                <span>
                  1 {result.from_currency} = <strong className="text-text">{result.rate}</strong> {result.to_currency}
                </span>
                {result.rate > 0 && (
                  <span>
                    (1 {result.to_currency} ≈ {(1 / result.rate).toFixed(4)} {result.from_currency})
                  </span>
                )}
                {formattedTimestamp && (
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    <Clock className="w-3 h-3 text-muted" />
                    <span>Updated {formattedTimestamp}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  result.is_live
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/20 text-secondary border border-secondary/30'
                }`}
              >
                {result.is_live ? 'Live FX Rate (Open API)' : 'Demo / Benchmark Mode'}
              </span>

              {!result.is_live && (
                <span className="text-[10px] text-muted max-w-[220px] text-left sm:text-right">
                  Operating in benchmark reference mode. External keys can be set in backend/.env.
                </span>
              )}

              {trip && onTripUpdated && toCurrency !== trip.display_currency && (
                <button
                  type="button"
                  onClick={handleSetDisplayCurrency}
                  disabled={updatingDisplay}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-background font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use as Trip Display Currency</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-alt/30 border border-border/60 rounded-2xl p-6 text-center text-xs text-muted">
            Enter an amount and click Convert to view current exchange calculations.
          </div>
        )}
      </div>

      {/* MULTI-CURRENCY TRIP BUDGET PROJECTION */}
      {trip && budgetProjection && (
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span>
                  Projected Trip Budget in {budgetProjection.target_currency}
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Conversion calculated dynamically without changing original database records.
              </p>
            </div>
            <div className="text-xs text-muted">
              Rate: 1 {budgetProjection.source_currency} = {budgetProjection.rate}{' '}
              {budgetProjection.target_currency}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-alt/40 border border-border p-4 rounded-2xl">
              <div className="text-xs text-muted mb-1">Total Planned Budget</div>
              <div className="text-lg sm:text-xl font-bold text-text">
                {budgetProjection.converted_budget.toLocaleString()}{' '}
                <span className="text-xs text-primary font-normal">
                  {budgetProjection.target_currency}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1">
                Orig: {budgetProjection.original_budget.toLocaleString()}{' '}
                {budgetProjection.source_currency}
              </div>
            </div>

            <div className="bg-surface-alt/40 border border-border p-4 rounded-2xl">
              <div className="text-xs text-muted mb-1">Expenses Paid</div>
              <div className="text-lg sm:text-xl font-bold text-text">
                {budgetProjection.converted_paid_expenses.toLocaleString()}{' '}
                <span className="text-xs text-primary font-normal">
                  {budgetProjection.target_currency}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1">
                Orig: {budgetProjection.original_paid_expenses.toLocaleString()}{' '}
                {budgetProjection.source_currency}
              </div>
            </div>

            <div className="bg-surface-alt/40 border border-border p-4 rounded-2xl">
              <div className="text-xs text-muted mb-1">Remaining Budget</div>
              <div
                className={`text-lg sm:text-xl font-bold ${
                  budgetProjection.converted_remaining_budget < 0
                    ? 'text-accent'
                    : 'text-primary'
                }`}
              >
                {budgetProjection.converted_remaining_budget.toLocaleString()}{' '}
                <span className="text-xs font-normal">
                  {budgetProjection.target_currency}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1">
                Orig: {budgetProjection.original_remaining_budget.toLocaleString()}{' '}
                {budgetProjection.source_currency}
              </div>
            </div>

            <div className="bg-surface-alt/40 border border-border p-4 rounded-2xl">
              <div className="text-xs text-muted mb-1">Pending Commitments</div>
              <div className="text-lg sm:text-xl font-bold text-accent">
                {budgetProjection.converted_pending_commitments.toLocaleString()}{' '}
                <span className="text-xs font-normal">
                  {budgetProjection.target_currency}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1">
                Orig: {budgetProjection.original_pending_commitments.toLocaleString()}{' '}
                {budgetProjection.source_currency}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverterWidget;
