import api from './api';
import {
  Trip,
  TripRequest,
  Expense,
  BudgetAnalytics,
  FlightOffer,
  HotelOffer,
  RentalOffer,
  TransportRouteOption,
  LocalTransportGuide,
  EmergencyServices,
  Booking,
  Collaborator,
  SettlementData,
  RouteOptimizationProposal,
  ReplanningProposal,
  CompanionMessage,
  CurrencyItem,
  CurrencyConversionResult,
  MultiCurrencyBudgetProjection,
} from '../types/trip';

export const tripService = {
  // Trips
  async createTrip(data: TripRequest): Promise<{ trip: Trip }> {
    const response = await api.post('/trips', data);
    return response.data.data;
  },

  async getTrips(full: boolean = false): Promise<{ trips: Trip[]; count: number }> {
    const response = await api.get(`/trips${full ? '?full=true' : ''}`);
    return response.data.data;
  },

  async getTrip(id: string): Promise<{ trip: Trip }> {
    const response = await api.get(`/trips/${id}`);
    return response.data.data;
  },

  async updateTrip(id: string, updates: Partial<Trip>): Promise<{ trip: Trip }> {
    const response = await api.patch(`/trips/${id}`, updates);
    return response.data.data;
  },

  async deleteTrip(id: string): Promise<void> {
    await api.delete(`/trips/${id}`);
  },

  // Expenses & Budget Analytics
  async getExpenses(
    tripId: string
  ): Promise<{ expenses: Expense[]; analytics: BudgetAnalytics; count: number }> {
    const response = await api.get(`/trips/${tripId}/expenses`);
    return response.data.data;
  },

  async addExpense(
    tripId: string,
    data: Omit<Expense, 'id' | 'trip_id' | 'created_at' | 'updated_at'>
  ): Promise<{ expense: Expense; analytics: BudgetAnalytics }> {
    const response = await api.post(`/trips/${tripId}/expenses`, data);
    return response.data.data;
  },

  async updateExpense(
    tripId: string,
    expenseId: string,
    updates: Partial<Expense>
  ): Promise<{ expense: Expense; analytics: BudgetAnalytics }> {
    const response = await api.put(`/trips/${tripId}/expenses/${expenseId}`, updates);
    return response.data.data;
  },

  async deleteExpense(
    tripId: string,
    expenseId: string
  ): Promise<{ analytics: BudgetAnalytics }> {
    const response = await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
    return response.data.data;
  },

  async getBudgetAnalytics(tripId: string): Promise<{ analytics: BudgetAnalytics }> {
    const response = await api.get(`/trips/${tripId}/expenses/analytics`);
    return response.data.data;
  },

  // Travel Searches
  async searchFlights(params: {
    origin?: string;
    destination: string;
    departure_date?: string;
    return_date?: string;
    passengers?: number;
    cabin_class?: string;
    currency?: string;
  }): Promise<{
    flights: FlightOffer[];
    count: number;
    currency: string;
    is_demo: boolean;
    provider: string;
  }> {
    const response = await api.get('/flights/search', { params });
    return response.data.data;
  },

  async searchHotels(params: {
    destination: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    min_stars?: number;
    currency?: string;
  }): Promise<{
    hotels: HotelOffer[];
    count: number;
    currency: string;
    is_demo: boolean;
    provider: string;
  }> {
    const response = await api.get('/hotels/search', { params });
    return response.data.data;
  },

  async getTransportRoutes(params: {
    origin?: string;
    destination: string;
    date?: string;
    currency?: string;
  }): Promise<{
    origin: string;
    destination: string;
    distance_estimate_km: number;
    options: TransportRouteOption[];
    pro_tip: string;
    google_maps_url: string;
  }> {
    const response = await api.get('/transport/routes', { params });
    return response.data.data;
  },

  async getCityTransitGuide(destination: string): Promise<LocalTransportGuide> {
    const response = await api.get('/transport/city-guide', { params: { destination } });
    return response.data.data;
  },

  async getEmergencyServices(destination: string): Promise<EmergencyServices> {
    const response = await api.get('/transport/emergency', { params: { destination } });
    return response.data.data;
  },

  // Bookings CRUD
  async getBookings(
    tripId: string,
    type?: string
  ): Promise<{ bookings: Booking[]; count: number }> {
    const response = await api.get(`/trips/${tripId}/bookings`, {
      params: type ? { type } : undefined,
    });
    return response.data.data;
  },

  async createBooking(
    tripId: string,
    data: Partial<Booking>
  ): Promise<{ booking: Booking }> {
    const response = await api.post(`/trips/${tripId}/bookings`, data);
    return response.data.data;
  },

  async updateBooking(
    tripId: string,
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<{ booking: Booking }> {
    const response = await api.put(`/trips/${tripId}/bookings/${bookingId}`, updates);
    return response.data.data;
  },

  async deleteBooking(tripId: string, bookingId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/bookings/${bookingId}`);
  },

  // Route Optimization (Feature 1)
  async optimizeRoute(
    tripId: string,
    params?: {
      mode?: string;
      max_walking_km?: number;
      day_number?: number;
      starting_point?: string;
    }
  ): Promise<{ proposal: RouteOptimizationProposal; undo_available: boolean }> {
    const response = await api.post(`/trips/${tripId}/routes/optimize`, params || {});
    return response.data.data;
  },

  async applyRouteOptimization(
    tripId: string,
    data: { optimized_days: any[]; change_summary?: string }
  ): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/routes/apply-optimization`, data);
    return response.data.data;
  },

  async undoRouteOptimization(tripId: string): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/routes/undo-optimization`);
    return response.data.data;
  },

  // Automatic Replanning (Feature 2)
  async previewReplanning(
    tripId: string,
    data: { scenario: string; details?: any; day_offset?: number }
  ): Promise<{ proposal: ReplanningProposal; undo_available: boolean }> {
    const response = await api.post(`/trips/${tripId}/replan/preview`, data);
    return response.data.data;
  },

  async applyReplanning(
    tripId: string,
    data: { new_itinerary: any; scenario?: string }
  ): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/replan/apply`, data);
    return response.data.data;
  },

  async undoReplanning(tripId: string): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/replan/undo`);
    return response.data.data;
  },

  async toggleActivityCompletion(
    tripId: string,
    activityName: string,
    completed: boolean
  ): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/activities/toggle-completion`, {
      activity_name: activityName,
      completed,
    });
    return response.data.data;
  },

  // AI Travel Companion (Feature 3)
  async sendCompanionMessage(
    tripId: string,
    message: string
  ): Promise<{
    message: string;
    intent?: string;
    is_deterministic?: boolean;
    meta?: any;
    user_message?: any;
    assistant_message?: any;
  }> {
    const response = await api.post(`/trips/${tripId}/companion/chat`, { message });
    return response.data.data;
  },

  async getCompanionHistory(
    tripId: string,
    limit?: number
  ): Promise<{ history: CompanionMessage[]; count: number }> {
    const response = await api.get(`/trips/${tripId}/companion/history`, {
      params: limit ? { limit } : undefined,
    });
    return response.data.data;
  },

  async clearCompanionHistory(tripId: string): Promise<{ cleared: boolean }> {
    const response = await api.delete(`/trips/${tripId}/companion/history`);
    return response.data.data;
  },

  // Currency Converter & Multi-Currency (Feature 4)
  async updateDisplayCurrency(
    tripId: string,
    currency: string
  ): Promise<{ trip: Trip }> {
    const response = await api.post(`/trips/${tripId}/display-currency`, { currency });
    return response.data.data;
  },

  async getSupportedCurrencies(): Promise<{
    currencies: CurrencyItem[];
    count: number;
    base: string;
  }> {
    const response = await api.get('/currency/supported');
    return response.data.data;
  },

  async convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Promise<CurrencyConversionResult> {
    const response = await api.post('/currency/convert', {
      amount,
      from,
      to,
      from_currency: from,
      to_currency: to,
    });
    return response.data.data;
  },

  async getTripBudgetInCurrency(
    tripId: string,
    targetCurrency: string
  ): Promise<{ projection: MultiCurrencyBudgetProjection }> {
    const response = await api.get(`/currency/trip/${tripId}/budget`, {
      params: { target_currency: targetCurrency },
    });
    return response.data.data;
  },

  async getTripWeather(tripId: string): Promise<{ weather: any }> {
    const response = await api.get(`/trips/${tripId}/weather`);
    return response.data.data;
  },

  async getDestinationWeather(destination: string): Promise<{ weather: any }> {
    const response = await api.get('/trips/weather', {
      params: { destination },
    });
    return response.data.data;
  },

  // Car & Vehicle Rentals
  async searchRentals(params: {
    location: string;
    pickup_date?: string;
    dropoff_date?: string;
    passengers?: number;
    category?: string;
    transmission?: string;
    currency?: string;
  }): Promise<{ rentals: RentalOffer[]; count: number; days: number; is_demo: boolean }> {
    const response = await api.get('/rentals/search', { params });
    return response.data.data;
  },

  async bookRental(
    tripId: string,
    data: any
  ): Promise<{ booking: Booking; expense: Expense; analytics: BudgetAnalytics }> {
    const response = await api.post(`/trips/${tripId}/rentals/book`, data);
    return response.data.data;
  },

  // Group Collaboration
  async getCollaborators(tripId: string): Promise<{
    owner: any;
    collaborators: Collaborator[];
    invite_code: string;
    total_members: number;
  }> {
    const response = await api.get(`/trips/${tripId}/collaborators`);
    return response.data.data;
  },

  async createInvite(tripId: string): Promise<{ invite_code: string; share_url: string }> {
    const response = await api.post(`/trips/${tripId}/collaborators/invite`);
    return response.data.data;
  },

  async joinTrip(inviteCode: string): Promise<{ trip: Trip; message: string }> {
    const response = await api.post('/trips/join', { invite_code: inviteCode });
    return response.data.data;
  },

  async removeCollaborator(tripId: string, targetUserId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/collaborators/${targetUserId}`);
  },

  // Splitwise & Debt Settlement
  async getSettlement(tripId: string): Promise<SettlementData> {
    const response = await api.get(`/trips/${tripId}/expenses/settlement`);
    return response.data.data;
  },

  async settleDebt(
    tripId: string,
    data: { from: string; to: string; amount: number; currency?: string }
  ): Promise<{ expense: Expense; settlement: SettlementData; analytics: BudgetAnalytics }> {
    const response = await api.post(`/trips/${tripId}/expenses/settle`, data);
    return response.data.data;
  },

  // Calendar Export
  async downloadCalendarIcs(tripId: string, title?: string): Promise<void> {
    const response = await api.get(`/trips/${tripId}/export/ics`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(title || 'trip').replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
