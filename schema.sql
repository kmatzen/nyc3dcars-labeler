--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: approve_pair_answer; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE approve_pair_answer AS ENUM (
    'image1',
    'image2',
    'good',
    'bad'
);


ALTER TYPE public.approve_pair_answer OWNER TO postgres;

--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE assignment_status AS ENUM (
    'Submitted',
    'Approved',
    'Rejected',
    'Pending'
);


ALTER TYPE public.assignment_status OWNER TO postgres;

--
-- Name: day_night; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE day_night AS ENUM (
    'day',
    'night'
);


ALTER TYPE public.day_night OWNER TO postgres;

--
-- Name: hit_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE hit_status AS ENUM (
    'Submitted',
    'Approved',
    'Rejected'
);


ALTER TYPE public.hit_status OWNER TO postgres;

--
-- Name: labelertype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE labelertype AS ENUM (
    'nissan',
    'honda',
    'mazda',
    'gmc',
    'pickup',
    'jeep'
);


ALTER TYPE public.labelertype OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: annotations; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE annotations (
    id integer NOT NULL,
    uid integer NOT NULL,
    pid integer NOT NULL
);


ALTER TABLE public.annotations OWNER TO postgres;

--
-- Name: annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE annotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.annotations_id_seq OWNER TO postgres;

--
-- Name: annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE annotations_id_seq OWNED BY annotations.id;


--
-- Name: approve_pair_sessions; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE approve_pair_sessions (
    id integer NOT NULL,
    uid integer NOT NULL,
    creation timestamp without time zone NOT NULL,
    answer character varying NOT NULL,
    duration interval NOT NULL,
    asid integer
);


ALTER TABLE public.approve_pair_sessions OWNER TO postgres;

--
-- Name: approve_pair_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE approve_pair_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.approve_pair_sessions_id_seq OWNER TO postgres;

--
-- Name: approve_pair_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE approve_pair_sessions_id_seq OWNED BY approve_pair_sessions.id;


--
-- Name: approve_pair_to_vehicle_association; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE approve_pair_to_vehicle_association (
    id integer NOT NULL,
    vid integer NOT NULL,
    apsid integer NOT NULL
);


ALTER TABLE public.approve_pair_to_vehicle_association OWNER TO postgres;

--
-- Name: approve_pair_to_vehicle_association_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE approve_pair_to_vehicle_association_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.approve_pair_to_vehicle_association_id_seq OWNER TO postgres;

--
-- Name: approve_pair_to_vehicle_association_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE approve_pair_to_vehicle_association_id_seq OWNED BY approve_pair_to_vehicle_association.id;


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE assignments (
    id integer NOT NULL,
    uid integer NOT NULL,
    assignmentid character varying NOT NULL,
    hid integer NOT NULL,
    status assignment_status NOT NULL,
    abandoned boolean NOT NULL
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assignments_id_seq OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE assignments_id_seq OWNED BY assignments.id;


--
-- Name: bounding_box_sessions; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE bounding_box_sessions (
    id integer NOT NULL,
    uid integer NOT NULL,
    creation timestamp without time zone NOT NULL,
    x1 double precision NOT NULL,
    x2 double precision NOT NULL,
    y1 double precision NOT NULL,
    y2 double precision NOT NULL,
    duration interval NOT NULL,
    asid integer,
    vid integer NOT NULL
);


ALTER TABLE public.bounding_box_sessions OWNER TO postgres;

--
-- Name: bounding_box_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE bounding_box_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bounding_box_sessions_id_seq OWNER TO postgres;

--
-- Name: bounding_box_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE bounding_box_sessions_id_seq OWNED BY bounding_box_sessions.id;


--
-- Name: clickerhits; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE clickerhits (
    id integer NOT NULL,
    hitid character varying NOT NULL,
    pid integer NOT NULL,
    creation timestamp without time zone NOT NULL,
    lifetime interval NOT NULL,
    max_assignments integer NOT NULL,
    htid integer NOT NULL
);


ALTER TABLE public.clickerhits OWNER TO postgres;

--
-- Name: clickerhits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE clickerhits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clickerhits_id_seq OWNER TO postgres;

--
-- Name: clickerhits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE clickerhits_id_seq OWNED BY clickerhits.id;


--
-- Name: clicks; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE clicks (
    id integer NOT NULL,
    csid integer NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL
);


ALTER TABLE public.clicks OWNER TO postgres;

--
-- Name: clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE clicks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clicks_id_seq OWNER TO postgres;

--
-- Name: clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE clicks_id_seq OWNED BY clicks.id;


--
-- Name: clicksessions; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE clicksessions (
    id integer NOT NULL,
    uid integer NOT NULL,
    pid integer NOT NULL,
    creation timestamp without time zone NOT NULL,
    asid integer,
    duration interval
);


ALTER TABLE public.clicksessions OWNER TO postgres;

--
-- Name: clicksessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE clicksessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clicksessions_id_seq OWNER TO postgres;

--
-- Name: clicksessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE clicksessions_id_seq OWNED BY clicksessions.id;


--
-- Name: daynights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE daynights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.daynights_id_seq OWNER TO postgres;

--
-- Name: daynights; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE daynights (
    uid integer NOT NULL,
    pid integer NOT NULL,
    daynight day_night NOT NULL,
    id integer DEFAULT nextval('daynights_id_seq'::regclass) NOT NULL,
    creation timestamp without time zone NOT NULL,
    asid integer
);


ALTER TABLE public.daynights OWNER TO postgres;

--
-- Name: flags; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE flags (
    id integer NOT NULL,
    aid integer NOT NULL,
    reason character varying NOT NULL
);


ALTER TABLE public.flags OWNER TO postgres;

--
-- Name: flags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE flags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.flags_id_seq OWNER TO postgres;

--
-- Name: flags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE flags_id_seq OWNED BY flags.id;


--
-- Name: hit_photo_association; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE hit_photo_association (
    id integer NOT NULL,
    pid integer NOT NULL,
    hid integer NOT NULL
);


ALTER TABLE public.hit_photo_association OWNER TO postgres;

--
-- Name: hit_photo_association_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE hit_photo_association_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hit_photo_association_id_seq OWNER TO postgres;

--
-- Name: hit_photo_association_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE hit_photo_association_id_seq OWNED BY hit_photo_association.id;


--
-- Name: hit_vehicle_association; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE hit_vehicle_association (
    id integer NOT NULL,
    hid integer NOT NULL,
    vid integer NOT NULL
);


ALTER TABLE public.hit_vehicle_association OWNER TO postgres;

--
-- Name: hit_vehicle_association_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE hit_vehicle_association_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hit_vehicle_association_id_seq OWNER TO postgres;

--
-- Name: hit_vehicle_association_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE hit_vehicle_association_id_seq OWNED BY hit_vehicle_association.id;


--
-- Name: hits; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE hits (
    id integer NOT NULL,
    hitid character varying NOT NULL,
    creation timestamp without time zone NOT NULL,
    lifetime interval NOT NULL,
    max_assignments integer NOT NULL,
    htid integer NOT NULL
);


ALTER TABLE public.hits OWNER TO postgres;

--
-- Name: hits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE hits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hits_id_seq OWNER TO postgres;

--
-- Name: hits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE hits_id_seq OWNED BY hits.id;


--
-- Name: hittypes; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE hittypes (
    id integer NOT NULL,
    hittypeid character varying NOT NULL,
    title character varying NOT NULL,
    description character varying NOT NULL,
    reward double precision NOT NULL,
    duration interval NOT NULL,
    keywords character varying NOT NULL,
    approval_delay interval,
    sandbox boolean NOT NULL,
    ignore boolean NOT NULL
);


ALTER TABLE public.hittypes OWNER TO postgres;

--
-- Name: hittypes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE hittypes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hittypes_id_seq OWNER TO postgres;

--
-- Name: hittypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE hittypes_id_seq OWNED BY hittypes.id;


--
-- Name: occlusionrankings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE occlusionrankings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.occlusionrankings_id_seq OWNER TO postgres;

--
-- Name: occlusionrankings; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE occlusionrankings (
    id integer DEFAULT nextval('occlusionrankings_id_seq'::regclass) NOT NULL,
    category integer NOT NULL,
    vid integer NOT NULL,
    osid integer NOT NULL
);


ALTER TABLE public.occlusionrankings OWNER TO postgres;

--
-- Name: occlusionsessions; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE occlusionsessions (
    id integer NOT NULL,
    creation timestamp without time zone NOT NULL,
    asid integer,
    uid integer NOT NULL,
    duration interval
);


ALTER TABLE public.occlusionsessions OWNER TO postgres;

--
-- Name: occlusionsessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE occlusionsessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.occlusionsessions_id_seq OWNER TO postgres;

--
-- Name: occlusionsessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE occlusionsessions_id_seq OWNED BY occlusionsessions.id;


--
-- Name: photos; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE photos (
    id integer NOT NULL,
    name character varying NOT NULL,
    r11 double precision NOT NULL,
    r12 double precision NOT NULL,
    r13 double precision NOT NULL,
    r21 double precision NOT NULL,
    r22 double precision NOT NULL,
    r23 double precision NOT NULL,
    r31 double precision NOT NULL,
    r32 double precision NOT NULL,
    r33 double precision NOT NULL,
    t1 double precision NOT NULL,
    t2 double precision NOT NULL,
    t3 double precision NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    focal double precision NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    aboveground double precision NOT NULL,
    seesground boolean NOT NULL,
    important integer NOT NULL,
    dataset_id integer NOT NULL
);


ALTER TABLE public.photos OWNER TO postgres;

--
-- Name: photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE photos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.photos_id_seq OWNER TO postgres;

--
-- Name: photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE photos_id_seq OWNED BY photos.id;


--
-- Name: problems; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE problems (
    id integer NOT NULL,
    uid integer NOT NULL,
    description character varying NOT NULL,
    screenshot character varying,
    resolved boolean NOT NULL
);


ALTER TABLE public.problems OWNER TO postgres;

--
-- Name: problems_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE problems_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.problems_id_seq OWNER TO postgres;

--
-- Name: problems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE problems_id_seq OWNED BY problems.id;


--
-- Name: revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE revisions_id_seq
    START WITH 4331
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.revisions_id_seq OWNER TO postgres;

--
-- Name: revisions; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE revisions (
    id integer DEFAULT nextval('revisions_id_seq'::regclass) NOT NULL,
    aid integer NOT NULL,
    cameraheight double precision NOT NULL,
    screenshot character varying,
    final boolean NOT NULL,
    creation timestamp without time zone NOT NULL,
    parent_id integer,
    comment character varying NOT NULL,
    asid integer,
    duration interval
);


ALTER TABLE public.revisions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE users (
    id integer NOT NULL,
    username character varying NOT NULL,
    lastactivity timestamp without time zone NOT NULL,
    trust boolean NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE vehicles (
    id integer NOT NULL,
    x double precision NOT NULL,
    z double precision NOT NULL,
    theta double precision NOT NULL,
    type labelertype NOT NULL,
    x1 double precision NOT NULL,
    x2 double precision NOT NULL,
    y1 double precision NOT NULL,
    y2 double precision NOT NULL,
    cropped character varying,
    truncated double precision NOT NULL,
    small boolean,
    evaluation boolean,
    rid integer NOT NULL,
    partner_id integer,
    bbox_priority integer NOT NULL
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE vehicles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vehicles_id_seq OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE vehicles_id_seq OWNED BY vehicles.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY annotations ALTER COLUMN id SET DEFAULT nextval('annotations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_sessions ALTER COLUMN id SET DEFAULT nextval('approve_pair_sessions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_to_vehicle_association ALTER COLUMN id SET DEFAULT nextval('approve_pair_to_vehicle_association_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assignments ALTER COLUMN id SET DEFAULT nextval('assignments_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bounding_box_sessions ALTER COLUMN id SET DEFAULT nextval('bounding_box_sessions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clickerhits ALTER COLUMN id SET DEFAULT nextval('clickerhits_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicks ALTER COLUMN id SET DEFAULT nextval('clicks_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicksessions ALTER COLUMN id SET DEFAULT nextval('clicksessions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY flags ALTER COLUMN id SET DEFAULT nextval('flags_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_photo_association ALTER COLUMN id SET DEFAULT nextval('hit_photo_association_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_vehicle_association ALTER COLUMN id SET DEFAULT nextval('hit_vehicle_association_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hits ALTER COLUMN id SET DEFAULT nextval('hits_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hittypes ALTER COLUMN id SET DEFAULT nextval('hittypes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY occlusionsessions ALTER COLUMN id SET DEFAULT nextval('occlusionsessions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY photos ALTER COLUMN id SET DEFAULT nextval('photos_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY problems ALTER COLUMN id SET DEFAULT nextval('problems_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY vehicles ALTER COLUMN id SET DEFAULT nextval('vehicles_id_seq'::regclass);


--
-- Name: annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY annotations
    ADD CONSTRAINT annotations_pkey PRIMARY KEY (id);


--
-- Name: approve_pair_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY approve_pair_sessions
    ADD CONSTRAINT approve_pair_sessions_pkey PRIMARY KEY (id);


--
-- Name: approve_pair_to_vehicle_association_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY approve_pair_to_vehicle_association
    ADD CONSTRAINT approve_pair_to_vehicle_association_pkey PRIMARY KEY (id);


--
-- Name: assignments_assignmentid_key; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY assignments
    ADD CONSTRAINT assignments_assignmentid_key UNIQUE (assignmentid);


--
-- Name: assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: bounding_box_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY bounding_box_sessions
    ADD CONSTRAINT bounding_box_sessions_pkey PRIMARY KEY (id);


--
-- Name: clickerhits_hitid_key; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY clickerhits
    ADD CONSTRAINT clickerhits_hitid_key UNIQUE (hitid);


--
-- Name: clickerhits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY clickerhits
    ADD CONSTRAINT clickerhits_pkey PRIMARY KEY (id);


--
-- Name: clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY clicks
    ADD CONSTRAINT clicks_pkey PRIMARY KEY (id);


--
-- Name: clicksessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY clicksessions
    ADD CONSTRAINT clicksessions_pkey PRIMARY KEY (id);


--
-- Name: daynights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY daynights
    ADD CONSTRAINT daynights_pkey PRIMARY KEY (id);


--
-- Name: flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY flags
    ADD CONSTRAINT flags_pkey PRIMARY KEY (id);


--
-- Name: hit_photo_association_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hit_photo_association
    ADD CONSTRAINT hit_photo_association_pkey PRIMARY KEY (id);


--
-- Name: hit_vehicle_association_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hit_vehicle_association
    ADD CONSTRAINT hit_vehicle_association_pkey PRIMARY KEY (id);


--
-- Name: hits_hitid_key; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hits
    ADD CONSTRAINT hits_hitid_key UNIQUE (hitid);


--
-- Name: hits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hits
    ADD CONSTRAINT hits_pkey PRIMARY KEY (id);


--
-- Name: hittypes_hittypeid_key; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hittypes
    ADD CONSTRAINT hittypes_hittypeid_key UNIQUE (hittypeid);


--
-- Name: hittypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY hittypes
    ADD CONSTRAINT hittypes_pkey PRIMARY KEY (id);


--
-- Name: occlusionrankings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY occlusionrankings
    ADD CONSTRAINT occlusionrankings_pkey PRIMARY KEY (id);


--
-- Name: occlusionsessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY occlusionsessions
    ADD CONSTRAINT occlusionsessions_pkey PRIMARY KEY (id);


--
-- Name: photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: problems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);


--
-- Name: revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: assignments_hid_idx; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX assignments_hid_idx ON assignments USING btree (hid);


--
-- Name: hits_htid_idx; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX hits_htid_idx ON hits USING btree (htid);


--
-- Name: ix_users_netid; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX ix_users_netid ON users USING btree (username);


--
-- Name: annotations_pid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY annotations
    ADD CONSTRAINT annotations_pid_fkey FOREIGN KEY (pid) REFERENCES photos(id);


--
-- Name: annotations_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY annotations
    ADD CONSTRAINT annotations_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: approve_pair_sessions_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_sessions
    ADD CONSTRAINT approve_pair_sessions_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: approve_pair_sessions_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_sessions
    ADD CONSTRAINT approve_pair_sessions_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: approve_pair_to_vehicle_association_apsid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_to_vehicle_association
    ADD CONSTRAINT approve_pair_to_vehicle_association_apsid_fkey FOREIGN KEY (apsid) REFERENCES approve_pair_sessions(id);


--
-- Name: approve_pair_to_vehicle_association_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY approve_pair_to_vehicle_association
    ADD CONSTRAINT approve_pair_to_vehicle_association_vid_fkey FOREIGN KEY (vid) REFERENCES vehicles(id);


--
-- Name: assignments_hid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assignments
    ADD CONSTRAINT assignments_hid_fkey FOREIGN KEY (hid) REFERENCES hits(id);


--
-- Name: assignments_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY assignments
    ADD CONSTRAINT assignments_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: bounding_box_sessions_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bounding_box_sessions
    ADD CONSTRAINT bounding_box_sessions_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: bounding_box_sessions_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bounding_box_sessions
    ADD CONSTRAINT bounding_box_sessions_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: bounding_box_sessions_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bounding_box_sessions
    ADD CONSTRAINT bounding_box_sessions_vid_fkey FOREIGN KEY (vid) REFERENCES vehicles(id);


--
-- Name: clickerhits_pid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clickerhits
    ADD CONSTRAINT clickerhits_pid_fkey FOREIGN KEY (pid) REFERENCES photos(id);


--
-- Name: clicks_csid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicks
    ADD CONSTRAINT clicks_csid_fkey FOREIGN KEY (csid) REFERENCES clicksessions(id);


--
-- Name: clicksessions_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicksessions
    ADD CONSTRAINT clicksessions_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: clicksessions_pid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicksessions
    ADD CONSTRAINT clicksessions_pid_fkey FOREIGN KEY (pid) REFERENCES photos(id);


--
-- Name: clicksessions_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clicksessions
    ADD CONSTRAINT clicksessions_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: daynights_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY daynights
    ADD CONSTRAINT daynights_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: daynights_pid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY daynights
    ADD CONSTRAINT daynights_pid_fkey FOREIGN KEY (pid) REFERENCES photos(id);


--
-- Name: daynights_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY daynights
    ADD CONSTRAINT daynights_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: flags_aid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY flags
    ADD CONSTRAINT flags_aid_fkey FOREIGN KEY (aid) REFERENCES annotations(id) ON DELETE CASCADE;


--
-- Name: hit_photo_association_hid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_photo_association
    ADD CONSTRAINT hit_photo_association_hid_fkey FOREIGN KEY (hid) REFERENCES hits(id);


--
-- Name: hit_photo_association_pid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_photo_association
    ADD CONSTRAINT hit_photo_association_pid_fkey FOREIGN KEY (pid) REFERENCES photos(id);


--
-- Name: hit_vehicle_association_hid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_vehicle_association
    ADD CONSTRAINT hit_vehicle_association_hid_fkey FOREIGN KEY (hid) REFERENCES hits(id);


--
-- Name: hit_vehicle_association_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hit_vehicle_association
    ADD CONSTRAINT hit_vehicle_association_vid_fkey FOREIGN KEY (vid) REFERENCES vehicles(id);


--
-- Name: hits_htid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY hits
    ADD CONSTRAINT hits_htid_fkey FOREIGN KEY (htid) REFERENCES hittypes(id);


--
-- Name: occlusionrankings_osid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY occlusionrankings
    ADD CONSTRAINT occlusionrankings_osid_fkey FOREIGN KEY (osid) REFERENCES occlusionsessions(id);


--
-- Name: occlusionrankings_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY occlusionrankings
    ADD CONSTRAINT occlusionrankings_vid_fkey FOREIGN KEY (vid) REFERENCES vehicles(id);


--
-- Name: occlusionsessions_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY occlusionsessions
    ADD CONSTRAINT occlusionsessions_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: occlusionsessions_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY occlusionsessions
    ADD CONSTRAINT occlusionsessions_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: problems_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY problems
    ADD CONSTRAINT problems_uid_fkey FOREIGN KEY (uid) REFERENCES users(id);


--
-- Name: revisions_aid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT revisions_aid_fkey FOREIGN KEY (aid) REFERENCES annotations(id);


--
-- Name: revisions_asid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT revisions_asid_fkey FOREIGN KEY (asid) REFERENCES assignments(id);


--
-- Name: revisions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY revisions
    ADD CONSTRAINT revisions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES revisions(id);


--
-- Name: vehicles_partner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY vehicles
    ADD CONSTRAINT vehicles_partner_fkey FOREIGN KEY (partner_id) REFERENCES vehicles(id);


--
-- Name: vehicles_rid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY vehicles
    ADD CONSTRAINT vehicles_rid_fkey FOREIGN KEY (rid) REFERENCES revisions(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: annotations; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE annotations FROM PUBLIC;
REVOKE ALL ON TABLE annotations FROM postgres;
GRANT ALL ON TABLE annotations TO postgres;


--
-- Name: annotations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE annotations_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE annotations_id_seq FROM postgres;
GRANT ALL ON SEQUENCE annotations_id_seq TO postgres;


--
-- Name: approve_pair_sessions; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE approve_pair_sessions FROM PUBLIC;
REVOKE ALL ON TABLE approve_pair_sessions FROM postgres;
GRANT ALL ON TABLE approve_pair_sessions TO postgres;


--
-- Name: approve_pair_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE approve_pair_sessions_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE approve_pair_sessions_id_seq FROM postgres;
GRANT ALL ON SEQUENCE approve_pair_sessions_id_seq TO postgres;


--
-- Name: approve_pair_to_vehicle_association; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE approve_pair_to_vehicle_association FROM PUBLIC;
REVOKE ALL ON TABLE approve_pair_to_vehicle_association FROM postgres;
GRANT ALL ON TABLE approve_pair_to_vehicle_association TO postgres;


--
-- Name: approve_pair_to_vehicle_association_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE approve_pair_to_vehicle_association_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE approve_pair_to_vehicle_association_id_seq FROM postgres;
GRANT ALL ON SEQUENCE approve_pair_to_vehicle_association_id_seq TO postgres;


--
-- Name: assignments; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE assignments FROM PUBLIC;
REVOKE ALL ON TABLE assignments FROM postgres;
GRANT ALL ON TABLE assignments TO postgres;


--
-- Name: assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE assignments_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE assignments_id_seq FROM postgres;
GRANT ALL ON SEQUENCE assignments_id_seq TO postgres;


--
-- Name: bounding_box_sessions; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE bounding_box_sessions FROM PUBLIC;
REVOKE ALL ON TABLE bounding_box_sessions FROM postgres;
GRANT ALL ON TABLE bounding_box_sessions TO postgres;


--
-- Name: bounding_box_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE bounding_box_sessions_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE bounding_box_sessions_id_seq FROM postgres;
GRANT ALL ON SEQUENCE bounding_box_sessions_id_seq TO postgres;


--
-- Name: clickerhits; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE clickerhits FROM PUBLIC;
REVOKE ALL ON TABLE clickerhits FROM postgres;
GRANT ALL ON TABLE clickerhits TO postgres;


--
-- Name: clickerhits_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE clickerhits_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE clickerhits_id_seq FROM postgres;
GRANT ALL ON SEQUENCE clickerhits_id_seq TO postgres;


--
-- Name: clicks; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE clicks FROM PUBLIC;
REVOKE ALL ON TABLE clicks FROM postgres;
GRANT ALL ON TABLE clicks TO postgres;


--
-- Name: clicks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE clicks_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE clicks_id_seq FROM postgres;
GRANT ALL ON SEQUENCE clicks_id_seq TO postgres;


--
-- Name: clicksessions; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE clicksessions FROM PUBLIC;
REVOKE ALL ON TABLE clicksessions FROM postgres;
GRANT ALL ON TABLE clicksessions TO postgres;


--
-- Name: clicksessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE clicksessions_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE clicksessions_id_seq FROM postgres;
GRANT ALL ON SEQUENCE clicksessions_id_seq TO postgres;


--
-- Name: daynights_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE daynights_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE daynights_id_seq FROM postgres;
GRANT ALL ON SEQUENCE daynights_id_seq TO postgres;


--
-- Name: daynights; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE daynights FROM PUBLIC;
REVOKE ALL ON TABLE daynights FROM postgres;
GRANT ALL ON TABLE daynights TO postgres;


--
-- Name: flags; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE flags FROM PUBLIC;
REVOKE ALL ON TABLE flags FROM postgres;
GRANT ALL ON TABLE flags TO postgres;


--
-- Name: flags_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE flags_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE flags_id_seq FROM postgres;
GRANT ALL ON SEQUENCE flags_id_seq TO postgres;


--
-- Name: hit_photo_association; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE hit_photo_association FROM PUBLIC;
REVOKE ALL ON TABLE hit_photo_association FROM postgres;
GRANT ALL ON TABLE hit_photo_association TO postgres;


--
-- Name: hit_photo_association_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE hit_photo_association_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE hit_photo_association_id_seq FROM postgres;
GRANT ALL ON SEQUENCE hit_photo_association_id_seq TO postgres;


--
-- Name: hit_vehicle_association; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE hit_vehicle_association FROM PUBLIC;
REVOKE ALL ON TABLE hit_vehicle_association FROM postgres;
GRANT ALL ON TABLE hit_vehicle_association TO postgres;


--
-- Name: hit_vehicle_association_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE hit_vehicle_association_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE hit_vehicle_association_id_seq FROM postgres;
GRANT ALL ON SEQUENCE hit_vehicle_association_id_seq TO postgres;


--
-- Name: hits; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE hits FROM PUBLIC;
REVOKE ALL ON TABLE hits FROM postgres;
GRANT ALL ON TABLE hits TO postgres;


--
-- Name: hits_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE hits_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE hits_id_seq FROM postgres;
GRANT ALL ON SEQUENCE hits_id_seq TO postgres;


--
-- Name: hittypes; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE hittypes FROM PUBLIC;
REVOKE ALL ON TABLE hittypes FROM postgres;
GRANT ALL ON TABLE hittypes TO postgres;


--
-- Name: hittypes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE hittypes_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE hittypes_id_seq FROM postgres;
GRANT ALL ON SEQUENCE hittypes_id_seq TO postgres;


--
-- Name: occlusionrankings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE occlusionrankings_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE occlusionrankings_id_seq FROM postgres;
GRANT ALL ON SEQUENCE occlusionrankings_id_seq TO postgres;


--
-- Name: occlusionrankings; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE occlusionrankings FROM PUBLIC;
REVOKE ALL ON TABLE occlusionrankings FROM postgres;
GRANT ALL ON TABLE occlusionrankings TO postgres;


--
-- Name: occlusionsessions; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE occlusionsessions FROM PUBLIC;
REVOKE ALL ON TABLE occlusionsessions FROM postgres;
GRANT ALL ON TABLE occlusionsessions TO postgres;


--
-- Name: occlusionsessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE occlusionsessions_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE occlusionsessions_id_seq FROM postgres;
GRANT ALL ON SEQUENCE occlusionsessions_id_seq TO postgres;


--
-- Name: photos; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE photos FROM PUBLIC;
REVOKE ALL ON TABLE photos FROM postgres;
GRANT ALL ON TABLE photos TO postgres;


--
-- Name: photos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE photos_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE photos_id_seq FROM postgres;
GRANT ALL ON SEQUENCE photos_id_seq TO postgres;


--
-- Name: problems; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE problems FROM PUBLIC;
REVOKE ALL ON TABLE problems FROM postgres;
GRANT ALL ON TABLE problems TO postgres;


--
-- Name: problems_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE problems_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE problems_id_seq FROM postgres;
GRANT ALL ON SEQUENCE problems_id_seq TO postgres;


--
-- Name: revisions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE revisions_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE revisions_id_seq FROM postgres;
GRANT ALL ON SEQUENCE revisions_id_seq TO postgres;


--
-- Name: revisions; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE revisions FROM PUBLIC;
REVOKE ALL ON TABLE revisions FROM postgres;
GRANT ALL ON TABLE revisions TO postgres;


--
-- Name: users; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE users FROM PUBLIC;
REVOKE ALL ON TABLE users FROM postgres;
GRANT ALL ON TABLE users TO postgres;


--
-- Name: users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE users_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE users_id_seq FROM postgres;
GRANT ALL ON SEQUENCE users_id_seq TO postgres;


--
-- Name: vehicles; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE vehicles FROM PUBLIC;
REVOKE ALL ON TABLE vehicles FROM postgres;
GRANT ALL ON TABLE vehicles TO postgres;


--
-- Name: vehicles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON SEQUENCE vehicles_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE vehicles_id_seq FROM postgres;
GRANT ALL ON SEQUENCE vehicles_id_seq TO postgres;


--
-- PostgreSQL database dump complete
--

