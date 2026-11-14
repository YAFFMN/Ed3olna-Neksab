# Ed3olna Neksab — Radiation-Coupled Physiological Twin

An offline-first, single-file web app that shows how space radiation, heart-rate variability (HRV) and sleep debt combine into one crew health risk score during a Moon-to-Mars mission.

> **Research prototype, not a medical device.** All crew data in the app is simulated or assumed. The project is independent and is not affiliated with or endorsed by NASA.

**How to run:** double-click `Frontend/index.html`. No server, no install, no internet needed.

---

## Table of contents

1. [Problem statement](#1-problem-statement)
2. [Solution idea](#2-solution-idea)
3. [Screenshots](#3-screenshots)
4. [File directory](#4-file-directory)
5. [Test results](#5-test-results)
6. [Conclusion](#6-conclusion)
7. [Impact](#7-impact)

---

## 1. Problem statement

On deep-space missions, crews face several health stressors at the same time:

- **Radiation.** Galactic cosmic rays are constant, and solar particle events (radiation storms) can raise the dose rate sharply within hours.
- **Physiological strain.** Falling HRV is a sign of autonomic stress.
- **Sleep debt.** It builds up under heavy workloads and reduces resilience.

Current monitoring tends to treat these as separate numbers. The risk is that they interact: a crew member who is already sleep-deprived and stressed is more vulnerable when a storm hits than the radiation number alone suggests.

There is also a communication problem. On Mars-distance missions, a round trip to Earth can take tens of minutes (the app simulates a 19 min 42 s delay), so the crew cannot wait for ground control to interpret every reading. Tools must work **locally and offline**, and must be honest about what is measured and what is assumed.

## 2. Solution idea

Ed3olna Neksab is a "digital twin" of the crew's combined risk that runs entirely in the browser.

**Core model.** One index, `R_MRP` (Multi-System Risk, 0–100), combines the three inputs:

```
R = clip( 0.40·f_rad + 0.35·f_hrv + 0.25·f_sleep
          + 0.05·dose·sleepDebt + 0.03·dose·f_hrv , 0, 100 )

f_rad   = 100 · (1 − exp(−0.08 · dose))
f_hrv   = 100 · max(0, (70 − HRV) / 70)
f_sleep = min(100, 12.5 · sleepDebt)
```

The last two terms are the **non-linear interaction**: radiation hurts more when sleep debt or HRV strain is already high. A confidence band is shown with every score. Tiers are **nominal**, **elevated** (R ≥ 35) and **emergency** (R ≥ 70, or dose ≥ 10 mSv/hr).

**What the app offers**

| Area | What it does |
|---|---|
| Dashboard | Three sliders (dose rate, HRV, sleep debt), live risk score, risk trajectory chart, and a dose × HRV risk-surface heatmap |
| 40 h SPE simulation | Runs a simulated solar particle event and shows how risk evolves |
| Nova companion | An offline rule-based assistant that explains the numbers and warns when the tier changes. An optional "Enhanced" mode can call an OpenAI-compatible endpoint such as a local Ollama |
| Data & Validation | Compares the model with published Mars data, runs sensitivity analysis, shows a NOAA space-weather panel, and lists sources |
| Orion atlas | Stylised Mars terrain and a game; a real elevation grid can be imported |
| Crew, Teach, Emergency Simulator, Demo Mode | Crew roster, teaching panels, scripted emergencies, and a 90-second demo story |
| Reports | Export a mission report or the data as JSON |
| Languages | English, Arabic (right-to-left) and Spanish |

**Honesty by design.** Every value is labelled as simulated, assumed, live, cached or bundled. The Validation tab shows where the model is weak, and the physiological weights are stated to be unvalidated.

## 3. Screenshots

Captured from this exact `index.html` (headless Chromium, 1440×900).

**Splash screen**

![Splash screen](screenshots/01-splash.png)

**Nominal orbit** (0.5 mSv/hr, HRV 65 ms, sleep debt 1 h → R = 7.3, nominal)

![Nominal dashboard](screenshots/02-dashboard-nominal.png)

**Sleep deprived + high workload** (1.2 mSv/hr, HRV 38 ms, sleep debt 5.5 h → R = 38.8, elevated)

![Elevated dashboard](screenshots/03-sleep-deprived-elevated.png)

**Acute solar particle event** (18.5 mSv/hr, HRV 42 ms, sleep debt 4 h → R = 83.3, emergency)

![Emergency dashboard](screenshots/04-acute-spe-emergency.png)

**Data & Validation → Space weather** (offline, showing the labelled bundled reference)

![Data and validation](screenshots/05-data-validation-space-weather.png)

**Adding or updating screenshots**

The images are loaded from the `screenshots/` folder, which must sit next to `README.md`. To add one, put the PNG in that folder and add a line like this where you want it:

```markdown
![Short description](screenshots/06-my-new-shot.png)
```

- Use the same folder name and letter case (`screenshots`), because GitHub is case-sensitive.
- Avoid spaces in file names.
- To resize an image, use HTML instead: `<img src="screenshots/01-splash.png" width="600" alt="Splash screen">`.

## 4. File directory

```
Ed3olna-Neksab/
├── README.md                     This file
├── screenshots/
│   ├── 01-splash.png
│   ├── 02-dashboard-nominal.png
│   ├── 03-sleep-deprived-elevated.png
│   ├── 04-acute-spe-emergency.png
│   └── 05-data-validation-space-weather.png
└── Frontend/
    ├── index.html                The whole app: HTML, CSS, JavaScript, logos and the offline bridge (~1.1 MB)
    ├── rcpt-backend.js           Original file, now merged into index.html (no longer needed)
    └── rcpt-theme.css            Original file, now merged into index.html (no longer needed)
```

Only `Frontend/index.html` is needed to run the app. The two original files are kept in the folder for reference and can be deleted.

**What was merged into `index.html`**

| Original file | What happened |
|---|---|
| `rcpt-theme.css` | Inlined into a `<style>` block (navy / blue / sky palette) |
| `rcpt-backend.js` | Replaced by a small in-browser bridge (`window.novaBridge`) that needs no server |
| `/api/bootstrap.js` | Removed (it only supplied crew names and AI settings from the old database) |
| Habitat Link panel | Removed, because it only showed data from the old PostgreSQL backend |

The Express server, the database, `package.json` and `run-all.mjs` from the original full-stack project are **not needed** any more.

**Network behaviour.** Nothing is contacted when the page loads. Two optional features can use the network, and only on a user action:

- **NOAA proton flux:** pressing "Fetch latest from NOAA now" in Data & Validation reads one public JSON file from `services.swpc.noaa.gov`. A successful fetch is cached in `localStorage`. If the fetch fails, the panel shows the cached copy, or a labelled bundled quiet-time reference.
- **Nova Enhanced mode:** calls the endpoint set in Settings (default `http://localhost:11434`, for Ollama). Any API key is kept in memory for the session only and is never written to storage.

The page's Content-Security-Policy allows connections only to `self`, `services.swpc.noaa.gov`, `localhost` and `127.0.0.1`.

## 5. Test results

Automated checks were run in headless Chromium (Playwright), loading the page from `file://` with no server. Bridge tests used mocked network replies, because the test environment has no access to NOAA.

| # | Test | Result |
|---|---|---|
| 1 | Page loads from `file://` with no console or page errors | **Pass** (0 errors) |
| 2 | Network requests at load | **Pass** (only `index.html` itself, no external files) |
| 3 | Mobile width (390 px): no horizontal overflow | **Pass** (scroll width 390 = viewport 390) |
| 4 | Risk model vs. an independent re-implementation of the formula, 3 presets | **Pass** (max difference 1.4 × 10⁻¹⁴) |
| 5 | Model self-check over 2,310 input combinations (dose × HRV × sleep) | **Pass** (worst difference 1.4 × 10⁻¹⁴) |
| 6 | Tier assignment for the 3 presets | **Pass** (nominal, elevated, emergency as expected) |
| 7 | Space weather, no network: shows the bundled reference, labelled "not live" | **Pass** |
| 8 | Space weather, mocked NOAA reply: badge "LIVE", S-scale and assumed dose computed | **Pass** (flux 15 pfu → S1; 24 h max 120 pfu → S2; assumed 1.6 mSv/hr) |
| 9 | Space weather, fetch fails with a saved copy: falls back to the cache and shows the error | **Pass** |
| 10 | Space weather, fetch fails with no saved copy: falls back to the bundled reference | **Pass** |
| 11 | Space weather, HTTP 503 and malformed JSON: handled without crashing | **Pass** |
| 12 | Nova Enhanced mode, unreachable endpoint: returns a clean error, so Nova falls back to offline answers | **Pass** |
| 13 | Nova Enhanced mode, mocked OpenAI-style reply: text and tool call parsed | **Pass** |
| 14 | API key kept in memory only (save, check, clear; nothing in `localStorage`) | **Pass** |
| 15 | Language switch: English, Arabic (RTL), Spanish | **Pass** |

**Risk score results** (page output = independent recomputation):

| Scenario | Dose (mSv/hr) | HRV (ms) | Sleep debt (h) | R_MRP | Confidence band | Tier |
|---|---|---|---|---|---|---|
| Nominal Orbit | 0.5 | 65 | 1.0 | 7.33 | 3.1 – 12.1 | nominal |
| Sleep Deprived + High Workload | 1.2 | 38 | 5.5 | 38.83 | 34.6 – 43.6 | elevated |
| Acute SPE | 18.5 | 42 | 4.0 | 83.29 | 79.1 – 88.1 | emergency |

**Validation against published Mars data** (from the app's built-in Validation tab):

| Check | Model | Reference | Verdict |
|---|---|---|---|
| Surface dose at Gale crater | 0.640 mSv/day | 0.64 ± 0.12 (Curiosity RAD, Hassler et al. 2014) | Within the published spread |
| Surface dose vs. annual average | 0.640 mSv/day | 0.70 (Guo et al. 2015) | 8.6 % lower |
| Dose change from the seasonal pressure swing (700 → 970 Pa) | 0.050 mSv/day | about 0.10 | **Model captures about half of the effect** |
| Interplanetary cruise estimate | 1.86 mSv/day | 1.84 (Zeitlin et al. 2013) | Ratio 1.01 |

**Known limits of these tests**

- The live NOAA path was tested against mocked data, not the real feed, so please press the fetch button once on a connected machine to confirm it.
- Enhanced mode was tested against a mocked endpoint, not a real Ollama server.
- The physiological weights (0.40, 0.35, 0.25 and the interaction terms) are **not clinically validated**. The tests check that the code implements the stated model correctly, not that the model predicts real crew outcomes.

## 6. Conclusion

Ed3olna Neksab shows that a combined, transparent crew-risk index can run entirely offline in a single HTML file, and still explain itself. The code reproduces its documented formula exactly, matches published Curiosity dose measurements within their stated spread, and degrades gracefully when the network, the NOAA feed or an AI endpoint is unavailable.

The main weaknesses are the unvalidated physiological weights and the pressure-effect mismatch above. The next steps are to calibrate the weights against real data (for example from analog missions or wearables), and to improve the atmospheric-pressure term in the dose model.

## 7. Impact

- **Crew autonomy.** The tool works with no connection, which matches the communication delays of Moon-to-Mars missions.
- **Shared understanding.** One score, a confidence band, and plain explanations make it easier for a crew to discuss when to shelter, rest, or reduce workload.
- **Transparency.** Showing the inputs, the formula, the validation gaps and the data source labels helps users avoid over-trusting a simulation.
- **Education and outreach.** The Teach panels, the guided tours (English and Arabic), the demo mode and the Spanish translation make the concept accessible to students and the public.
- **Easy to share.** One file, no installation: it can be opened on almost any laptop, even in places with poor internet.

This is a concept and teaching prototype. Using it for real medical or operational decisions would require clinical validation and independent review.
