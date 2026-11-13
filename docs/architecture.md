# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route components focused on rendering. Use the shared API client for relative `/api` requests and show accessible loading, success, empty, and error states on each capability page.
- Logic tier decision: Keep request validation, business rules, and deliberate HTTP error responses in Express routes/services. Reject malformed or unknown references with 4xx responses rather than exposing database cast errors; do not add authentication.
- Data tier decision: Express required fields, references, and collection defaults in Mongoose schemas. Seed representative fixtures with stable-key upserts so reruns are idempotent and unrelated records are preserved.
- Activity tracking approach: Validate `userId` and `teamId` as well-formed IDs for existing records, then store them as the activity's `user` and `team` references along with `type` and `minutes`. Compute `points` from submitted minutes and set `occurredAt` on the server.
- Team management approach: List and create teams while preserving `name` and `mascot`; default `members` to an empty array and reject a missing name with `400`.
- Leaderboard approach: Sum activity points for each team, sort by total points descending, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email and use their most recent activity type to select a matching workout focus, falling back to their fitness goal when there is no activity. Include a reason tied to that activity or goal, and return a deliberate 4xx response when no user matches.

## Test plan

- Data tier: `npm run test:data --prefix octofit-tracker/backend` — checks schema validation and seeded data, including idempotency and preservation of unrelated records. A failure points to a model invariant or seed behavior.
- API logic tier: `npm run test:api --prefix octofit-tracker/backend` — checks request validation/status codes, activity and team behavior, leaderboard aggregation/ranking, and user-specific suggestions. A failure points to route/service behavior or its use of the models.
- Presentation tier: `npm test --prefix octofit-tracker/frontend` — checks API-driven content and accessible loading, empty, and error states. A failure points to API-client integration, route rendering, or UI state handling.
- Backend build: `npm run build --prefix octofit-tracker/backend` — type-checks backend code; a failure indicates a TypeScript or backend integration issue.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` — type-checks and bundles the UI; a failure indicates a TypeScript or Vite integration issue.
- Seed smoke check: with MongoDB running, run `npm run seed --prefix octofit-tracker/backend` twice; both runs should complete and the second should not duplicate fixtures or remove unrelated records.
- End-to-end smoke check: with MongoDB, the API, and Vite running on the documented ports, exercise all four pages through port `5173`, verify successful API-backed content, and trigger a visible error state. Also confirm `GET /api/activities` succeeds and an invalid activity POST returns a deliberate 4xx.
