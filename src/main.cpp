#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <argh.h>  

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
    argh::parser cmdl(argc, argv);
    std::string input_path;
    std::string mission_id = "TEST-001";
    std::string aircraft = "UNKNOWN";
    bool simulate = false;

    if (cmdl["--help"]) {
        std::cout << "Usage: astvdp [--input <file.csv>] [--simulate] "
                  << "[--mission <id>] [--aircraft <type>]\n";
        return 0;
    }

    if (cmdl("--simulate")) {
        simulate = true;
    } else if (cmdl("--input")) {
        cmdl({"--input"}, "") >> input_path;
    } else {
        std::cerr << "Error: Specify --input or --simulate\n";
        return 1;
    }

    if (cmdl("--mission")) cmdl({"--mission"}, "") >> mission_id;
    if (cmdl("--aircraft")) cmdl({"--aircraft"}, "") >> aircraft;

    // Initialize DB
    astvdp::Database db("output/test.db");
    if (!db.open()) {
        std::cerr << "Failed to open database\n";
        return 1;
    }

    // Create output dir
    system("mkdir output 2>nul || mkdir output");

    // Generate simulated data if needed
    if (simulate) {
        astvdp::FlightSimulator::Profile prof;
        prof.duration_sec = 120.0;
        prof.inject_vibration_fault = true;
        prof.inject_gnss_dropout = true;
        auto sim_data = astvdp::FlightSimulator::generate(prof);
        astvdp::FlightSimulator::saveToCsv(sim_data, "output/sim_flight.csv");
        input_path = "output/sim_flight.csv";
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
    verifier.loadLimitsFromDb("output/test.db");  // will use defaults if empty
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

    db.endSession(session_id, last_time);

    // Compute metrics
    auto metrics = astvdp::computeMetrics(all_anomalies, sample_count);
    db.saveSessionMetrics(session_id, metrics.stability_index, metrics.sensor_reliability,
                          metrics.mission_compliance, metrics.risk_classification);

    // Generate report
    std::cout << "Generating report...\n";
    bool html_ok = astvdp::ReportGenerator::generateHtmlReport(
        "output", mission_id, aircraft, last_time - first_time, metrics, all_anomalies
    );

    if (html_ok) {
        std::cout << "Report: output/report.html\n";
        // Optionally convert to PDF
        // astvdp::ReportGenerator::convertHtmlToPdf("output/report.html", "output/report.pdf");
    }

    std::cout << "Done. Session ID: " << session_id << "\n";
    return 0;
}