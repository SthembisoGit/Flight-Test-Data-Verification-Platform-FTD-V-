#pragma once
#include "astvdp/types.h"
#include <vector>
#include <deque>

namespace astvdp {

class DiagnosticEngine {
public:
    void process(const TimestampedSample& sample);
    std::vector<Anomaly> getNewAnomalies();

private:
    // Rolling windows (size = 100 samples ≈ 1 sec at 100Hz)
    static constexpr size_t WINDOW_SIZE = 100;

    std::deque<double> vib_z_window_;
    std::deque<double> imu_az_window_;
    std::deque<double> timestamps_;

    double last_imu_az_bias_ = 0.0;
    bool first_run_ = true;

    void checkVibrationTrend();
    void checkImuBiasDrift();
    void checkGnssStability();

    std::vector<Anomaly> pending_anomalies_;
};

}  // namespace astvdp