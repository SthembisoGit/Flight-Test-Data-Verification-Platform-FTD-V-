#pragma once
#include "astvdp/interfaces.h"

namespace astvdp {

class ComplementaryFusion : public SensorFusion {
public:
    void process(const TimestampedSample& raw, FusedState& fused) override;

private:
    double prev_timestamp_ = 0.0;
    double roll_gyro_ = 0.0;
    double pitch_gyro_ = 0.0;
};

}  // namespace astvdp