-- RCPT starting data: the commander and the three emergency protocols used by the alert engine.
-- Existing rows are never changed (ON CONFLICT DO NOTHING), so edits you make in the database are kept.

INSERT INTO astronauts (id, full_name, mission_role, blood_type, safe_dose_limit_msv)
VALUES (1, 'Commander Yassine', 'Mission Specialist', 'O+', 50.000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO protocols (id, condition_code, severity, title, action_steps) VALUES
(1, 'ELEVATED_RATE', 'WARNING', 'Elevated Radiation Rate Detected',
 '1. Monitor dosimeter every 15 minutes. 2. Avoid EVA (spacewalk) activities. 3. Increase hydration and log any nausea or fatigue.'),
(2, 'SOLAR_FLARE_SPE', 'CRITICAL', 'Solar Particle Event (SPE) - Immediate Shelter Required',
 '1. Move immediately to the heavily shielded storm shelter (water-wall module). 2. Remain inside until ground control clears the storm. 3. Take radioprotective potassium iodide if instructed.'),
(3, 'DOSE_LIMIT_EXCEEDED', 'CRITICAL', 'Cumulative Safe Radiation Limit Exceeded',
 '1. Cease all non-essential tasks immediately. 2. Relocate to lowest-radiation sleep quarters. 3. Initiate AI medical assessment and notify Flight Surgeon.')
ON CONFLICT DO NOTHING;

-- Keep the id counters ahead of the fixed ids above
SELECT setval(pg_get_serial_sequence('astronauts', 'id'), GREATEST((SELECT MAX(id) FROM astronauts), 1));
SELECT setval(pg_get_serial_sequence('protocols', 'id'), GREATEST((SELECT MAX(id) FROM protocols), 1));
