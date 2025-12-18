#pragma once
#include <string>
#include <vector>
#include "astvdp/types.h"

struct sqlite3;

namespace astvdp {

class Database {
public:
    explicit Database(const std::string& path);
    ~Database();

    bool open();
    void close();

    // Flight session
    int64_t startSession(const std::string& mission_id, const std::string& aircraft);
    bool endSession(int64_t session_id, double end_time);

    // Data & anomalies
    bool insertFlightData(int64_t session_id, const TimestampedSample& sample);
    bool insertAnomaly(int64_t session_id, const Anomaly& anomaly);

    // Metrics
    bool saveSessionMetrics(int64_t session_id, double stability, double reliability,
                            double compliance, const std::string& risk_class);

private:
    std::string path_;
    sqlite3* db_ = nullptr;
};

}  // namespace astvdp