#pragma once
#include <string>
#include <vector>
#include "astvdp/types.h"

namespace astvdp {

class FlightSimulator {
public:
    struct Profile {
        double duration_sec = 300.0;
        double sample_rate_hz = 100.0;
        bool inject_vibration_fault = false;
        bool inject_gnss_dropout = false;
        bool inject_imu_drift = false;
    };

    static std::vector<TimestampedSample> generate(const Profile& profile);
    static bool saveToCsv(const std::vector<TimestampedSample>& data, const std::string& path);
};

}  // namespace astvdp