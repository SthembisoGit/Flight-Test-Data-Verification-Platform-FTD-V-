#include "diagnostic_engine.h"
#include <cmath>
#include <numeric>

namespace astvdp {

void DiagnosticEngine::process(const TimestampedSample& sample) {
    pending_anomalies_.clear();

    // Maintain windows
    timestamps_.push_back(sample.timestamp);
    vib_z_window_.push_back(sample.vib_z);
    imu_az_window_.push_back(sample.imu_az);

    if (timestamps_.size() > WINDOW_SIZE) {
        timestamps_.pop_front();
        vib_z_window_.pop_front();
        imu_az_window_.pop_front();
    }

    if (timestamps_.size() < 10) return; // need min samples

    checkVibrationTrend();
    checkImuBiasDrift();
    checkGnssStability();
}

std::vector<Anomaly> DiagnosticEngine::getNewAnomalies() {
    return pending_anomalies_;
}

void DiagnosticEngine::checkVibrationTrend() {
    if (vib_z_window_.size() < 50) return;

    // Compute RMS over first half and second half
    size_t mid = vib_z_window_.size() / 2;
    double sum1 = 0, sum2 = 0;
    for (size_t i = 0; i < mid; ++i) {
        sum1 += vib_z_window_[i] * vib_z_window_[i];
    }
    for (size_t i = mid; i < vib_z_window_.size(); ++i) {
        sum2 += vib_z_window_[i] * vib_z_window_[i];
    }
    double rms1 = std::sqrt(sum1 / mid);
    double rms2 = std::sqrt(sum2 / (vib_z_window_.size() - mid));

    // If RMS increased by >50%, flag
    if (rms1 > 0.1 && rms2 > rms1 * 1.5) {
        pending_anomalies_.push_back({
            timestamps_.back(), "vibration_buildup", "vib_z",
            Severity::Major,
            "Vibration RMS rising rapidly"
        });
    }
}

void DiagnosticEngine::checkImuBiasDrift() {
    if (imu_az_window_.size() < 30) return;

    double mean = std::accumulate(imu_az_window_.begin(), imu_az_window_.end(), 0.0) / imu_az_window_.size();
    double expected = 9.81; // Earth gravity
    double bias = mean - expected;

    if (first_run_) {
        last_imu_az_bias_ = bias;
        first_run_ = false;
        return;
    }

    // If bias drifts more than 0.05 m/s² over window
    if (std::abs(bias - last_imu_az_bias_) > 0.05) {
        pending_anomalies_.push_back({
            timestamps_.back(), "imu_bias_drift", "imu_az",
            Severity::Minor,
            "Accelerometer Z bias drifting"
        });
        last_imu_az_bias_ = bias;
    }
}

void DiagnosticEngine::checkGnssStability() {
    static bool last_valid = true;
    static int dropout_count = 0;

    bool now_valid = (timestamps_.back() > 0); // placeholder logic

    // In real use, this would track actual GNSS health
    // For now, skip advanced logic—GNSS handled in verifier
}

}  // namespace astvdp