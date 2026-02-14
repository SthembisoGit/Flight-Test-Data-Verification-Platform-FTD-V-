#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <filesystem>
#include <system_error>
#include "argh/argh.h"

#include "astvdp/interfaces.h"
#include "ingest/csv_ingest.h"
#include "fusion/complementary_fusion.h"
#include "verification/safety_verifier.h"
#include "diagnostics/diagnostic_engine.h"
#include "core/database.h"
#include "analysis/metrics_engine.h"
#include "reporting/report_generator.h"
#include "simulation/flight_simulator.h"

int main(int argc, char* argv[]) {
    argh::parser cmdl;
    cmdl.add_params({"--input", "--mission", "--aircraft", "--output-dir", "--db-path"});
    cmdl.parse(argc, argv);
    std::string input_path;
    std::string mission_id = "TEST-001";
    std::string aircraft = "UNKNOWN";
    std::string output_dir = "output";
    std::string db_path;
    bool simulate = false;
    bool generate_pdf = false;

    if (cmdl["--help"]) {
        std::cout << "Usage: astvdp [--input <file.csv>] [--simulate] "
                  << "[--mission <id>] [--aircraft <type>] "
                  << "[--output-dir <dir>] [--db-path <file.db>] [--pdf]\n";
        return 0;
    }

    if (cmdl["--simulate"]) simulate = true;
    cmdl({"--input"}, "") >> input_path;

    if (simulate && !input_path.empty()) {
        std::cerr << "Error: Use either --simulate or --input, not both\n";
        return 1;
    }

    if (!simulate && input_path.empty()) {
        std::cerr << "Error: Specify --input or --simulate\n";
        return 1;
    }

    cmdl({"--mission"}, mission_id) >> mission_id;
    cmdl({"--aircraft"}, aircraft) >> aircraft;
    cmdl({"--output-dir"}, output_dir) >> output_dir;
    cmdl({"--db-path"}, "") >> db_path;
    if (cmdl["--pdf"]) generate_pdf = true;

    if (db_path.empty()) {
        db_path = (std::filesystem::path(output_dir) / "test.db").string();
    }

    std::error_code fs_err;
    std::filesystem::create_directories(output_dir, fs_err);
    if (fs_err) {
        std::cerr << "Failed to create output directory: " << output_dir << "\n";
        return 1;
    }

    // Initialize DB
    astvdp::Database db(db_path);
    if (!db.open()) {
        std::cerr << "Failed to open database: " << db_path << "\n";
        return 1;
    }

    // Generate simulated data if needed
    if (simulate) {
        astvdp::FlightSimulator::Profile prof;
        prof.duration_sec = 120.0;
        prof.inject_vibration_fault = true;
        prof.inject_gnss_dropout = true;
        auto sim_data = astvdp::FlightSimulator::generate(prof);
        const std::string sim_path = (std::filesystem::path(output_dir) / "sim_flight.csv").string();
        if (!astvdp::FlightSimulator::saveToCsv(sim_data, sim_path)) {
            std::cerr << "Failed to write simulated CSV: " << sim_path << "\n";
            return 1;
        }
        input_path = sim_path;
    }

    // Ingest
    astvdp::CsvIngest ingest;
    if (!ingest.open(input_path)) {
        std::cerr << "Failed to open input: " << input_path << "\n";
        return 1;
    }

    // Modules
    astvdp::ComplementaryFusion fusion;
    astvdp::SafetyVerifierImpl verifier;
    verifier.loadLimitsFromDb(db_path);  // falls back to defaults if table is empty/missing
    astvdp::DiagnosticEngine diagnostics;
    std::vector<astvdp::Anomaly> all_anomalies;
    size_t sample_count = 0;
    double first_time = -1, last_time = -1;

    // Start session
    int64_t session_id = db.startSession(mission_id, aircraft);
    if (session_id < 0) {
        std::cerr << "DB session failed\n";
        return 1;
    }

    // Process loop
    astvdp::TimestampedSample raw;
    while (ingest.readNext(raw)) {
        if (first_time < 0) first_time = raw.timestamp;
        last_time = raw.timestamp;

        // Store raw data
        db.insertFlightData(session_id, raw);

        // Fuse
        astvdp::FusedState fused;
        fusion.process(raw, fused);

        // Verify
        auto verif_anomalies = verifier.check(fused, raw);
        for (const auto& a : verif_anomalies) {
            db.insertAnomaly(session_id, a);
            all_anomalies.push_back(a);
        }

        // Diagnose
        diagnostics.process(raw);
        auto diag_anomalies = diagnostics.getNewAnomalies();
        for (const auto& a : diag_anomalies) {
            db.insertAnomaly(session_id, a);
            all_anomalies.push_back(a);
        }

        sample_count++;
    }
    ingest.close();

    if (sample_count == 0) {
        std::cerr << "No valid samples were processed from: " << input_path << "\n";
        db.endSession(session_id, 0.0);
        return 1;
    }

    db.endSession(session_id, last_time);

    // Compute metrics
    auto metrics = astvdp::computeMetrics(all_anomalies, sample_count);
    db.saveSessionMetrics(session_id, metrics.stability_index, metrics.sensor_reliability,
                          metrics.mission_compliance, metrics.risk_classification);

    // Generate report
    std::cout << "Generating report...\n";
    bool html_ok = astvdp::ReportGenerator::generateHtmlReport(
        output_dir, mission_id, aircraft, last_time - first_time, metrics, all_anomalies
    );

    if (html_ok) {
        const std::string html_path = (std::filesystem::path(output_dir) / "report.html").string();
        std::cout << "Report: " << html_path << "\n";

        if (generate_pdf) {
            const std::string pdf_path = (std::filesystem::path(output_dir) / "report.pdf").string();
            if (astvdp::ReportGenerator::convertHtmlToPdf(html_path, pdf_path)) {
                std::cout << "PDF: " << pdf_path << "\n";
            } else {
                std::cerr << "PDF generation failed. Ensure wkhtmltopdf is installed and in PATH.\n";
            }
        }
    } else {
        std::cerr << "Failed to generate HTML report.\n";
        return 1;
    }

    std::cout << "Done. Session ID: " << session_id << "\n";
    return 0;
}
