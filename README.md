# 🌍 WanderAI — AI-Powered Travel Itinerary Planner

WanderAI is an AI-powered travel planning application designed to make trip planning easier, smarter and more personalized. It helps travelers organize itineraries, explore destinations, optimize routes, manage travel budgets and access useful travel information from one platform.

The project combines a React frontend, Flask backend, MongoDB database and AI-powered planning workflows to provide an integrated travel experience.

## ✨ Features

### 🗺️ AI-Powered Travel Planning
- Generate personalized, day-by-day travel itineraries.
- Recommend destinations, attractions and activities based on traveler preferences.
- Organize travel plans around trip dates, traveler count and budget.
- Save and manage trips.

### 🚀 Smart Route Optimization
- Optimize the order of attractions to reduce unnecessary travel.
- Use heuristic optimization techniques, including the 2-opt algorithm.
- Consider travel preferences, starting locations and itinerary constraints.
- Display road routes and estimated travel distances when supported by the configured routing service.

### 🔄 Automatic Itinerary Replanning
- Generate alternative itineraries when travel plans change.
- Support scenarios such as delays, skipped activities, accommodation changes, bad weather and newly added attractions.
- Review proposed itinerary changes before saving them.
- Preserve confirmed bookings unless the traveler explicitly manages them through a supported provider workflow.

### 💬 AI Travel Companion
- Provide contextual travel recommendations and itinerary assistance.
- Answer trip-related questions using available saved trip information.
- Help travelers understand their itinerary, expenses and remaining budget.

### 💰 Budget and Expense Management
- Track the planned trip budget and actual spending.
- Calculate the remaining budget and percentage spent.
- Organize expenses into categories such as transportation, accommodation, food and activities.
- Compare estimated costs with recorded expenses.
- Support multi-currency budget analysis when valid exchange rates are available.

### 💱 Currency Converter
- Convert between supported currencies.
- Display exchange rates and their associated dates.
- Integrate currency conversion with travel expense calculations.
- Use the Frankfurter API, which does not require an API key.

### ✈️ Flight Search
- Search and compare flight options through the configured SerpApi Google Flights integration.
- Display returned flight information, prices and available booking links.
- Handle unavailable results and API limitations.

### 🏨 Hotel Search
- Search for hotel information through the configured SerpApi Google Hotels integration.
- Display available hotel details and prices when returned by the provider.
- Support external booking links where available.

### 🌦️ Weather-Aware Travel Planning
- Retrieve forecasts using Open-Meteo.
- Provide weather-aware activity suggestions and alternative plans when forecast data is available.

### 🖼️ Destination Images
- Retrieve destination photographs through the Pixabay API when configured.
- Provide fallback images if the image service is unavailable.

### 📍 Maps and Directions
- Display interactive maps using OpenStreetMap and Leaflet where implemented.
- Support route and distance requests through OSRM for prototype use.
- Provide fallback behavior when routing data is unavailable.

## 🧠 AI Agent Architecture

WanderAI uses a multi-agent workflow to separate different travel-planning responsibilities.

| Agent | Responsibility |
|---|---|
| Research Agent | Identifies destinations, attractions and relevant travel information. |
| Preference Agent | Ranks recommendations according to traveler preferences. |
| Budget Agent | Evaluates budgets, costs and financial constraints. |
| Logistics Agent | Handles itinerary sequencing and transportation-related planning. |
| Reviewer Agent | Reviews itinerary consistency, feasibility and overall quality. |

The agents work together through an orchestrator to generate and review travel plans. Deterministic calculations are used where appropriate for budgets, expense totals and route optimization.

## 🛠️ Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS

### Backend
- Python
- Flask
- REST APIs

### Database
- MongoDB Atlas

### AI and Machine Learning
- Gemini API
- Groq API
- Multi-agent orchestration
- Heuristic route optimization using the 2-opt algorithm

### External Services

| Service | Purpose | API Key |
|---|---|---|
| Pixabay | Destination images | Required |
| SerpApi Google Flights | Flight search | Required |
| SerpApi Google Hotels | Hotel search | Required |
| OpenStreetMap | Map data and display | No key for basic map usage |
| Leaflet | Interactive map rendering | No key for the library |
| OSRM | Prototype road routing | No key for its public demo server |
| Frankfurter | Currency exchange rates | Not required |
| Open-Meteo | Weather forecasts | Not required for eligible free non-commercial use |

External services are subject to provider terms, availability, quotas and configuration. A successful API search does not itself confirm a booking.

## 📁 Project Structure

The following is the intended high-level structure. Actual filenames may vary depending on the implementation.

```text
module-5-ai-travel-itinerary/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── services/
│   ├── agents/
│   ├── routes/
│   └── models/
│
├── README.md
└── .gitignore
```

## ⚙️ Prerequisites

Install the following before running the project:

- Python 3.10 or another version compatible with the backend dependencies.
- Node.js and npm.
- MongoDB Atlas account or a configured MongoDB instance.
- Git.
- API credentials for any external services you want to enable.

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/09sumera/codomax-ai-ml-internship.git
cd codomax-ai-ml-internship/module-5-ai-travel-itinerary
```

### 2. Set Up the Backend

Open a terminal in the project directory.

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a local `.env` file using `.env.example` as a reference. Configure the required MongoDB, authentication and AI-provider variables.

Start the backend using the project's actual Flask entry point and configured development command. For example, if `app.py` exposes a Flask application named `app`:

```powershell
python app.py
```

Confirm the startup message and use the backend health endpoint if the project provides one.

### 3. Set Up the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

The frontend must be configured to call the correct local Flask backend URL.

## 🔐 Environment Variables

Never commit real API credentials or secret values to GitHub.

Configure the required variables in `backend/.env` according to the backend implementation.

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Authentication signing secret |
| `JWT_EXPIRY_HOURS` | Token expiry configuration |
| `AI_PROVIDER` | Selected AI provider |
| `GEMINI_API_KEY` | Gemini API access |
| `GEMINI_MODEL` | Configured Gemini model |
| `GEMINI_TIMEOUT_SECONDS` | AI request timeout |
| `GROQ_API_KEY` | Groq API access |
| `GROQ_MODEL` | Configured Groq model |
| `CORS_ORIGINS` | Permitted frontend origins |
| `IMAGE_API_KEY` | Pixabay image API key |
| `FLIGHT_API_KEY` | SerpApi key for flight search |
| `FLIGHT_API_SECRET` | Not required for SerpApi |
| `HOTEL_API_KEY` | SerpApi key for hotel search, if configured separately |
| `MAPS_API_KEY` | Optional routing provider credential |
| `CURRENCY_API_KEY` | Not required when using Frankfurter |
| `WEATHER_API_KEY` | Not required when using Open-Meteo |

Variable names must match those read by the application. Keep optional provider keys blank when the corresponding integration does not require them.

## ☁️ Deployment

### Frontend — Vercel
1. Connect the GitHub repository to Vercel.
2. Set the frontend root directory to `module-5-ai-travel-itinerary/frontend`.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Configure the frontend API base URL to point to the deployed Flask backend.
6. Ensure nested React routes work when opened or refreshed directly.

### Backend — Render
1. Create a Render Web Service connected to the GitHub repository.
2. Set the backend root directory to `module-5-ai-travel-itinerary/backend`.
3. Install dependencies from `requirements.txt`.
4. Use Gunicorn or another appropriate production WSGI server.
5. Configure required environment variables in the Render dashboard.
6. Allow the deployed frontend origin in Flask CORS configuration.

Ensure MongoDB Atlas network access permits connections from the deployed backend. Keep all secrets in the hosting provider's environment settings.

## 🧪 Testing Checklist

Before sharing the deployed application, verify:

- User registration and login.
- Trip creation, retrieval and persistence.
- Itinerary generation through the AI workflow.
- Destination images and fallback behavior.
- Flight and hotel search responses.
- Route optimization and replanning.
- Currency conversion and exchange-rate validation.
- Budget and expense calculations.
- Weather-based recommendations.
- Direct access to nested itinerary URLs.
- Responsive frontend behavior.
- Backend errors, API quotas and missing-credential handling.

Use mock responses for automated tests where appropriate. Confirm real provider results separately.

## 🔒 Security and Responsible API Usage

- Keep API secrets in backend environment variables.
- Never expose secret credentials in frontend bundles, logs or GitHub.
- Validate user input and enforce trip ownership.
- Apply suitable timeouts, caching and rate limits.
- Respect external provider terms, attribution and usage quotas.
- Clearly distinguish estimates and demo results from verified live information.
- Never claim a flight or hotel is booked without provider confirmation.
- Do not store raw payment-card details.

## 📌 Current Project Status

WanderAI is designed to bring itinerary generation, route optimization, travel assistance, budget analysis and travel-service integrations into a single application.

The availability of individual features depends on their implementation, provider access, configuration and testing. Mock or fallback functionality may be used when a live service is unavailable.

## 📄 License

Add an appropriate open-source license before distributing the project publicly. Confirm the license terms of all external libraries, APIs, datasets and media used by the application.

