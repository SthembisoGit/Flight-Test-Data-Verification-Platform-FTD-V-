#include "database.h"
#include "astvdp/sqlite_compat.h"
#include <ctime>
#include <filesystem>
#include <string>

namespace astvdp {

Database::Database(const std::string& path) : path_(path) {}

Database::~Database() {
    close();
}

bool Database::open() {
    if (db_) return true;

    std::error_code ec;
    std::filesystem::path db_path(path_);
    if (db_path.has_parent_path()) {
        std::filesystem::create_directories(db_path.parent_path(), ec);
    }

    int rc = sqlite3_open(path_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        close();
        return false;
    }

    sqlite3_exec(db_, "PRAGMA foreign_keys = ON;", nullptr, nullptr, nullptr);

    if (!initializeSchema()) {
        close();
        return false;
    }

    return true;
}

void Database::close() {
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;
    }
}

int64_t Database::startSession(const std::string& mission_id, const std::string& aircraft) {
    const char* sql = "INSERT INTO flight_sessions (mission_id, start_time, aircraft_type) VALUES (?, ?, ?);";
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) return -1;

    sqlite3_bind_text(stmt, 1, mission_id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_double(stmt, 2, static_cast<double>(std::time(nullptr)));
    sqlite3_bind_text(stmt, 3, aircraft.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    int64_t id = (rc == SQLITE_DONE) ? sqlite3_last_insert_rowid(db_) : -1;
    sqlite3_finalize(stmt);
    return id;
}

bool Database::endSession(int64_t session_id, double end_time) {
    const char* sql = "UPDATE flight_sessions SET end_time = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) return false;

    sqlite3_bind_double(stmt, 1, end_time);
    sqlite3_bind_int64(stmt, 2, session_id);
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE);
}

bool Database::insertFlightData(int64_t session_id, const TimestampedSample& s) {
    const char* sql =
        "INSERT INTO flight_data (session_id, timestamp, "
        "imu_ax,imu_ay,imu_az,imu_gx,imu_gy,imu_gz,"
        "gps_lat,gps_lon,gps_alt,gps_vx,gps_vy,"
        "static_pressure,temperature,vibration_x,vibration_y,vibration_z) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) return false;

    auto bind = [&](int i, double v) { sqlite3_bind_double(stmt, i, v); };
    sqlite3_bind_int64(stmt, 1, session_id);
    bind(2, s.timestamp);
    bind(3, s.imu_ax); bind(4, s.imu_ay); bind(5, s.imu_az);
    bind(6, s.imu_gx); bind(7, s.imu_gy); bind(8, s.imu_gz);
    bind(9, s.gps_lat); bind(10, s.gps_lon); bind(11, s.gps_alt);
    bind(12, s.gps_vx); bind(13, s.gps_vy);
    bind(14, s.static_pressure); bind(15, s.temperature);
    bind(16, s.vib_x); bind(17, s.vib_y); bind(18, s.vib_z);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE);
}

bool Database::insertAnomaly(int64_t session_id, const Anomaly& a) {
    const char* sql =
        "INSERT INTO anomalies (session_id, timestamp, type, param_affected, severity, details) "
        "VALUES (?, ?, ?, ?, ?, ?);";

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) return false;

    sqlite3_bind_int64(stmt, 1, session_id);
    sqlite3_bind_double(stmt, 2, a.timestamp);
    sqlite3_bind_text(stmt, 3, a.type.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 4, a.param.c_str(), -1, SQLITE_STATIC);
    const char* sev_str = "observation";
    switch (a.severity) {
        case Severity::Critical: sev_str = "critical"; break;
        case Severity::Major: sev_str = "major"; break;
        case Severity::Minor: sev_str = "minor"; break;
        default: sev_str = "observation";
    }
    sqlite3_bind_text(stmt, 5, sev_str, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 6, a.details.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE);
}

bool Database::saveSessionMetrics(int64_t session_id, double stability, double reliability,
                                  double compliance, const std::string& risk_class) {
    const char* sql =
        "INSERT INTO session_metrics (session_id, stability_index, sensor_reliability, "
        "mission_compliance, risk_classification) VALUES (?, ?, ?, ?, ?);";

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) return false;

    sqlite3_bind_int64(stmt, 1, session_id);
    sqlite3_bind_double(stmt, 2, stability);
    sqlite3_bind_double(stmt, 3, reliability);
    sqlite3_bind_double(stmt, 4, compliance);
    sqlite3_bind_text(stmt, 5, risk_class.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE);
}

bool Database::initializeSchema() {
    static const char* kSchemaSql = R"SQL(
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
)SQL";

    char* err_msg = nullptr;
    int rc = sqlite3_exec(db_, kSchemaSql, nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        sqlite3_free(err_msg);
        return false;
    }

    return true;
}

}  // namespace astvdp
