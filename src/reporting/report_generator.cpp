#include "report_generator.h"
#include "analysis/metrics_engine.h"
#include <fstream>
#include <sstream>
#include <cstdlib>

namespace astvdp {

static std::string severityToString(Severity s) {
    switch (s) {
        case Severity::Critical: return "Critical";
        case Severity::Major: return "Major";
        case Severity::Minor: return "Minor";
        default: return "Observation";
    }
}

static std::string toLower(const std::string& s) {
    std::string r = s;
    for (auto& c : r) c = std::tolower(c);
    return r;
}

static std::string verdictFromClass(const std::string& risk) {
    if (risk == "Critical") return "FAIL";
    if (risk == "Major") return "FAIL";
    if (risk == "Minor") return "OBSERVATIONS";
    return "PASS";
}

bool ReportGenerator::generateHtmlReport(
    const std::string& output_dir,
    const std::string& mission_id,
    const std::string& aircraft,
    double duration_sec,
    const SessionMetrics& metrics,
    const std::vector<Anomaly>& anomalies) {

    std::ifstream ifs("docs/templates/report_template.html");
    if (!ifs.is_open()) return false;

    std::string content((std::istreambuf_iterator<char>(ifs)),
                         std::istreambuf_iterator<char>());
    ifs.close();

    // Replace placeholders
    auto replace = [&](const std::string& key, const std::string& value) {
        size_t pos = content.find(key);
        while (pos != std::string::npos) {
            content.replace(pos, key.length(), value);
            pos = content.find(key, pos + value.length());
        }
    };

    replace("{{MISSION_ID}}", mission_id);
    replace("{{AIRCRAFT}}", aircraft);
    replace("{{DURATION_SEC}}", std::to_string(static_cast<int>(duration_sec)));
    replace("{{STABILITY_INDEX}}", std::to_string(static_cast<int>(metrics.stability_index * 100)) + "%");
    replace("{{SENSOR_RELIABILITY}}", std::to_string(static_cast<int>(metrics.sensor_reliability * 100)) + "%");
    replace("{{MISSION_COMPLIANCE}}", metrics.mission_compliance >= 1.0 ? "100%" : "0%");
    replace("{{RISK_CLASS}}", metrics.risk_classification);
    replace("{{RISK_CLASS_LOW}}", toLower(metrics.risk_classification));

    std::string verdict = verdictFromClass(metrics.risk_classification);
    replace("{{VERDICT}}", verdict);
    replace("{{VERDICT_CLASS}}", 
        (verdict == "PASS") ? "verdict-pass" : 
        (verdict == "FAIL") ? "verdict-fail" : "verdict-obs");

    // Build anomaly table rows
    std::ostringstream rows;
    for (const auto& a : anomalies) {
        std::string sev_str = severityToString(a.severity);
        std::string row = "<tr class=\"" + toLower(sev_str) + "\">"
            "<td>" + std::to_string(a.timestamp) + "</td>"
            "<td>" + a.type + "</td>"
            "<td>" + a.param + "</td>"
            "<td>" + sev_str + "</td>"
            "<td>" + a.details + "</td>"
            "</tr>\n";
        rows << row;
    }
    replace("{{ANOMALY_ROWS}}", rows.str());

    // Write HTML
    std::ofstream ofs(output_dir + "/report.html");
    if (!ofs.is_open()) return false;
    ofs << content;
    ofs.close();

    return true;
}

bool ReportGenerator::convertHtmlToPdf(const std::string& html_path, const std::string& pdf_path) {
    // Requires wkhtmltopdf in PATH
    std::string cmd = "wkhtmltopdf --quiet --disable-smart-shrinking \"" + html_path + "\" \"" + pdf_path + "\"";
    int result = std::system(cmd.c_str());
    return (result == 0);
}

}  // namespace astvdp