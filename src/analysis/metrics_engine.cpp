#include "metrics_engine.h"
#include <map>

namespace astvdp {

SessionMetrics computeMetrics(const std::vector<Anomaly>& anomalies, size_t total_samples) {
    if (total_samples == 0) return {};

    SessionMetrics m;
    double critical_weight = 10.0;
    double major_weight = 5.0;
    double minor_weight = 2.0;
    double obs_weight = 0.5;

    double total_weight = 0.0;
    int critical_count = 0, major_count = 0;

    for (const auto& a : anomalies) {
        switch (a.severity) {
            case Severity::Critical:
                total_weight += critical_weight;
                critical_count++;
                break;
            case Severity::Major:
                total_weight += major_weight;
                major_count++;
                break;
            case Severity::Minor:
                total_weight += minor_weight;
                break;
            default:
                total_weight += obs_weight;
                break;
        }
    }

    // Reliability: 1 - (anomaly_weight / total_samples)
    m.sensor_reliability = std::max(0.0, 1.0 - (total_weight / total_samples));

    // Stability: penalize high-rate anomalies
    double anomaly_rate = static_cast<double>(anomalies.size()) / total_samples;
    m.stability_index = std::max(0.0, 1.0 - anomaly_rate * 10.0);

    // Compliance: fails if any critical
    m.mission_compliance = (critical_count == 0) ? 1.0 : 0.0;

    // Risk classification
    if (critical_count > 0) {
        m.risk_classification = "Critical";
    } else if (major_count > 3) {
        m.risk_classification = "Major";
    } else if (major_count > 0 || total_weight > 5.0) {
        m.risk_classification = "Minor";
    } else {
        m.risk_classification = "Observation";
    }

    return m;
}

}  // namespace astvdp