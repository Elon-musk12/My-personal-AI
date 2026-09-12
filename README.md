GEL Backend — Render Blueprint

IMPORTANT FOLDER STRUCTURE
--------------------------
This package is intentionally flat at the repository root.

render.yaml
package.json
schema.sql
.env.example
.gitignore
src/
  auth.js
  db.js
  server.js

Do NOT put these files inside another GEL_Backend/ or backend/ folder.

RENDER
------
1. Push the contents of this folder directly to the main branch.
2. In Render, create a Blueprint from that repository.
3. Render should automatically detect render.yaml at the root.
4. Set FRONTEND_ORIGINS to your deployed frontend origin.

DATABASE
--------
The Render Blueprint creates the gel-postgres database and passes its
connection string to the backend as DATABASE_URL.

SECURITY
--------
Never commit .env or real API keys/passwords to GitHub.
