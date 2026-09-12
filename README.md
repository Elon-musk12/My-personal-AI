# GEL — Personal AI

This repository contains the GEL frontend and Node.js backend in one repository.

## IMPORTANT: Root structure

`render.yaml` is intentionally at the ROOT of this repository so Render can detect it:

```text
My-personal-AI/
├── render.yaml
├── package.json
├── schema.sql
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── auth.js
│   ├── db.js
│   └── server.js
├── index.html
├── login.html
├── app.js
└── styles.css
```

Do NOT move `render.yaml` into `backend/`, `GEL_Backend/`, or another nested folder.

## GitHub Desktop

1. Extract this ZIP.
2. Copy the CONTENTS of this folder into your existing `My-personal-AI` repository.
3. Allow replacement of existing frontend files if prompted.
4. Open GitHub Desktop.
5. Confirm the changes are on the `main` branch.
6. Commit the changes.
7. Push origin.

After pushing, open the GitHub repository in your browser. You should see `render.yaml` directly beside `package.json` and `index.html`.

## Render

Create/select the Blueprint from the `main` branch. Render should detect the root-level `render.yaml`.

The Blueprint creates:
- GEL Node/Express web service
- PostgreSQL database
- generated JWT secret

You will need to set `FRONTEND_ORIGINS` in Render to the URL where the frontend is hosted.

## Security

Never commit `.env`, real passwords, or API keys to GitHub. Use Render environment variables for secrets.

## Current status

The backend provides:
- Register
- Login
- HttpOnly session cookie
- Maximum 4 active devices
- Device listing
- Device revocation
- Logout
- Logout-all
- `/health`

The current frontend files are included as the frontend foundation. The frontend prototype may still contain local/prototype behavior; backend-connected features should be wired up as the next integration step.
