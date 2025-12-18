#include "flight_simulator.h"
#include <fstream>
#include <random>
#include <cmath>

namespace astvdp {

std::vector<TimestampedSample> FlightSimulator::generate(const Profile& profile) {
    std::vector<TimestampedSample> data;
    size_t n = static_cast<size_t>(profile.duration_sec * profile.sample_rate_hz);
    double dt = 1.0 / profile.sample_rate_hz;

    std::mt19937 rng(12345); // deterministic seed
    std::normal_distribution<double> noise(0.0, 0.05);

    double t = 0.0;
    double alt = 0.0;
    double roll = 0.0, pitch = 0.0, yaw = 0.0;
    double imu_az_bias = 0.0;

    for (size_t i = 0; i < n; ++i) {
        TimestampedSample s;
        s.timestamp = t;

        // Basic flight profile: climb → cruise → descend
        if (t < 60) {
            // Climb: 5 m/s
            alt = t * 5.0;
            pitch = 0.1; // 5 deg
        } else if (t < 240) {
            // Cruise at 3000m
            alt = 3000.0;
            pitch = 0.0;
        } else {
            // Descend: -3 m/s
            alt = 3000.0 - (t - 240.0) * 3.0;
            pitch = -0.05;
        }

        // Banked turn between 100-160 sec
        if (t >= 100 && t <= 160) {
            roll = 0.26; // 15 deg
            yaw += 0.02 * dt;
        }

        // GPS
        s.gps_alt = alt + noise(rng);
        s.gps_vx = 80.0 * cos(yaw) + noise(rng);
        s.gps_vy = 80.0 * sin(yaw) + noise(rng);
        s.gps_lat = 45.0 + (t * 0.0001);
        s.gps_lon = -75.0 + (t * 0.0001);

        // IMU
        s.imu_ax = 0.0 + noise(rng);
        s.imu_ay = 9.81 * sin(roll) + noise(rng);
        s.imu_az = (9.81 * cos(roll) * cos(pitch)) + noise(rng) + imu_az_bias;
        s.imu_gx = 0.0 + noise(rng);
        s.imu_gy = 0.0 + noise(rng);
        s.imu_gz = 0.0 + noise(rng);

        // Environment
        s.static_pressure = 101325.0 * pow(1.0 - alt/44330.0, 5.255);
        s.temperature = 15.0 - 0.0065 * alt;

        // Vibration
        double vib_base = 1.0 + 0.5 * sin(t * 10.0);
        if (profile.inject_vibration_fault && t > 200.0) {
            vib_base += (t - 200.0) * 0.1; // ramp up
        }
        s.vib_x = vib_base + noise(rng);
        s.vib_y = vib_base + noise(rng);
        s.vib_z = vib_base + noise(rng);

        // GNSS dropout
        if (profile.inject_gnss_dropout && t > 150.0 && t < 152.0) {
            s.gps_lat = 0.0;
            s.gps_lon = 0.0;
        }

        // IMU bias drift
        if (profile.inject_imu_drift) {
            imu_az_bias = 0.0001 * t; // slow drift
        }

        data.push_back(s);
        t += dt;
    }

    return data;
}

bool FlightSimulator::saveToCsv(const std::vector<TimestampedSample>& data, const std::string& path) {
    std::ofstream ofs(path);
    if (!ofs.is_open()) return false;

    ofs << "timestamp,imu_ax,imu_ay,imu_az,imu_gx,imu_gy,imu_gz,gps_lat,gps_lon,gps_alt,gps_vx,gps_vy,static_pressure,temperature,vib_x,vib_y,vib_z\n";
    for (const auto& s : data) {
        ofs << s.timestamp << ","
            << s.imu_ax << "," << s.imu_ay << "," << s.imu_az << ","
            << s.imu_gx << "," << s.imu_gy << "," << s.imu_gz << ","
            << s.gps_lat << "," << s.gps_lon << "," << s.gps_alt << ","
            << s.gps_vx << "," << s.gps_vy << ","
            << s.static_pressure << "," << s.temperature << ","
            << s.vib_x << "," << s.vib_y << "," << s.vib_z << "\n";
    }
    return true;
}

}  // namespace astvdp