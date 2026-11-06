# HMI-ASRS-V2

HMI application for an automated storage and retrieval system.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, TypeScript, Express
- Database: PostgreSQL
- Docker Compose

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Run Backend

```powershell
cd backend
npm install
npm run dev
```

## Event CSV ingestion

The backend scans `data/event-inbox` every five minutes and imports settled
`.csv` files. Successful files move to `processed`; invalid files move to
`failed`. Identical file contents are imported only once.

Set `EVENT_CSV_INBOX` in the root `.env` file to use a different local, SFTP,
or shared-folder path. Upload files with a temporary extension and rename them
to `.csv` only after the upload finishes.

The latest successful import is available at:

```text
GET /api/events/ingestion/status
```
