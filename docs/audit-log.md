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

## Entry 06 - Full-Stack Platform Layer Added

- Finding:
  - Project had a validated C++ CLI workflow but no web/API/worker stack.
  - Needed desktop-first frontend, backend orchestration, queue processing, and MySQL operational persistence.
- Fix:
  - Added `platform/` monorepo with:
    - NestJS API (`platform/apps/api`)
    - NestJS Worker + BullMQ (`platform/apps/worker`)
    - Next.js frontend (`platform/apps/web`)
    - Prisma schema and initial MySQL migration (`platform/prisma`)
    - Shared contracts package (`platform/packages/contracts`)
    - Docker Compose orchestration (`platform/docker-compose.yml`)
  - Implemented required API endpoints and Swagger docs.
  - Implemented async job execution pipeline spawning existing `astvdp` binary.
  - Implemented SQLite-to-MySQL import for session/metrics/anomaly operational data.
  - Implemented engineering-themed frontend routes:
    - `/`
    - `/runs/new`
    - `/jobs/[jobId]`
    - `/sessions`
    - `/sessions/[sessionId]`
    - `/sessions/[sessionId]/report`
  - Added runbook docs and env templates in `platform/README.md` and `platform/.env.example`.
- Validation Evidence:
  - Code scaffolding completed for backend/worker/frontend and infrastructure files.
  - Unit test scaffolding added for API health and worker engine command utilities.
  - Full runtime validation depends on local MySQL/Redis availability and `ENGINE_BINARY_PATH` configuration at execution time.

## Entry 07 - Full-Stack Hardening and Validation Pass

- Finding:
  - Jest TypeScript config did not include test globals, causing API/worker tests to fail.
  - Web app used one API base URL for both browser and server-side rendering, which breaks in Docker networking.
  - Worker Docker container expected external engine path but did not build a Linux engine binary.
- Fix:
  - Added `tsconfig.spec.json` for API and worker; updated Jest config to use it.
  - Split web API bases:
    - `CLIENT_API_BASE` from `NEXT_PUBLIC_API_BASE_URL`
    - `SERVER_API_BASE` from `API_BASE_URL_SERVER`
  - Updated client routes/components to use client API base for browser requests and report iframe URLs.
  - Updated worker Dockerfile to compile Linux `astvdp` binary in image and copy to `/usr/local/bin/astvdp`.
  - Updated worker runtime defaults for Docker and host resolution in `platform/apps/worker/src/common/config.ts`.
  - Updated env/docs (`platform/.env.example`, `platform/README.md`) to reflect host vs Docker settings.
- Validation Evidence:
  - API test: pass
    - `npm test -w @astvdp/api`
  - Worker test: pass
    - `npm test -w @astvdp/worker`
  - API build: pass
    - `npm run build -w @astvdp/api`
  - Worker build: pass
    - `npm run build -w @astvdp/worker`
  - Web build: pass
    - `npm run build -w @astvdp/web`
  - C++ engine smoke:
    - `--simulate` generated `output_web_sim/test.db`, `output_web_sim/sim_flight.csv`, `output_web_sim/report.html`
    - `--input examples/sample_flight.csv` generated `output_web_input/test.db`, `output_web_input/report.html`
    - SQLite checks confirmed tables plus inserted rows for sessions/metrics/anomalies.
  - Infrastructure execution blocker in this environment:
    - `docker`, `mysql`, and `redis-server` CLIs are not installed, so live queue + MySQL runtime E2E could not be executed here.
