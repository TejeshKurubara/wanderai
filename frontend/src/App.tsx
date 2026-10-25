import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import Itinerary from './pages/Itinerary';
import { JoinTrip } from './pages/JoinTrip';
import CurrencyConverterPage from './pages/CurrencyConverterPage';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallbackTitle="WanderAI Application Error">
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/currency" element={<CurrencyConverterPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-trip" element={<CreateTrip />} />
              <Route path="/itinerary/:tripId" element={<Itinerary />} />
              <Route path="/trip/:tripId" element={<Itinerary />} />
              <Route path="/join" element={<JoinTrip />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
