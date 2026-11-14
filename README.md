# RCPT – Radiation-Coupled Physiological Twin

The frontend is the RCPT v1.8 single-file app (`Frontend/index.html`). The Express + PostgreSQL backend in `Backend/server` serves it. Everything runs from one server and one URL.

## Run

Double-click **`Start RCPT.bat`** in the project folder. Or, from a terminal in the project folder:

```powershell
npm start          # same as: node run-all.mjs
npm run demo       # also runs the wearable simulator once (radiation alerts demo)
npm run dev        # restarts the server automatically when you edit backend code
```

`run-all.mjs` does everything in order:

1. Checks Node.js, and creates `Backend/server/.env` from `.env.example` if it is missing.
2. Runs `npm install` the first time.
3. Checks PostgreSQL and tries to start the Windows service if it's stopped. Then it creates the database, tables and starting data if they're missing (`Backend/server/setup-db.js`, using `database/schema.sql` and `database/seed.sql`). It never deletes or overwrites data.
4. Starts the backend, which also serves the website, waits until it answers, and opens **http://localhost:5000/**.

While it runs, type a letter and press Enter: `s` runs the wearable simulator, `o` opens the website, `r` restarts the server (after editing `.env`), and `q` quits. Ctrl+C or closing the window also stops everything.

Other options: `--port 5050`, `--no-browser`, `--skip-db`, `--help`. If RCPT is already running in another window, the launcher reuses that server.

To run the parts by hand instead: `cd Backend\server`, then `npm install`, `node setup-db.js` and `npm run dev`. To trigger alerts, run `node simulator.js` in a second terminal.

## What the backend provides to the page

| Feature in the page | Backend route | Data source |
|---|---|---|
| Nova companion, Enhanced mode | `POST /api/nova/chat` | Google Gemini (`GOOGLE_API_KEY`, `GOOGLE_MODEL` in `.env`; NVIDIA used while no Google key is set) + NASA/CSA knowledge base + latest DB reading/alert; messages logged to `ai_chat_logs` |
| Nova Settings → API key | `GET/POST/DELETE /api/nova/key` | Held in server memory only; `.env` key used by default |
| Data & Validation → space weather | `GET /api/space-weather?refresh=0/1` | NOAA GOES live proton flux, cached in `.data/swx-cache.json`, stored as a `NOAA_LIVE` reading |
| Crew & Missions roster, Nova's name for you | `GET /api/bootstrap.js` | `astronauts` table |
| Habitat Link panel (sidebar) | `GET /api/dashboard/:id`, `POST /api/readings`, `PATCH /api/alerts/:id/resolve`, `GET /api/space-weather/sync` | `sensor_readings`, `alerts`, `protocols`, `ai_chat_logs` |
| Health check | `GET /api/health` | DB + AI availability |

## AI provider (Google Gemini)

In `Backend/server/.env`, put your key after `GOOGLE_API_KEY=` and restart the server. In the nodemon terminal, type `rs` and press Enter; nodemon does not restart by itself when `.env` changes.

- `GOOGLE_MODEL` defaults to `gemini-3.5-flash-lite`, which is fast. For better answers with slower replies, use `gemini-3.8-flash` or `gemini-4-hydrogen`. If a model is not available for your key, or is out of quota, the server tries the next one automatically.
- `GOOGLE_REASONING_EFFORT` defaults to `low`, which keeps Nova's replies quick.
- `AI_PROVIDER=google` or `AI_PROVIDER=nvidia` forces a provider. Without it, Google is used whenever a Google key is set.
- To check which provider is active, open `http://localhost:5000/api/health`.

The provider is used both for Nova's chat and for the automatic alert messages.

The page's Content-Security-Policy only allows same-origin requests (`default-src 'self'`). That is why the backend serves both the page and the API.

The Nova key/chat routes only accept requests whose `Origin` is this server (add more in `.env` with `ALLOWED_ORIGINS=http://host:port,...`). Other websites therefore can't use your API key.

## Updating the frontend from a new RCPT HTML export

```powershell
node .work\scripts\build-frontend.mjs "C:\path\to\RCPT-new.html" Frontend
```

This copies the HTML unchanged and inserts two script tags right after `window.NOVA_CONFIG`: `/api/bootstrap.js` and `rcpt-backend.js`. `Frontend/rcpt-backend.js` is the bridge. It replaces the desktop app's `window.novaBridge` IPC with HTTP calls and adds the Habitat Link panel.

## Colour palette

The main palette is `#1B365D` (navy), `#005A9C` (blue), `#60C1E5` (sky) and `#A0E0EF` (aqua). Two files apply it:

- `Frontend/rcpt-theme.css` styles the background, sidebar, buttons, sliders, form fields and focus outlines. Edit this file to adjust them.
- `.work/scripts/palette.mjs` maps the original greys and cyan to palette shades during the build. It covers the CSS, the chart drawing code and the logo.

The red, amber and green risk colours (emergency, elevated, nominal) and the Mars map colours are kept on purpose. To build without the palette, add `--no-theme` to the build command.

## Notes

- All physiological values in the twin are simulated. This is a research prototype, not a medical device, and is not affiliated with NASA.
- The previous React frontend (`Frontend/nasaproct`) was removed. A source backup is in `.work/backup/nasaproct-react-frontend.zip`.
