# SPARTAN-G Prototype

Web-only prototype for student mental health monitoring, assessment, analytics, and facilitator intervention.

## Structure

- `frontend/` React 19 + Vite 6 student and facilitator portal
- `backend/` Node.js + Express 4.21 REST API
- `database/` MySQL schema and seed data for database `spartang1`

## Run

1. Create the MySQL database `spartang1`.
2. Apply `database/schema.sql` and `database/seed.sql`.
3. Configure `backend/.env`.
4. Install dependencies in `backend/` and `frontend/`.
5. Start the backend and frontend dev servers.

## Demo Accounts

- Student: `2024-0001` / `Student123!`
- Student: `2024-0002` / `Student123!`
- OGC facilitator: `ogc1@spartang.edu` / `Facilitator123!`