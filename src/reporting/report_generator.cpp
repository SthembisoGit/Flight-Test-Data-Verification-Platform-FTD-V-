#include "report_generator.h"
#include "analysis/metrics_engine.h"
#include <cctype>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <vector>

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
    for (auto& c : r) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return r;
}

static std::filesystem::path resolveTemplatePath() {
    std::vector<std::filesystem::path> candidates;

    candidates.emplace_back("docs/templates/report_template.html");
    candidates.emplace_back(std::filesystem::current_path() / "docs" / "templates" / "report_template.html");
#ifdef ASTVDP_SOURCE_DIR
    candidates.emplace_back(std::filesystem::path(ASTVDP_SOURCE_DIR) / "docs" / "templates" / "report_template.html");
#endif

    std::error_code ec;
    for (const auto& path : candidates) {
        if (std::filesystem::exists(path, ec)) {
            return path;
        }
    }

    return {};
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

    const std::filesystem::path template_path = resolveTemplatePath();
    if (template_path.empty()) return false;

    std::ifstream ifs(template_path);
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
    std::error_code ec;
    std::filesystem::create_directories(output_dir, ec);

    std::ofstream ofs((std::filesystem::path(output_dir) / "report.html").string());
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
