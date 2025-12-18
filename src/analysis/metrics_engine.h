#pragma once
#include <vector>
#include <string>
#include "astvdp/types.h"

namespace astvdp {

struct SessionMetrics {
    double stability_index = 1.0;
    double sensor_reliability = 1.0;
    double mission_compliance = 1.0;
    std::string risk_classification = "Observation";
};

SessionMetrics computeMetrics(const std::vector<Anomaly>& anomalies, size_t total_samples);

}  // namespace astvdp