--
-- PostgreSQL database dump
--

\restrict hWiWbViJzFZxbbcNQzTxySOwrNv8VQJXGNM0XgwQImtsDyMU6pBrh4p2HnHUGXE

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_chat_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_logs (
    id bigint NOT NULL,
    astronaut_id integer,
    alert_id integer,
    sender character varying(20) NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ai_chat_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_chat_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_chat_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_chat_logs_id_seq OWNED BY public.ai_chat_logs.id;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    astronaut_id integer,
    reading_id bigint,
    protocol_id integer,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    triggered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: astronauts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.astronauts (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    mission_role character varying(50),
    blood_type character varying(5),
    safe_dose_limit_msv numeric(8,3) DEFAULT 50.000,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: astronauts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.astronauts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: astronauts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.astronauts_id_seq OWNED BY public.astronauts.id;


--
-- Name: protocols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.protocols (
    id integer NOT NULL,
    condition_code character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    title character varying(150) NOT NULL,
    action_steps text NOT NULL
);


--
-- Name: protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.protocols_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: protocols_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.protocols_id_seq OWNED BY public.protocols.id;


--
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensor_readings (
    id bigint NOT NULL,
    astronaut_id integer,
    radiation_rate_usv_hr numeric(10,4) NOT NULL,
    cumulative_dose_msv numeric(10,4) NOT NULL,
    radiation_type character varying(30),
    heart_rate_bpm integer,
    recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    proton_flux_10mev numeric(12,4),
    proton_flux_100mev numeric(12,4),
    noaa_s_scale integer DEFAULT 0,
    data_source character varying(30) DEFAULT 'WEARABLE'::character varying
);


--
-- Name: sensor_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sensor_readings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sensor_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sensor_readings_id_seq OWNED BY public.sensor_readings.id;


--
-- Name: ai_chat_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_logs_id_seq'::regclass);


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: astronauts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.astronauts ALTER COLUMN id SET DEFAULT nextval('public.astronauts_id_seq'::regclass);


--
-- Name: protocols id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocols ALTER COLUMN id SET DEFAULT nextval('public.protocols_id_seq'::regclass);


--
-- Name: sensor_readings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor_readings ALTER COLUMN id SET DEFAULT nextval('public.sensor_readings_id_seq'::regclass);


--
-- Name: ai_chat_logs ai_chat_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_logs
    ADD CONSTRAINT ai_chat_logs_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: astronauts astronauts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.astronauts
    ADD CONSTRAINT astronauts_pkey PRIMARY KEY (id);


--
-- Name: protocols protocols_condition_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocols
    ADD CONSTRAINT protocols_condition_code_key UNIQUE (condition_code);


--
-- Name: protocols protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocols
    ADD CONSTRAINT protocols_pkey PRIMARY KEY (id);


--
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (id);


--
-- Name: idx_readings_astronaut_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readings_astronaut_time ON public.sensor_readings USING btree (astronaut_id, recorded_at DESC);


--
-- Name: ai_chat_logs ai_chat_logs_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_logs
    ADD CONSTRAINT ai_chat_logs_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE SET NULL;


--
-- Name: ai_chat_logs ai_chat_logs_astronaut_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_logs
    ADD CONSTRAINT ai_chat_logs_astronaut_id_fkey FOREIGN KEY (astronaut_id) REFERENCES public.astronauts(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_astronaut_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_astronaut_id_fkey FOREIGN KEY (astronaut_id) REFERENCES public.astronauts(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_protocol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.protocols(id);


--
-- Name: alerts alerts_reading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_reading_id_fkey FOREIGN KEY (reading_id) REFERENCES public.sensor_readings(id);


--
-- Name: sensor_readings sensor_readings_astronaut_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_astronaut_id_fkey FOREIGN KEY (astronaut_id) REFERENCES public.astronauts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hWiWbViJzFZxbbcNQzTxySOwrNv8VQJXGNM0XgwQImtsDyMU6pBrh4p2HnHUGXE

