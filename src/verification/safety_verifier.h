#pragma once
#include "astvdp/interfaces.h"
#include <string>
#include <unordered_map>

namespace astvdp {

class SafetyVerifierImpl : public SafetyVerifier {
public:
    bool loadLimitsFromDb(const std::string& db_path) override;
    std::vector<Anomaly> check(const FusedState& state,
                               const TimestampedSample& raw) override;

private:
    void loadDefaults();
    bool isGnssValid(const TimestampedSample& raw);
    double last_gnss_time_ = -1.0;
    bool gnss_valid_ = false;

    std::unordered_map<std::string, double> limits_;
};

}  // namespace astvdp