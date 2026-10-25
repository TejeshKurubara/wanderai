import os

base_dir = r"C:\Users\Sumera Anjum\OneDrive\Desktop\Codomax-aiml-internship\module-5-ai-travel-itinerary\frontend"

def write(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# package.json
write("package.json", \"\"\"
{
  "name": "ai-travel-planner",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.13.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.13",
    "globals": "^15.11.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "~5.6.2",
    "typescript-eslint": "^8.10.0",
    "vite": "^5.4.9"
  }
}
\"\"\")

write("vite.config.ts", \"\"\"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
\"\"\")

write("tailwind.config.js", \"\"\"
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#080a10',
        surface: '#111621',
        primary: '#10b981', /* Emerald green from Stitch */
        secondary: '#0ea5e9',
        accent: '#f59e0b',
        text: '#f8fafc',
        muted: '#94a3b8',
        border: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}
\"\"\")

write("postcss.config.js", \"\"\"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
\"\"\")

write("tsconfig.json", \"\"\"
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
\"\"\")

write("tsconfig.app.json", \"\"\"
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
\"\"\")

write("tsconfig.node.json", \"\"\"
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
\"\"\")

write("index.html", \"\"\"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WanderAI - AI Travel Planner</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  </head>
  <body class="bg-background text-text antialiased font-sans min-h-screen selection:bg-primary/30">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
\"\"\")

write("src/index.css", \"\"\"
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-text font-sans;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-serif text-text font-semibold;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #1e293b; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #334155; 
}

.gradient-text {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary;
}
\"\"\")

write("src/main.tsx", \"\"\"
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
\"\"\")

write("src/types/auth.ts", \"\"\"
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
\"\"\")

write("src/types/trip.ts", \"\"\"
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  days: number;
  travelers: number;
  budget: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  interests: string[];
  itinerary: any;
  created_at: string;
}

export interface TripRequest {
  destination: string;
  days?: number;
  travelers?: number;
  budget?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  interests?: string[];
  title?: string;
}
\"\"\")
