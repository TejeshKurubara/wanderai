import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
  PieChart,
  Scale,
  Users,
  ArrowRight,
  Check,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { Trip, Expense, BudgetAnalytics, SettlementData, SimplifiedDebt } from '../../types/trip';
import { tripService } from '../../services/tripService';
import { offlineStorage } from '../../services/offlineStorage';
import { useAuth } from '../../context/AuthContext';

interface BudgetExpenseTrackerProps {
  trip: Trip;
}

const CATEGORIES = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'activities', label: 'Activities & Tours' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'emergency', label: 'Emergency & Medical' },
  { value: 'other', label: 'Other / Miscellaneous' },
] as const;

export const BudgetExpenseTracker: React.FC<BudgetExpenseTrackerProps> = ({ trip }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analytics, setAnalytics] = useState<BudgetAnalytics | null>(null);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settling, setSettling] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Group split form state
  const currentUserName = user?.name || 'You';
  const tripMembers = Array.from(
    new Set([
      currentUserName,
      ...(trip.collaborators || []).map((c) => c.name || c.email.split('@')[0]),
    ])
  ).filter(Boolean);

  const [paidBy, setPaidBy] = useState<string>(currentUserName);
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT'>('EQUAL');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // New expense form
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'activities' as Expense['category'],
    payment_status: 'paid' as Expense['payment_status'],
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadExpenses();
    updatePendingQueueCount();

    const handleOnline = () => {
      setIsOffline(false);
      handleSyncOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trip.id]);

  const updatePendingQueueCount = async () => {
    try {
      const queue = await offlineStorage.getOfflineQueue();
      const tripQueue = queue.filter((item) => item.trip_id === trip.id);
      setPendingSyncCount(tripQueue.length);
    } catch {
      // IndexedDB access may be unavailable
    }
  };

  const handleSyncOfflineQueue = async () => {
    try {
      await offlineStorage.processSyncQueue(async (item) => {
        try {
          await tripService.addExpense(item.trip_id, item.data);
          return true;
        } catch {
          return false;
        }
      });
      await updatePendingQueueCount();
      await loadExpenses();
    } catch (err) {
      console.warn('Error during offline queue sync:', err);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError('');

      if (!navigator.onLine) {
        setIsOffline(true);
        const cached = await offlineStorage.getCachedExpenses(trip.id);
        if (cached && cached.length > 0) {
          setExpenses(cached);
        }
        return;
      }

      const [expenseRes, settleRes] = await Promise.all([
        tripService.getExpenses(trip.id),
        tripService.getSettlement(trip.id).catch(() => null),
      ]);

      setExpenses(expenseRes.expenses || []);
      setAnalytics(expenseRes.analytics || null);
      if (settleRes) {
        setSettlement(settleRes);
      }
      // Cache expenses for offline resilience
      await offlineStorage.cacheExpenses(trip.id, expenseRes.expenses || []);
    } catch (err: any) {
      // Fallback to offline cache
      const cached = await offlineStorage.getCachedExpenses(trip.id);
      if (cached && cached.length > 0) {
        setExpenses(cached);
      } else {
        setError(err?.response?.data?.message || 'Failed to load trip expenses.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    // Calculate splits
    let splits: any[] = [];
    if (splitType === 'EQUAL') {
      const count = tripMembers.length || 1;
      const share = Math.round((amountNum / count) * 100) / 100;
      splits = tripMembers.map((m) => ({
        name: m,
        amount: share,
        settled: m === paidBy,
      }));
    } else {
      splits = tripMembers.map((m) => ({
        name: m,
        amount: Number(customSplits[m] || 0),
        settled: m === paidBy,
      }));
    }

    const payload = {
      title: formData.title.trim(),
      amount: amountNum,
      category: formData.category,
      payment_status: formData.payment_status,
      currency: trip.currency || 'INR',
      date: formData.date,
      notes: formData.notes.trim() || undefined,
      paid_by: paidBy,
      paid_by_name: paidBy,
      split_type: splitType,
      splits: splits,
    };

    try {
      setSubmitting(true);

      if (!navigator.onLine) {
        // Enqueue offline
        await offlineStorage.enqueueOfflineExpense(trip.id, payload);
        const tempExpense: Expense = {
          id: 'offline-' + Date.now(),
          trip_id: trip.id,
          user_id: user?.id || 'offline',
          ...payload,
          created_at: new Date().toISOString(),
        };
        setExpenses((prev) => [tempExpense, ...prev]);
        await updatePendingQueueCount();
        setShowAddModal(false);
        alert('Saved offline! This expense will automatically sync to WanderAI when your device reconnects.');
        return;
      }

      const res = await tripService.addExpense(trip.id, payload);
      setExpenses((prev) => [res.expense, ...prev]);
      setAnalytics(res.analytics);

      // Refresh settlement
      try {
        const settleRes = await tripService.getSettlement(trip.id);
        if (settleRes) {
          setSettlement(settleRes);
        }
      } catch {
        // Non-blocking settlement refresh
      }

      setShowAddModal(false);
      setFormData({
        title: '',
        amount: '',
        category: 'activities',
        payment_status: 'paid',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setCustomSplits({});
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleDebt = async (debt: SimplifiedDebt) => {
    try {
      setSettling(true);
      await tripService.settleDebt(trip.id, {
        from: debt.from,
        to: debt.to,
        amount: debt.amount,
        currency: debt.currency,
      });

      // Reload settlement and expenses to reflect cleared debt
      await loadExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record settlement payment.');
    } finally {
      setSettling(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      const res = await tripService.deleteExpense(trip.id, expenseId);
      setExpenses((prev) => prev.filter((ex) => ex.id !== expenseId));
      setAnalytics(res.analytics);

      // Refresh settlement
      try {
        const settleRes = await tripService.getSettlement(trip.id);
        if (settleRes) {
          setSettlement(settleRes);
        }
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const handleStatusChange = async (
    expenseId: string,
    newStatus: Expense['payment_status']
  ) => {
    try {
      const res = await tripService.updateExpense(trip.id, expenseId, {
        payment_status: newStatus,
      });
      setExpenses((prev) =>
        prev.map((ex) => (ex.id === expenseId ? res.expense : ex))
      );
      setAnalytics(res.analytics);

      // Refresh settlement
      try {
        const settleRes = await tripService.getSettlement(trip.id);
        if (settleRes) {
          setSettlement(settleRes);
        }
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update payment status.');
    }
  };

  const currencySymbol =
    trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : '₹';

  // Total calculated for custom splits
  const customSplitsSum = Object.values(customSplits).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );
  const targetAmount = Number(formData.amount || 0);
  const splitsMatchTarget = Math.abs(customSplitsSum - targetAmount) < 0.05;

  return (
    <div className="space-y-8">
      {/* Offline sync banner if expenses pending */}
      {pendingSyncCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 shrink-0 text-amber-400" />
            <div className="text-xs">
              <span className="font-semibold">{pendingSyncCount} expense(s)</span> queued offline. They will sync automatically when online.
            </div>
          </div>
          {navigator.onLine && (
            <button
              onClick={handleSyncOfflineQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
          )}
        </div>
      )}

      {/* Analytics Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Total Budget */}
          <div className="bg-surface p-5 rounded-2xl border border-border">
            <div className="flex items-center justify-between text-xs text-muted uppercase font-semibold mb-1">
              <span>Total Budget</span>
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-text">
              {currencySymbol}
              {analytics.total_budget.toLocaleString()}
            </div>
            <div className="text-xs text-muted mt-1">Allocated for this journey</div>
          </div>

          {/* Card 2: Actual Paid Expenses */}
          <div className="bg-surface p-5 rounded-2xl border border-border">
            <div className="flex items-center justify-between text-xs text-muted uppercase font-semibold mb-1">
              <span>Actual Paid</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {currencySymbol}
              {analytics.actual_paid_expenses.toLocaleString()}
            </div>
            <div className="text-xs text-muted mt-1">
              {analytics.budget_used_percentage.toFixed(1)}% of total budget used
            </div>
          </div>

          {/* Card 3: Remaining Budget or Overrun Alert */}
          <div
            className={`p-5 rounded-2xl border ${
              analytics.is_over_budget
                ? 'bg-red-500/10 border-red-500/50'
                : 'bg-surface border-border'
            }`}
          >
            <div className="flex items-center justify-between text-xs uppercase font-semibold mb-1">
              <span className={analytics.is_over_budget ? 'text-red-400' : 'text-muted'}>
                {analytics.is_over_budget ? 'Budget Overrun' : 'Remaining Budget'}
              </span>
              {analytics.is_over_budget ? (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              ) : (
                <IndianRupee className="w-4 h-4 text-accent" />
              )}
            </div>
            <div
              className={`text-2xl font-bold ${
                analytics.is_over_budget ? 'text-red-400' : 'text-accent'
              }`}
            >
              {currencySymbol}
              {analytics.is_over_budget
                ? analytics.overrun_amount.toLocaleString()
                : analytics.remaining_budget.toLocaleString()}
            </div>
            <div className="text-xs text-muted mt-1">
              {analytics.is_over_budget
                ? 'Exceeded total planned budget!'
                : `${(100 - analytics.budget_used_percentage).toFixed(1)}% available funds`}
            </div>
          </div>

          {/* Card 4: Commitments & Refunds */}
          <div className="bg-surface p-5 rounded-2xl border border-border">
            <div className="flex items-center justify-between text-xs text-muted uppercase font-semibold mb-1">
              <span>Pending & Refunds</span>
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-sm font-semibold text-text">
              Pending:{' '}
              <span className="text-yellow-400">
                {currencySymbol}
                {analytics.pending_commitments.toLocaleString()}
              </span>
            </div>
            <div className="text-sm font-semibold text-text mt-1">
              Refunds:{' '}
              <span className="text-sky-400">
                {currencySymbol}
                {analytics.refunded_amount.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-muted mt-1">
              Effective balance: {currencySymbol}
              {analytics.potential_remaining_budget.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* FEATURE: Group Splitwise Settlement & Balances Widget */}
      {settlement && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-bold text-text">
                  Group Settlement & Balances
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Splitwise Min-Cash-Flow
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Real-time debt simplification across all trip participants
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">
                Total Group Spend: <strong className="text-text">{currencySymbol}{settlement.total_group_spending.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Net Balances List */}
          <div>
            <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Participant Balances</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {settlement.net_balances.map((nb) => {
                const isCreditor = nb.status === 'gets_back';
                const isDebtor = nb.status === 'owes';

                return (
                  <div
                    key={nb.member}
                    className="bg-background/70 border border-border/80 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-text">{nb.member}</div>
                      <div className="text-[11px] text-muted">
                        Paid: {currencySymbol}{nb.total_paid.toLocaleString()} • Owed: {currencySymbol}{nb.total_owed.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      {isCreditor && (
                        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          +{currencySymbol}{nb.abs_balance.toLocaleString()} gets back
                        </span>
                      )}
                      {isDebtor && (
                        <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          -{currencySymbol}{nb.abs_balance.toLocaleString()} owes
                        </span>
                      )}
                      {!isCreditor && !isDebtor && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface text-muted border border-border">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simplified Debt Transfers */}
          <div>
            <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-secondary" />
              <span>Simplified Debt Transfers</span>
            </h5>

            {settlement.simplified_debts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>All group expenses are settled! No one owes anything right now.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {settlement.simplified_debts.map((debt, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-rose-400">{debt.from}</span>
                      <span className="text-muted text-xs">owes</span>
                      <span className="font-semibold text-emerald-400">{debt.to}</span>
                      <span className="text-text font-bold ml-1">
                        {currencySymbol}{debt.amount.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSettleDebt(debt)}
                      disabled={settling}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{settling ? 'Settling...' : 'Mark as Settled'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown Progress Bar */}
      {analytics && Object.keys(analytics.category_breakdown).length > 0 && (
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Category Spend Breakdown
            </h4>
            <span className="text-xs text-muted">
              {analytics.expense_count} recorded expenses
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(analytics.category_breakdown).map(([cat, summary]) => (
              <div
                key={cat}
                className="bg-background/60 p-3 rounded-xl border border-border/50 text-xs"
              >
                <div className="capitalize text-muted font-medium truncate">{cat}</div>
                <div className="text-sm font-bold text-text mt-1">
                  {currencySymbol}
                  {summary.total_paid.toLocaleString()}
                </div>
                <div className="text-[11px] text-primary mt-0.5">
                  {summary.percentage_of_budget.toFixed(1)}% of budget
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h3 className="text-lg font-bold text-text">Logged Expenses</h3>
          <p className="text-xs text-muted">
            Track daily receipts, accommodation dues, and shared group costs
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-background px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expenses Table / List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-surface/50 border border-border rounded-2xl p-10 text-center text-muted text-sm">
          No expenses recorded yet. Click "Add Expense" to track your real-time travel costs.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {expenses.map((expense) => {
              const isPaid = expense.payment_status === 'paid';
              const isPending = expense.payment_status === 'pending';
              const isRefunded = expense.payment_status === 'refunded';

              return (
                <div
                  key={expense.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-background/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isPending
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : isRefunded
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-neutral-800 text-muted'
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="font-semibold text-text text-sm flex items-center gap-2">
                        <span>{expense.title}</span>
                        {expense.paid_by_name && (
                          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Paid by {expense.paid_by_name}
                          </span>
                        )}
                        {expense.id.startsWith('offline-') && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Offline Pending
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
                        <span className="capitalize">{expense.category}</span>
                        <span>•</span>
                        <span>{expense.date}</span>
                        {expense.split_type && (
                          <>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-semibold text-primary">
                              {expense.split_type === 'EQUAL' ? 'Split Equally' : 'Custom Split'}
                            </span>
                          </>
                        )}
                        {expense.notes && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-xs">{expense.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="font-bold text-sm text-text">
                        {currencySymbol}
                        {expense.amount.toLocaleString()}
                      </div>
                      <select
                        value={expense.payment_status}
                        onChange={(e) =>
                          handleStatusChange(
                            expense.id,
                            e.target.value as Expense['payment_status']
                          )
                        }
                        className={`text-[11px] font-semibold rounded-lg px-2 py-0.5 mt-0.5 border bg-background ${
                          isPaid
                            ? 'text-emerald-400 border-emerald-500/30'
                            : isPending
                            ? 'text-yellow-400 border-yellow-500/30'
                            : isRefunded
                            ? 'text-sky-400 border-sky-500/30'
                            : 'text-neutral-400 border-neutral-700'
                        }`}
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="refunded">Refunded</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-1.5 text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Expense Modal with Splitwise Support */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <h4 className="text-lg font-bold text-white mb-1">Add Trip Expense</h4>
            <p className="text-xs text-muted mb-4">
              Record a paid bill, reservation deposit, or group shared cost with Splitwise logic.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scuba diving pass, Dinner at Sea View, Train fare"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as Expense['category'],
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group Splitting Section */}
              <div className="bg-background/80 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Splitwise Expense Splitting
                  </span>
                  <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSplitType('EQUAL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        splitType === 'EQUAL'
                          ? 'bg-primary text-slate-950 shadow-sm'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      Split Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('EXACT')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        splitType === 'EXACT'
                          ? 'bg-primary text-slate-950 shadow-sm'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      Exact Splits
                    </button>
                  </div>
                </div>

                {/* Paid By Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Paid by
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    {tripMembers.map((m) => (
                      <option key={m} value={m}>
                        {m === currentUserName ? `${m} (You)` : m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Equal Split Preview */}
                {splitType === 'EQUAL' && (
                  <div className="text-xs text-muted bg-surface/60 p-2.5 rounded-lg border border-border/60">
                    {targetAmount > 0 ? (
                      <span className="text-emerald-400 font-semibold">
                        {currencySymbol}{(targetAmount / (tripMembers.length || 1)).toFixed(2)} per person
                      </span>
                    ) : (
                      'Enter amount to see per-person split'
                    )}
                    <span className="text-muted block text-[11px] mt-0.5">
                      Split across {tripMembers.length} traveler(s): {tripMembers.join(', ')}
                    </span>
                  </div>
                )}

                {/* Exact Splits Custom Fields */}
                {splitType === 'EXACT' && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] text-muted flex justify-between">
                      <span>Specify exact share per traveler</span>
                      <span
                        className={
                          splitsMatchTarget ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                        }
                      >
                        Total: {currencySymbol}{customSplitsSum} / {currencySymbol}{targetAmount}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tripMembers.map((m) => (
                        <div key={m} className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-border">
                          <span className="text-xs text-text font-medium truncate w-24">{m}:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={customSplits[m] || ''}
                            onChange={(e) =>
                              setCustomSplits({
                                ...customSplits,
                                [m]: e.target.value,
                              })
                            }
                            className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      ))}
                    </div>

                    {!splitsMatchTarget && targetAmount > 0 && (
                      <div className="text-[11px] text-rose-400 font-medium">
                        ⚠️ The sum of individual splits must equal the total expense amount.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_status: e.target.value as Expense['payment_status'],
                      })
                    }
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Receipt #1248, paid via Google Pay"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-white border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (splitType === 'EXACT' && !splitsMatchTarget && targetAmount > 0)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-background transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
