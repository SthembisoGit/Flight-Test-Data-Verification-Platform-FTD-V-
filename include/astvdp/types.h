#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace astvdp {

struct TimestampedSample {
    double timestamp;
    double imu_ax = 0, imu_ay = 0, imu_az = 0;
    double imu_gx = 0, imu_gy = 0, imu_gz = 0;
    double gps_lat = 0, gps_lon = 0, gps_alt = 0;
    double gps_vx = 0, gps_vy = 0;
    double static_pressure = 0;
    double temperature = 0;
    double vib_x = 0, vib_y = 0, vib_z = 0;
};

enum class Severity { Observation, Minor, Major, Critical };

struct Anomaly {
    double timestamp;
    std::string type;
    std::string param;
    Severity severity;
    std::string details;
};

}  // namespace astvdp