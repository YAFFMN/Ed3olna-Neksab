-- RCPT habitat database (PostgreSQL)
-- Safe to run any number of times: it only creates what is missing and never deletes data.
-- Applied automatically by setup-db.js (the launcher runs it on every start).

CREATE TABLE IF NOT EXISTS astronauts (
    id                  SERIAL PRIMARY KEY,
    full_name           VARCHAR(100) NOT NULL,
    mission_role        VARCHAR(50),
    blood_type          VARCHAR(5),
    safe_dose_limit_msv NUMERIC(8,3) DEFAULT 50.000,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS protocols (
    id             SERIAL PRIMARY KEY,
    condition_code VARCHAR(50) NOT NULL UNIQUE,
    severity       VARCHAR(20) NOT NULL,
    title          VARCHAR(150) NOT NULL,
    action_steps   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id                    BIGSERIAL PRIMARY KEY,
    astronaut_id          INTEGER REFERENCES astronauts(id) ON DELETE CASCADE,
    radiation_rate_usv_hr NUMERIC(10,4) NOT NULL,
    cumulative_dose_msv   NUMERIC(10,4) NOT NULL,
    radiation_type        VARCHAR(30),
    heart_rate_bpm        INTEGER,
    recorded_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    proton_flux_10mev     NUMERIC(12,4),
    proton_flux_100mev    NUMERIC(12,4),
    noaa_s_scale          INTEGER DEFAULT 0,
    data_source           VARCHAR(30) DEFAULT 'WEARABLE'
);

-- Columns added after the first version of the table (no-op on an up-to-date database)
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS proton_flux_10mev  NUMERIC(12,4);
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS proton_flux_100mev NUMERIC(12,4);
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS noaa_s_scale       INTEGER DEFAULT 0;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS data_source        VARCHAR(30) DEFAULT 'WEARABLE';

CREATE INDEX IF NOT EXISTS idx_readings_astronaut_time ON sensor_readings (astronaut_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
    id           SERIAL PRIMARY KEY,
    astronaut_id INTEGER REFERENCES astronauts(id) ON DELETE CASCADE,
    reading_id   BIGINT REFERENCES sensor_readings(id),
    protocol_id  INTEGER REFERENCES protocols(id),
    status       VARCHAR(20) DEFAULT 'ACTIVE',
    triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id           BIGSERIAL PRIMARY KEY,
    astronaut_id INTEGER REFERENCES astronauts(id) ON DELETE CASCADE,
    alert_id     INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
    sender       VARCHAR(20) NOT NULL,
    message      TEXT NOT NULL,
    sent_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
