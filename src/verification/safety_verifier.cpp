#include "safety_verifier.h"
#include "astvdp/sqlite_compat.h"
#include <cmath>
#include <vector>
#include <string>

namespace astvdp {

namespace {
double getOr(const std::unordered_map<std::string, double>& values,
             const std::string& key,
             double fallback) {
    auto it = values.find(key);
    return (it != values.end()) ? it->second : fallback;
}
}  // namespace

static int limitCallback(void* data, int argc, char** argv, char** azColName) {
    (void)azColName;
    auto* limits = static_cast<std::unordered_map<std::string, double>*>(data);
    if (argc >= 3 && argv[0] && argv[1] && argv[2]) {
        std::string name = argv[0];
        double min_val = std::stod(argv[1]);
        double max_val = std::stod(argv[2]);
        // Store as two entries: "roll_rate_min", "roll_rate_max"
        (*limits)[name + "_min"] = min_val;
        (*limits)[name + "_max"] = max_val;
    }
    return 0;
}

bool SafetyVerifierImpl::loadLimitsFromDb(const std::string& db_path) {
    sqlite3* db;
    int rc = sqlite3_open(db_path.c_str(), &db);
    if (rc != SQLITE_OK) {
        sqlite3_close(db);
        loadDefaults();
        return false;
    }

    const char* sql = "SELECT param_name, min_val, max_val FROM safety_limits;";
    char* errMsg = nullptr;
    limits_.clear();
    rc = sqlite3_exec(db, sql, limitCallback, &limits_, &errMsg);
    if (rc != SQLITE_OK) {
        sqlite3_free(errMsg);
        sqlite3_close(db);
        loadDefaults();
        return false;
    }

    sqlite3_close(db);
    return true;
}

void SafetyVerifierImpl::loadDefaults() {
    limits_ = {
        {"roll_rate_min", -0.35}, {"roll_rate_max", 0.35},
        {"pitch_rate_min", -0.30}, {"pitch_rate_max", 0.30},
        {"yaw_rate_min", -0.40}, {"yaw_rate_max", 0.40},
        {"q_dyn_min", 500.0}, {"q_dyn_max", 20000.0},
        {"altitude_min", 0.0}, {"altitude_max", 15000.0},
        {"temperature_min", -55.0}, {"temperature_max", 70.0},
        {"vibration_rms_max", 5.0}
    };
}

bool SafetyVerifierImpl::isGnssValid(const TimestampedSample& raw) {
    const double GNSS_INVALID_LAT = 0.0;
    const double GNSS_INVALID_LON = 0.0;
    bool valid = (raw.gps_lat != GNSS_INVALID_LAT || raw.gps_lon != GNSS_INVALID_LON);
    if (valid) {
        last_gnss_time_ = raw.timestamp;
        gnss_valid_ = true;
    } else if (last_gnss_time_ >= 0 && (raw.timestamp - last_gnss_time_) > 1.0) {
        gnss_valid_ = false;
    }
    return gnss_valid_;
}

std::vector<Anomaly> SafetyVerifierImpl::check(const FusedState& state,
                                               const TimestampedSample& raw) {
    std::vector<Anomaly> anomalies;

    // 1. Angular rate limits (use raw IMU gyro)
    auto checkRate = [&](const std::string& name, double rate, double min, double max) {
        if (rate < min || rate > max) {
            anomalies.push_back({
                raw.timestamp, "limit_breach", name,
                Severity::Major,
                "Rate out of bounds"
            });
        }
    };
    checkRate("roll_rate", raw.imu_gx, getOr(limits_, "roll_rate_min", -0.35), getOr(limits_, "roll_rate_max", 0.35));
    checkRate("pitch_rate", raw.imu_gy, getOr(limits_, "pitch_rate_min", -0.30), getOr(limits_, "pitch_rate_max", 0.30));
    checkRate("yaw_rate", raw.imu_gz, getOr(limits_, "yaw_rate_min", -0.40), getOr(limits_, "yaw_rate_max", 0.40));

    // 2. Dynamic pressure
    double q_min = getOr(limits_, "q_dyn_min", 500.0);
    double q_max = getOr(limits_, "q_dyn_max", 20000.0);
    if (state.q_dyn < q_min || state.q_dyn > q_max) {
        anomalies.push_back({
            raw.timestamp, "limit_breach", "dynamic_pressure",
            (state.q_dyn > q_max) ? Severity::Critical : Severity::Major,
            "q outside envelope"
        });
    }

    // 3. Altitude
    double alt_min = getOr(limits_, "altitude_min", 0.0);
    double alt_max = getOr(limits_, "altitude_max", 15000.0);
    if (state.alt_msl < alt_min || state.alt_msl > alt_max) {
        anomalies.push_back({
            raw.timestamp, "limit_breach", "altitude",
            Severity::Major,
            "Altitude out of range"
        });
    }

    // 4. Temperature
    double temp_min = getOr(limits_, "temperature_min", -55.0);
    double temp_max = getOr(limits_, "temperature_max", 70.0);
    if (raw.temperature < temp_min || raw.temperature > temp_max) {
        anomalies.push_back({
            raw.timestamp, "limit_breach", "temperature",
            Severity::Minor,
            "Temp out of spec"
        });
    }

    // 5. Vibration RMS
    double vib_rms = std::sqrt(
        (raw.vib_x*raw.vib_x + raw.vib_y*raw.vib_y + raw.vib_z*raw.vib_z) / 3.0
    );
    double vib_thresh = getOr(limits_, "vibration_rms_max", 5.0);
    if (vib_rms > vib_thresh) {
        anomalies.push_back({
            raw.timestamp, "vibration_excess", "vibration",
            Severity::Major,
            "RMS vibration exceeds threshold"
        });
    }

    // 6. GNSS dropout
    if (!isGnssValid(raw)) {
        anomalies.push_back({
            raw.timestamp, "gnss_dropout", "gps",
            Severity::Major,
            "GNSS signal lost >1s"
        });
    }

    return anomalies;
}

}  // namespace astvdp
