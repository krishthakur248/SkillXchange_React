# SkillXchange

### Learn something new. Teach what you know.

SkillXchange is a peer-to-peer learning platform where people exchange skills, find mentors, and make progress together. Browse learning opportunities, build a profile around what you can teach and want to learn, and connect through chat and video sessions.

<p align="center">
	<a href="https://krishthakur248.github.io/SkillXChange_Landing_Page/"><strong>Visit the live demo</strong></a>
</p>

<p align="center">
	<img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
	<img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20.19%2B-43853D?logo=nodedotjs&logoColor=white">
	<img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white">
</p>

---

## What you can do

- **Exchange skills:** Share the skills you can teach and discover what others can help you learn.
- **Find mentors:** Browse mentor profiles and explore skill-based matches.
- **Learn and teach:** Send and manage exchange requests, track connections, and organize classes.
- **Track progress:** Keep an eye on learning goals, milestones, and activity.
- **Stay connected:** Message other members and schedule video sessions with real-time signaling.
- **Manage your profile:** Update your learning interests, teaching skills, and personal details.

## Project structure

```text
.
├── skill/                 # React + Vite frontend
│   └── src/
│       ├── api/            # Frontend API client
│       ├── components/     # Shared interface components
│       ├── context/        # Authentication state
│       └── pages/          # App pages and routes
└── skill-backend/         # Express + MongoDB API and Socket.IO signaling
    ├── src/
    │   ├── models/         # Mongoose models
    │   ├── routes/         # REST API routes
    │   ├── seed/           # Demo data
    │   └── socket/         # Video-call signaling
    └── server.js
```

## Run locally

### Requirements

- Node.js 20.19+ (or 22.12+)
- npm

### 1. Start the backend

```bash
cd skill-backend
npm install
npm run dev
```

By default, the backend starts on `http://localhost:5000`. If `MONGODB_URI` is not configured, it starts an in-memory MongoDB database and seeds demo data automatically. The in-memory database is for local development and resets when the backend stops.

To use a persistent MongoDB database instead, create `skill-backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/skillxchange
PORT=5000
JWT_SECRET=replace-this-with-a-long-random-secret
```

### 2. Start the frontend

In a second terminal:

```bash
cd skill
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend connects to `http://localhost:5000` by default. To use a different backend, set `VITE_API_URL` in `skill/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### Demo account

When using the backend's default in-memory database, sign in with:

| Email | Password |
| --- | --- |
| `alex@skillxchange.io` | `password123` |

This is a development/demo account. Do not use these credentials or the in-memory database for a production deployment.

## Useful commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `skill/` | `npm run dev` | Start the frontend development server |
| `skill/` | `npm run build` | Build the frontend for production |
| `skill/` | `npm run preview` | Preview the production build locally |
| `skill/` | `npm run lint` | Run Oxlint |
| `skill-backend/` | `npm run dev` | Start the backend with Nodemon |
| `skill-backend/` | `npm start` | Start the backend |
| `skill-backend/` | `npm run seed` | Seed the configured MongoDB database |

## Built with

- **Frontend:** React, React Router, Vite, Tailwind CSS, Anime.js
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO
- **Authentication:** JSON Web Tokens and bcrypt
- **Video sessions:** WebRTC signaling over Socket.IO

## Live demo

[https://krishthakur248.github.io/SkillXChange_Landing_Page/](https://krishthakur248.github.io/SkillXChange_Landing_Page/)