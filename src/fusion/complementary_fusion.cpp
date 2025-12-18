#include "complementary_fusion.h"
#include <cmath>

namespace astvdp {

void ComplementaryFusion::process(const TimestampedSample& raw, FusedState& fused) {
    fused.timestamp = raw.timestamp;

    // Accelerometer-based attitude (assumes near-static, no accel)
    double roll_acc = atan2(raw.imu_ay, raw.imu_az);
    double pitch_acc = atan2(-raw.imu_ax,
        std::sqrt(raw.imu_ay * raw.imu_ay + raw.imu_az * raw.imu_az));

    // Gyro integration
    if (prev_timestamp_ > 0) {
        double dt = raw.timestamp - prev_timestamp_;
        roll_gyro_ += raw.imu_gx * dt;
        pitch_gyro_ += raw.imu_gy * dt;
    }

    // Complementary blend: 97% gyro, 3% accelerometer
    constexpr double alpha = 0.97;
    fused.roll = alpha * roll_gyro_ + (1.0 - alpha) * roll_acc;
    fused.pitch = alpha * pitch_gyro_ + (1.0 - alpha) * pitch_acc;

    // Yaw from GPS ground track (if moving)
    double speed = std::sqrt(raw.gps_vx * raw.gps_vx + raw.gps_vy * raw.gps_vy);
    if (speed > 1.0) {
        fused.yaw = std::atan2(raw.gps_vy, raw.gps_vx);
    } else {
        // Hold last or leave as 0; no mag sensor assumed
    }

    fused.alt_msl = raw.gps_alt;
    fused.vn = raw.gps_vx;
    fused.ve = raw.gps_vy;
    fused.vd = 0.0;

    // Dynamic pressure: q = 0.5 * rho * V^2 (rho = 1.225 kg/m³ at sea level)
    fused.q_dyn = 0.5 * 1.225 * speed * speed;

    prev_timestamp_ = raw.timestamp;
}

}  // namespace astvdp