# AST-VDP

Aviation Systems Test, Verification and Predictive Diagnostics Platform (AST-VDP) is a C++17 ground-analysis CLI for flight test data.

## What It Does

- Ingests simulated or CSV flight data
- Fuses IMU and GNSS-derived state
- Runs safety envelope checks and diagnostics
- Stores sessions, raw data, anomalies, and metrics in SQLite
- Produces an HTML engineering report (optional PDF export)

## Requirements

Primary target: Windows (Visual Studio 2022 Build Tools).

| Component | Required |
| --- | --- |
| CMake | 3.20+ and available in `PATH` |
| Compiler toolchain | MSVC (VS 2022 Build Tools) |
| Dependency manager | vcpkg (external install) |
| Library | SQLite3 (via vcpkg manifest) |
| Optional | `wkhtmltopdf` in `PATH` for `--pdf` |

## Dependency Model

This repo uses external vcpkg manifest mode (`vcpkg.json`). The repository does not track a vendored `vcpkg/` checkout.

You must set:

- `VCPKG_ROOT` -> absolute path to your vcpkg installation root

Example (PowerShell):

```powershell
$env:VCPKG_ROOT = "C:\dev\vcpkg"
```

## Build (Windows, Presets)

From project root:

```powershell
cmake --preset windows-msvc-release
cmake --build --preset windows-msvc-release
```

Executable output:

`build/windows-msvc-release/Release/astvdp.exe`

### Windows fallback build (no vcpkg toolchain)

If vcpkg toolchain bootstrap is unavailable in your environment, AST-VDP can still build on Windows via SDK `winsqlite3` fallback:

```powershell
cmake --preset windows-msvc-local
cmake --build --preset windows-msvc-local
```

Executable output:

`build/windows-msvc-local/Release/astvdp.exe`

## Run

### 1) Simulation run

```powershell
.\build\windows-msvc-release\Release\astvdp.exe --simulate
```

### 2) CSV input run

```powershell
.\build\windows-msvc-release\Release\astvdp.exe `
  --input examples/sample_flight.csv `
  --mission REAL-01 `
  --aircraft F16
```

### 3) Optional PDF export

```powershell
.\build\windows-msvc-release\Release\astvdp.exe --simulate --pdf
```

If `wkhtmltopdf` is not installed/in `PATH`, the run still completes and prints a PDF-specific warning.

## CLI Options

```text
--help
--simulate
--input <file.csv>
--mission <id>
--aircraft <type>
--output-dir <dir>     (default: output)
--db-path <file.db>    (default: <output-dir>/test.db)
--pdf                  (optional PDF conversion)
```

## Outputs

Default outputs (under `output/`):

- `test.db` - SQLite database with sessions, data, anomalies, metrics
- `sim_flight.csv` - generated only when using `--simulate`
- `report.html` - generated report
- `report.pdf` - only when `--pdf` is used and `wkhtmltopdf` is available

## Tests

CTest smoke tests are configured in CMake:

```powershell
ctest --preset windows-msvc-release
```

or, for local fallback builds:

```powershell
ctest --preset windows-msvc-local
```

Included tests:

- `astvdp_help`
- `astvdp_simulate_smoke`

## Troubleshooting

1. `cmake` not recognized
- Install CMake and ensure `cmake.exe` is in `PATH`.

2. `VCPKG_ROOT` not set or invalid
- Set `VCPKG_ROOT` to your vcpkg root before running configure.

3. SQLite not found during configure
- Ensure vcpkg manifest mode can resolve `sqlite3` and toolchain path is valid.
- On Windows, fallback configure without vcpkg toolchain (above) links to `winsqlite3` from the Windows SDK.

4. PDF generation fails
- Install `wkhtmltopdf` and ensure it is in `PATH`, then rerun with `--pdf`.

## Project Layout

```text
ast-vdp/
  CMakeLists.txt
  CMakePresets.json
  vcpkg.json
  include/astvdp/
  src/
  database/schema.sql
  docs/templates/report_template.html
  docs/audit-log.md
  examples/sample_flight.csv
```

## License

MIT (as intended by project metadata).

## Full-Stack Web Platform

A full-stack layer now exists under `platform/`:

- NestJS API (`platform/apps/api`)
- NestJS Worker (`platform/apps/worker`)
- Next.js Frontend (`platform/apps/web`)
- MySQL schema + migrations (`platform/prisma`)
- Docker Compose stack (`platform/docker-compose.yml`)

Read `platform/README.md` for end-to-end setup, env variables, and run instructions.
