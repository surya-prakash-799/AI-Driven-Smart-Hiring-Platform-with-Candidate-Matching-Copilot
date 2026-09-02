# AI-Driven Smart Hiring Platform - Frontend

A React-based single-page application for AI-powered recruitment, candidate matching, and interview assistance.

## Tech Stack

| Layer            | Technology       |
| ---------------- | ---------------- |
| UI Framework     | React 18         |
| Language         | TypeScript 5     |
| Bundler          | Vite 5           |
| CSS              | Tailwind CSS 3   |
| Routing          | React Router 6   |
| HTTP Client      | Axios            |
| Animations       | Framer Motion    |
| Icons            | Lucide React     |
| Charts           | Recharts         |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Backend server running at `http://127.0.0.1:8000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the dev server at `http://localhost:5173`. All `/api` requests are proxied to the backend at `http://127.0.0.1:8000`.

### Build

```bash
npm run build
```

Type-checks and produces a production build in `dist/`.

### Preview

```bash
npm run preview
```

Serves the production build at `http://localhost:4173`.

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Route definitions (lazy-loaded)
├── index.css                   # Global styles (Tailwind)
│
├── pages/                      # Route-level components
│   ├── Dashboard.tsx           # Main dashboard with stats & analytics
│   ├── Candidates.tsx          # Candidate list & management
│   ├── ResumeUpload.tsx        # Resume upload & AI extraction
│   ├── JobPositions.tsx        # Job position CRUD & AI matching
│   ├── InterviewAssistance.tsx # AI interview questions & simulation
│   └── Login.tsx               # Login/Signup page
│
├── components/
│   ├── layout/                 # App shell (Sidebar, Header, AppLayout)
│   ├── ui/                     # Reusable primitives (Button, Card, Modal, etc.)
│   └── ...                     # Domain-specific components
│
├── context/                    # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── CandidatesContext.tsx   # Candidate data & CRUD
│   ├── ThemeContext.tsx         # Light/dark mode
│   └── ToastContext.tsx        # Toast notifications
│
├── services/
│   └── api.ts                  # Axios client & all API functions
│
├── types/
│   ├── api.ts                  # Backend API types
│   └── candidate.ts            # Frontend candidate types
│
├── hooks/
│   └── useDebounce.ts          # Debounce hook
│
└── utils/
    ├── cn.ts                   # Tailwind class merger
    ├── format.ts               # Formatters (date, file size, etc.)
    ├── validation.ts           # File upload validation
    └── candidateMapping.ts     # Backend ↔ Frontend data mapping
```

## Features

- **Resume Upload & Parsing** — Upload PDF/DOCX files with AI-powered extraction of skills, education, and experience.
- **Candidate Management** — Paginated list with search, filter, view, edit, and delete.
- **Job Position Management** — Full CRUD with required/preferred skills and experience requirements.
- **AI Candidate Matching** — Skill gap analysis and ranked matching between candidates and positions.
- **Interview Assistance** — AI-generated interview questions by type (Technical, HR, Behavioral) with simulation mode.
- **Voice Screening** — Voice-based candidate evaluation from the dashboard.
- **Dashboard Analytics** — Recruitment pipeline, top matches, interview status, and activity feed.
- **Dark Mode** — Class-based theme toggle with localStorage persistence.
- **Toast Notifications** — Success, error, info, and warning toasts with auto-dismiss.

## Routes

| Path                    | Page                    | Description                              |
| ----------------------- | ----------------------- | ---------------------------------------- |
| `/` or `/dashboard`     | Dashboard               | Main overview with stats and analytics   |
| `/job-positions`        | Job Positions           | Job CRUD and AI matching                 |
| `/candidates`           | Candidates              | Candidate list and management            |
| `/upload`               | Resume Upload           | Upload resumes for AI extraction         |
| `/interview-assistance` | Interview Assistance    | AI questions and interview simulation    |

## Environment Variables

| Variable              | Default  | Description                  |
| --------------------- | -------- | ---------------------------- |
| `VITE_API_BASE_URL`   | `/api`   | Backend API base URL         |

## Backend

This frontend expects a backend API server running at `http://127.0.0.1:8000`. The Vite dev server proxies all `/api` requests to the backend. See the backend project for API documentation.

Default admin credentials: `admin@recruit.ai` / `admin123`
