CREATE TABLE IF NOT EXISTS flight_sessions (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL,
    aircraft_type TEXT
);

CREATE TABLE IF NOT EXISTS flight_data (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    timestamp REAL NOT NULL,
    imu_ax REAL, imu_ay REAL, imu_az REAL,
    imu_gx REAL, imu_gy REAL, imu_gz REAL,
    gps_lat REAL, gps_lon REAL, gps_alt REAL,
    gps_vx REAL, gps_vy REAL,
    static_pressure REAL,
    temperature REAL,
    vibration_x REAL, vibration_y REAL, vibration_z REAL,
    FOREIGN KEY(session_id) REFERENCES flight_sessions(id)
);

CREATE TABLE IF NOT EXISTS safety_limits (
    id INTEGER PRIMARY KEY,
    param_name TEXT NOT NULL UNIQUE,
    min_val REAL,
    max_val REAL,
    unit TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS anomalies (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    timestamp REAL NOT NULL,
    type TEXT NOT NULL,
    param_affected TEXT,
    severity TEXT,
    details TEXT,
    FOREIGN KEY(session_id) REFERENCES flight_sessions(id)
);

CREATE TABLE IF NOT EXISTS verification_results (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    req_id TEXT NOT NULL,
    result TEXT NOT NULL,
    evidence TEXT,
    FOREIGN KEY(session_id) REFERENCES flight_sessions(id)
);

CREATE TABLE IF NOT EXISTS session_metrics (
    session_id INTEGER PRIMARY KEY,
    stability_index REAL,
    sensor_reliability REAL,
    mission_compliance REAL,
    risk_classification TEXT,
    FOREIGN KEY(session_id) REFERENCES flight_sessions(id)
);