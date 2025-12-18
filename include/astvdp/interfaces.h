#pragma once
#include <memory>
#include <vector>
#include <string>
#include "astvdp/types.h"

namespace astvdp {

struct FusedState {
    double timestamp;
    double roll = 0, pitch = 0, yaw = 0;
    double alt_msl = 0;
    double vn = 0, ve = 0, vd = 0;
    double q_dyn = 0;
};

class DataIngest {
public:
    virtual ~DataIngest() = default;
    virtual bool open(const std::string& source) = 0;
    virtual bool readNext(TimestampedSample& out) = 0;
    virtual void close() = 0;
};

class SensorFusion {
public:
    virtual ~SensorFusion() = default;
    virtual void process(const TimestampedSample& raw, FusedState& fused) = 0;
};

class SafetyVerifier {
public:
    virtual ~SafetyVerifier() = default;
    virtual bool loadLimitsFromDb(const std::string& db_path) = 0;
    virtual std::vector<Anomaly> check(const FusedState& state,
                                       const TimestampedSample& raw) = 0;
};

}  // namespace astvdp