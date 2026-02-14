#pragma once
#include <string>
#include <vector>
#include "astvdp/types.h"

namespace astvdp {

struct SessionMetrics;

class ReportGenerator {
public:
    static bool generateHtmlReport(
        const std::string& output_dir,
        const std::string& mission_id,
        const std::string& aircraft,
        double duration_sec,
        const SessionMetrics& metrics,
        const std::vector<Anomaly>& anomalies
    );

    static bool convertHtmlToPdf(const std::string& html_path, const std::string& pdf_path);
};

}  // namespace astvdp
