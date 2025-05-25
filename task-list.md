# LoadForge MVP Task List

> **Note:** Repository scaffold already exists. Start from here.

---

## 1. Backend – High-Volume Load Engine

- [x] **Install core dependencies**  
  `npm i fastify fastify-multipart socket.io autocannon worker_threads mongoose gridfs-stream zod`

- [x] **Environment config**  
  Define `.env` with keys:
  - `PORT`
  - `MONGO_URI`
  - `MAX_WORKERS`
  - `MAX_SOCKETS`

- [x] **Mongoose models**  
  - `Spec`: includes name, request object, loadProfile, attachmentId, timestamps  
  - `Run`: specId, status, timestamps, summary, progress metrics

- [x] **GridFS helper module**  
  - Save and retrieve attachments (up to 25MB) using MongoDB GridFS

- [x] **Worker script `loadWorker.ts`**  
  - Receives spec via `parentPort`  
  - Translates ramp profile into Autocannon config  
  - Emits `{ progress, logLine }` events to parent every second  
  - Sends final summary on exit

- [x] **RunManager class**  
  - `startRun(specId)` → Forks worker, stores `Run` document  
  - `stopRun(runId)` → Kills worker, marks run stopped  
  - `listActive()` → Lists in-memory active runs

- [x] **API routes**  
  - `POST /runs/:specId` → Start a new run  
  - `DELETE /runs/:id` → Stop an existing run  
  - `GET /specs`, `POST /specs`, `PUT /specs/:id`, `DELETE /specs/:id` → CRUD operations  
  - `POST /attachments` → Upload file stream to GridFS

- [x] **WebSocket integration**  
  - Namespace `/runs`  
  - Clients join room `runId`  
  - Emit `progress` and `logLine` events from worker to clients

- [ ] **Performance test**  
  - Run test: 10,000 req/s to `http://localhost:8080/anything`  
  - Validate CPU < 80%, no worker crash

---

## 2. Frontend – Spec Builder & Live Console

- [x] **Install dependencies**  
  `npm i @mui/material @mui/icons-material react-router-dom socket.io-client recharts formik yup`

- [x] **Axios setup**  
  - Global instance with base URL `/api` and basic error handling

- [x] **Spec List page**  
  - Table with: name, method, URL, last run, actions (edit, run, delete)

- [x] **Spec Editor page**  
  - **Request form**: method select, URL input, headers key/value grid, body text or file upload  
  - **Load profile form**: inputs for rampUp, users, steady, rampDown seconds  
  - **Graph**: Preview using Recharts  
  - Save spec → `PUT /specs/:id`

- [x] **Run Dashboard page**  
  - Stats: RPS, success, fail, p50/p95 latency  
  - Console: auto-scrolling, virtualized list of log lines  
  - Stop button → `DELETE /runs/:id`

- [ ] **File attachment flow**  
  - File drag-and-drop/upload  
  - Save to `/attachments` and link `attachmentId`

- [x] **Routing setup**  
  - Routes: `/specs`, `/specs/:id/edit`, `/runs/:id`

---

## 3. Scheduling (Optional for MVP)

- [ ] Stub cron input in Spec Editor (disabled for now)
- [ ] Backend placeholder: `POST /schedules` stores cron string + specId

---

## 4. Basic Reporting

- [ ] On run completion, compute summary (totals, percentiles)
- [ ] Persist to `Run.summary`
- [ ] CSV download endpoint `/runs/:id/csv` using `fast-csv`

---

## 5. QA / Manual Testing

- [ ] Jest unit tests: Spec validation, RunManager state
- [ ] Vitest test: Spec Editor renders and saves correctly
- [ ] Manual test:
  - Create a spec
  - Upload 25MB file
  - Run 500 users for 30 seconds
  - Validate console logs, chart updates, and CSV downloads

---

**End of MVP Task List**

Optional next phase: auth, cron execution, PDF export, multi-agent scaling, k8s Helm support.
