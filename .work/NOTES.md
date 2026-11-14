# Task notes (RCPT)

## Sources
- Portfolio docx text: .work/docx/portfolio.txt (from C:\Users\Yassine\Downloads\RCPT_Project_Portfolio (1).docx)
- Electron shell code: C:\Users\Yassine\Desktop\rcpt-all-code (1).txt
  - preload exposes window.novaBridge = { chat(req), hasKey(), saveKey(k), clearKey(), spaceWeather(refresh) }
  - chat(req): req = {endpoint, model, messages, tools}; returns {ok, text, toolCalls:[{name,args}]} or {ok:false,error}
  - hasKey -> {has, encrypted}
  - spaceWeather(refresh) -> record {kind:'live'|'cache'|'bundled', fetchedAt, observedAt, satellite, flux10, flux100, flux10max24, sScale, sScaleMax24, assumedDose, series:[[time_tag, flux]], error?}
  - BUNDLED = {kind:'bundled', flux10:0.3, flux100:0.02, flux10max24:0.3, sScale:0, sScaleMax24:0, assumedDose:0.5, series:[]}
  - NOAA URL https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json ; parse: energy '>=10 MeV', '>=100 MeV'; series downsampled to <=288 pts
  - assumedDose(pfu): 0.5 + (log10(max(pfu,0.01)) - 1)*6, min 0.05, rounded 0.1
- New frontend source: C:\Users\Yassine\Downloads\RCPT-v1_8_bilingual-tour (2).html (copy at .work/rcpt-new.html, 1,173,738 bytes, has CSP meta)
- Old installer html (same size) at .work/rcpt/RCPT-1.8-Installer/payload/app/app/index.html ; extracted scripts in .work/html/
  - window.RCPT API: M, ELEV, tierOf, getState() -> {d,h,s,R,lo,hi,fr,fh,fs,it,tier,protocol,actions,running,clock}, setInputs({d,h,s}), setScenario('nominal'|'sleep_deprived'|'acute_spe'), runSim, stopSim, onUpdate(fn)
  - Data panel uses window.novaBridge.spaceWeather; event 'rcpt:swx'; 'rcpt:launch' on start

## Backend (Backend/server)
- Express 5 ESM, pg pool via .env DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, NVIDIA_API_KEY, NVIDIA_MODEL (google/gemma-4-31b-it), PORT 5000
- Endpoints: GET /api/dashboard/:id, POST /api/readings, POST /api/chat, PATCH /api/alerts/:id/resolve, GET /api/space-weather/sync
- rag.js: initKnowledgeBase(folder), searchKnowledge(query, k) -> text ; knowledge/nasa_csa_astronaut_health.md
- Tables: astronauts, sensor_readings, alerts, protocols(condition_code DOSE_LIMIT_EXCEEDED/SOLAR_FLARE_SPE/ELEVATED_RATE), ai_chat_logs

## Plan (user, 09:02): delete React frontend; frontend = the HTML file unchanged UI; wire variable data to backend
- Frontend/index.html (+ rcpt-backend.js bridge) served by backend express.static
- Backend: /api/space-weather (swx shape), /api/nova/chat (OpenAI-compatible proxy + RAG), /api/nova/status|key, twin state push -> readings
- Backup of old React src before deleting -> .work/backup

## Status 09:19
DONE: React frontend backed up to .work/backup/nasaproct-react-frontend.zip and deleted (only one locked file remains: Frontend/nasaproct/node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node, held by the user's old vite started 07:10).
Frontend now = Frontend/index.html (user's RCPT html + 2 script tags after NOVA_CONFIG) + Frontend/rcpt-backend.js. Build script: .work/scripts/build-frontend.mjs <html> Frontend
Backend: new swx.js, nova.js; server.js routes /api/bootstrap.js, /api/health, /api/nova/key (GET/POST/DELETE), /api/nova/chat (origin guard), /api/space-weather?refresh=, static Frontend; dashboard chat query fixed to latest 30; rag minScore; db.js connectionTimeoutMillis + pool error handler.
User's nodemon on :5000 already runs the new code. smoke test .work/scripts/smoke.mjs: 10/10 PASS (NIM chat ~57 s latency). Headless Edge (flags --in-process-gpu --disable-gpu --no-sandbox) dump-dom confirms habitat panel online with Commander Yassine.
Facts: DB astronauts: 1 row (Commander Yassine, Mission Specialist, O+, 50 mSv). protocols: ELEVATED_RATE WARNING, SOLAR_FLARE_SPE CRITICAL, DOSE_LIMIT_EXCEEDED CRITICAL. NOAA at 09:17: flux10 0.24 pfu S0.
TODO: CDP screenshot after clicking #launch, console error check; README/start script; final answer.

## Status 09:59
- Google Gemini OpenAI-compat: base https://generativelanguage.googleapis.com/v1beta/openai/ (chat/completions, Bearer key). Source https://aistudio.google.com/docs/openai . reasoning_effort minimal/low/medium/high; thinking can't be disabled on Gemini 3/4.
- Models (https://aistudio.google.com/docs/models, Nov 2026): gemini-4-carbon, gemini-4-argon, gemini-4-hydrogen; gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-flash-lite (fast, stable, July 2026), gemini-3.1-flash-lite, gemini-3-flash-preview, gemini-3.1-pro-preview. gemini-2.5-flash deprecated (routes to 3.5-flash-lite from Dec 1 2026).
- Dummy-key test: Google returned 400 "Please pass a valid API key" -> endpoint OK. User has NOT yet added GOOGLE_API_KEY (.env line empty) -> server still on NVIDIA; NVIDIA direct call timed out at 150 s (provider down).
- nova.js rewritten (providers google/nvidia, activeProvider(), model fallback on 404/429, isManagedEndpoint). server.js askSpaceAI + /api/nova/chat use activeProvider. Backend/server/nodemon.json ignores .data.
- User palette: #1B365D navy, #005A9C blue, #60C1E5 sky, #A0E0EF aqua. Applied via .work/scripts/palette.mjs (build-time map, 256 replacements, logo SVG recoloured) + Frontend/rcpt-theme.css (linked before </head>). Status colours kept. Screens in .work/shots/palette.
- Simulator: Backend/server/simulator.js posts 3 readings (45.2 / 310.5 / 1450 uSv/h) to hard-coded http://localhost:5000/api/readings.
- PostgreSQL service: postgresql-x64-18, Running, Automatic.
- NOW: writing root launcher run-all.mjs + "Start RCPT.bat" + root package.json.
