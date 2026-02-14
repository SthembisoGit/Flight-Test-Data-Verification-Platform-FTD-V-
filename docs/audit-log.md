# AST-VDP Audit Log

Date: 2026-02-14

## Entry 01 - Dependency and Repo Hygiene

- Finding:
  - `vcpkg` was tracked as a gitlink without `.gitmodules`, causing inconsistent dependency tracking.
  - `.gitignore` was missing.
- Fix:
  - Removed tracked gitlink entry for `vcpkg` from the index.
  - Added `.gitignore` with build/output/artifact ignores and local `vcpkg/` ignore.
  - Added `vcpkg.json` manifest with required dependency `sqlite3`.
  - Added `CMakePresets.json` with:
    - `windows-msvc-release` using `$env{VCPKG_ROOT}` toolchain path.
    - `windows-msvc-local` fallback preset (Windows SDK `winsqlite3`).
- Validation Evidence:
  - `git rm --cached -f vcpkg` completed successfully.
  - New files present: `.gitignore`, `vcpkg.json`, `CMakePresets.json`.

## Entry 02 - Build System Refactor

- Finding:
  - `CMakeLists.txt` used global include directories and source globbing with duplicate `main.cpp` risk.
  - No test integration for smoke validation.
- Fix:
  - Replaced globbing with explicit source list.
  - Switched to target-scoped include directories.
  - Added warnings profile for MSVC/non-MSVC.
  - Switched SQLite discovery to `find_package(SQLite3 REQUIRED)` with imported-target fallback handling.
  - Added compile definition `ASTVDP_SOURCE_DIR` for runtime template fallback.
  - Added CTest smoke tests: `astvdp_help`, `astvdp_simulate_smoke`.
- Validation Evidence:
  - `CMakeLists.txt` updated with explicit source list, target-based configuration, and tests.

## Entry 03 - Compile and Runtime Defect Fixes

- Finding:
  - Compile blockers: include path mismatch for `argh`, missing std headers, helper declaration order.
  - Runtime blockers: output dir creation order, missing DB schema init, report template path fragility.
- Fix:
  - Updated `src/main.cpp` to include `argh/argh.h`, add filesystem-based directory creation, and add CLI flags:
    - `--output-dir`
    - `--db-path`
    - `--pdf`
  - Added DB schema auto-initialization in `Database::open()` via `initializeSchema()`.
  - Added robust report template resolution with source-root fallback.
  - Fixed helper ordering in `safety_verifier.cpp` and warning-cleanups.
  - Added missing headers in core files (`<ctime>`, `<algorithm>`, `<cctype>`).
- Validation Evidence:
  - Updated files:
    - `src/main.cpp`
    - `src/core/database.h`
    - `src/core/database.cpp`
    - `src/verification/safety_verifier.cpp`
    - `src/analysis/metrics_engine.cpp`
    - `src/reporting/report_generator.cpp`

## Entry 04 - Documentation and Sample Input

- Finding:
  - README build/run sections were malformed and not aligned to project behavior.
  - `examples/sample_flight.csv` referenced in docs but absent.
- Fix:
  - Rewrote `README.md` with Windows-first setup, build/run/test instructions, CLI flags, and troubleshooting.
  - Added deterministic sample input file at `examples/sample_flight.csv`.
- Validation Evidence:
  - New/updated docs and sample file are present and tracked.

## Entry 05 - Final Validation and Status

- Finding:
  - Preset configure path (`windows-msvc-release`) failed in this environment due vcpkg tool bootstrap/compiler-detect behavior (not project source errors).
- Fix:
  - Added Windows fallback SQLite link path (`winsqlite3`) when external SQLite3 package is unavailable.
  - Performed full validation using local Visual Studio generator build.
- Validation Evidence:
  - Configure (fallback): success
    - `cmake -S . -B build/windows-msvc-local -G "Visual Studio 17 2022" -A x64`
  - Build (fallback): success
    - `cmake --build build/windows-msvc-local --config Release`
    - Output binary: `build/windows-msvc-local/Release/astvdp.exe`
  - CTest smoke tests: success
    - `astvdp_help` passed
    - `astvdp_simulate_smoke` passed
  - Manual E2E run: `--simulate` success
    - Output files: `output_sim/test.db`, `output_sim/sim_flight.csv`, `output_sim/report.html`
  - Manual E2E run: `--input examples/sample_flight.csv` success
    - Output files: `output_input/test.db`, `output_input/report.html`
  - Optional PDF path: graceful failure verified without `wkhtmltopdf`
    - Run completed, printed actionable PDF warning
  - Failure-path checks verified
    - No mode selected -> clear error
    - Invalid CSV path -> clear error
    - Invalid output dir -> clear error
  - SQLite integrity checks via query script
    - Required tables present in generated DBs:
      - `flight_sessions`, `flight_data`, `anomalies`, `session_metrics`, `safety_limits`, `verification_results`
    - Row counts confirmed for both simulated and input runs.

## Final Project Status

- Build status: Working (validated on Windows via Visual Studio generator).
- Runtime status: Working for `--simulate`, `--input`, report generation, DB writes, metrics, and anomaly persistence.
- CLI status: Updated and backward-compatible with new operational flags (`--output-dir`, `--db-path`, `--pdf`).
- Documentation status: Updated (`README.md`) and auditable (`docs/audit-log.md`).
- Remaining environment-specific requirement for full preset path:
  - Functional external vcpkg bootstrap/toolchain in local environment for `windows-msvc-release` preset.
