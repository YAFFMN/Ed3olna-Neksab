--
-- PostgreSQL database dump
--

\restrict dTeMZwfimtioYQlE1bYLDULwAA0mSeIvJ9ZWMwHxUAHoLEKR4eMAsDjNHjbvase

-- Dumped from database version 18.7
-- Dumped by pg_dump version 18.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: astronauts; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.astronauts (id, full_name, mission_role, blood_type, safe_dose_limit_msv, created_at) VALUES (1, 'Commander Yassine', 'Mission Specialist', 'O+', 50.000, '2026-11-13 20:35:15.733437+02');


--
-- Data for Name: protocols; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.protocols (id, condition_code, severity, title, action_steps) VALUES (1, 'ELEVATED_RATE', 'WARNING', 'Elevated Radiation Rate Detected', '1. Monitor dosimeter every 15 minutes. 2. Avoid EVA (spacewalk) activities. 3. Increase hydration and log any nausea or fatigue.');
INSERT INTO public.protocols (id, condition_code, severity, title, action_steps) VALUES (2, 'SOLAR_FLARE_SPE', 'CRITICAL', 'Solar Particle Event (SPE) - Immediate Shelter Required', '1. Move immediately to the heavily shielded storm shelter (water-wall module). 2. Remain inside until ground control clears the storm. 3. Take radioprotective potassium iodide if instructed.');
INSERT INTO public.protocols (id, condition_code, severity, title, action_steps) VALUES (3, 'DOSE_LIMIT_EXCEEDED', 'CRITICAL', 'Cumulative Safe Radiation Limit Exceeded', '1. Cease all non-essential tasks immediately. 2. Relocate to lowest-radiation sleep quarters. 3. Initiate AI medical assessment and notify Flight Surgeon.');


--
-- Name: astronauts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.astronauts_id_seq', 1, true);


--
-- Name: protocols_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.protocols_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--

\unrestrict dTeMZwfimtioYQlE1bYLDULwAA0mSeIvJ9ZWMwHxUAHoLEKR4eMAsDjNHjbvase

