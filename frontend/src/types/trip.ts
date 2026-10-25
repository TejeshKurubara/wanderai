export interface Collaborator {
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at?: string;
}

export interface Trip {
  id: string;
  user_id: string;
  owner_id?: string;
  collaborators?: Collaborator[];
  invite_code?: string;
  title: string;
  destination: string;
  origin?: string;
  days: number;
  travelers: number;
  budget: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  interests: string[];
  itinerary?: any;
  image_url?: string;
  transport_preference?: string;
  accommodation_preference?: string;
  food_preference?: string;
  accessibility_requirements?: string;
  intermediate_destinations?: string[];
  booking_status?: string;
  notes?: string;
  total_activities?: number;
  has_itinerary?: boolean;
  display_currency?: string;
  completed_activities?: string[];
  has_revision_history?: boolean;
  history_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface TripRequest {
  destination: string;
  origin?: string;
  days?: number;
  travelers?: number;
  budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  interests?: string[];
  title?: string;
  transport_preference?: string;
  accommodation_preference?: string;
  food_preference?: string;
  accessibility_requirements?: string;
  intermediate_destinations?: string[];
}

export interface ExpenseSplit {
  user_id?: string;
  name: string;
  amount: number;
  percentage?: number;
  settled: boolean;
}

export interface Expense {
  id: string;
  trip_id: string;
  user_id?: string;
  title?: string;
  description?: string;
  amount: number;
  category: 'accommodation' | 'transport' | 'activities' | 'food' | 'shopping' | 'emergency' | 'other' | string;
  currency: string;
  payment_status: 'paid' | 'pending' | 'refunded' | 'cancelled';
  date: string;
  booking_reference?: string;
  notes?: string;
  paid_by?: string;
  paid_by_name?: string;
  paid_by_user_id?: string;
  split_type?: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
  splits?: ExpenseSplit[];
  created_at?: string;
  updated_at?: string;
}

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

export interface NetBalance {
  member: string;
  balance: number;
  abs_balance: number;
  total_paid: number;
  total_owed: number;
  status: 'gets_back' | 'owes' | 'settled';
}

export interface SettlementData {
  net_balances: NetBalance[];
  simplified_debts: SimplifiedDebt[];
  total_group_spending: number;
  currency: string;
  members: string[];
}

export interface CategorySummary {
  total_paid: number;
  percentage_of_budget: number;
  count: number;
}

export interface BudgetAnalytics {
  total_budget: number;
  currency: string;
  actual_paid_expenses: number;
  remaining_budget: number;
  budget_used_percentage: number;
  is_over_budget: boolean;
  overrun_amount: number;
  pending_commitments: number;
  potential_remaining_budget: number;
  refunded_amount: number;
  category_breakdown: Record<string, CategorySummary>;
  expense_count: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  airline_code: string;
  airline_logo: string;
  flight_number: string;
  origin_airport: string;
  destination_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabin_class: string;
  seats_remaining: number;
  baggage_included: string;
  booking_url: string;
  is_demo_offer?: boolean;
}

export interface HotelOffer {
  id: string;
  name: string;
  destination: string;
  rating: number;
  stars: number;
  review_count: number;
  badge: string;
  image_url: string;
  price_per_night: number;
  total_price: number;
  currency: string;
  room_type: string;
  amenities: string[];
  cancellation_policy: string;
  address: string;
  booking_url: string;
  is_demo_offer?: boolean;
}

export interface RentalOffer {
  id: string;
  vehicle_name: string;
  category: 'Economy / Compact' | 'SUV' | 'Electric / Hybrid' | 'Luxury' | 'Van / Minivan' | string;
  provider: string;
  rating: number;
  review_count: number;
  badge: string;
  image_url: string;
  daily_rate: number;
  total_price: number;
  currency: string;
  seats: number;
  bags: number;
  transmission: 'Automatic' | 'Manual' | string;
  air_conditioning: boolean;
  unlimited_mileage: boolean;
  cancellation_policy: string;
  spec_tags: string[];
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  dropoff_date: string;
  days: number;
  is_demo_offer?: boolean;
}

export interface TransportRouteOption {
  mode: string;
  name: string;
  duration: string;
  estimated_cost: number;
  currency: string;
  frequency: string;
  eco_friendly: boolean;
  route_summary: string;
  pros: string;
  booking_url: string;
}

export interface LocalTransportGuide {
  destination: string;
  local_transit_type: string;
  transit_pass_options: string[];
  average_daily_transit_cost: string;
  taxi_ride_apps: string[];
  airport_to_center_transfer: string;
  scooter_bike_rentals: string;
  pro_tip: string;
}

export interface EmergencyServices {
  destination: string;
  emergency_police: string;
  emergency_ambulance: string;
  emergency_general: string;
  major_hospitals: { name: string; type: string; contact: string }[];
  tourist_helpline: string;
  notes: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  booking_type: 'flight' | 'hotel' | 'train' | 'bus' | 'car_rental' | 'rental_car' | 'activity' | 'other';
  title: string;
  provider: string;
  reference_number?: string;
  status: 'planned' | 'quoted' | 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  details?: any;
  booking_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RouteStop {
  time_slot?: string;
  name?: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  estimated_cost?: number;
  visit_duration_minutes?: number;
  transport_to_next?: {
    mode: string;
    distance_km: number;
    distance_type?: string;
    is_road_route?: boolean;
    duration_minutes: number;
    estimated_cost: number;
    currency: string;
    from_name: string;
    to_name: string;
    provider?: string;
    attribution?: string;
    latlng_path?: [number, number][];
    notice?: string;
  };
}

export interface RouteOptimizedDay {
  day_number: number;
  date?: string;
  theme?: string;
  activities: RouteStop[];
  total_travel_km: number;
  total_travel_minutes: number;
  stops_count: number;
  map_data?: {
    waypoints: Array<{
      order: number;
      name: string;
      latitude: number;
      longitude: number;
      time?: string;
      location?: string;
    }>;
    route_geometry: [number, number][];
    provider: string;
    attribution: string;
  };
}

export interface RouteOptimizationProposal {
  mode: string;
  algorithm: string;
  days: RouteOptimizedDay[];
  summary_metrics: {
    original_distance_km: number;
    optimized_distance_km: number;
    distance_saved_km: number;
    distance_saved_percentage: number;
    original_travel_minutes: number;
    optimized_travel_minutes: number;
    time_saved_minutes: number;
    time_saved_percentage: number;
    estimated_transit_cost: number;
    currency: string;
    is_fully_ordered: boolean;
    routing_provider?: string;
    routing_attribution?: string;
    disclaimer?: string;
  };
  conflicts: Array<{
    day: number;
    type: string;
    message: string;
    severity: 'warning' | 'info' | 'critical';
  }>;
  recommendations: string[];
}

export interface ReplanningProposal {
  scenario: string;
  summary: string;
  completed_activities_preserved: number;
  changes_made: string[];
  cost_delta: number;
  currency: string;
  new_itinerary: any;
  weather_data?: any;
  weather_attribution?: string;
}

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  intent?: string;
  is_deterministic?: boolean;
  meta?: any;
}

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyConversionResult {
  original_amount: number;
  from_currency: string;
  converted_amount: number;
  to_currency: string;
  rate: number;
  is_live: boolean;
  timestamp: string;
}

export interface MultiCurrencyBudgetProjection {
  trip_id: string;
  source_currency: string;
  target_currency: string;
  rate: number;
  is_live: boolean;
  original_budget: number;
  converted_budget: number;
  original_paid_expenses: number;
  converted_paid_expenses: number;
  original_remaining_budget: number;
  converted_remaining_budget: number;
  original_pending_commitments: number;
  converted_pending_commitments: number;
  category_breakdown: Record<string, {
    original_amount: number;
    converted_amount: number;
    percentage: number;
  }>;
}

