# Aviation Systems Test, Verification & Predictive Diagnostics Platform (AST-VDP)

**Engineer-grade flight test analysis for aerospace verification workflows**

Free tools · C++17 · SQLite · DO-178C-aware

---

## 🎯 Purpose

AST-VDP is a ground-based flight test and verification platform designed to support aerospace engineering and certification workflows.

It enables:

- Ingesting real or simulated flight data  
- Fusing IMU, GPS, pressure, and vibration sensor inputs  
- Enforcing aircraft safety and performance envelopes  
- Detecting anomalies, drifts, and early fault precursors  
- Generating traceable, engineer-reviewed reports  

The platform is built with systems engineering rigor, focusing on determinism, traceability, and auditability.

---

## 🛠️ Requirements (All Free)

| Component | Tool |
|---------|------|
| Compiler | GCC ≥ 11, Clang ≥ 14, or MSVC (Visual Studio 2022) |
| Build System | CMake ≥ 3.20 |
| Package Manager | vcpkg (optional, recommended) |
| Libraries | SQLite3, Eigen3 |
| Reporting | wkhtmltopdf (optional, for PDF export) |

**Windows tip:** Install Visual Studio 2022 Community with C++ and CMake support.

---

## 📁 Project Structure

```text
ast-vdp/
├── CMakeLists.txt
├── include/astvdp/          # Public interfaces
├── src/
│   ├── core/               # Database, utilities
│   ├── ingest/             # CSV + real-time ingest
│   ├── fusion/             # Sensor fusion filters
│   ├── verification/       # Safety envelope checks
│   ├── diagnostics/        # Predictive health monitoring
│   ├── analysis/           # Metrics and scoring engine



---

## ⚙️ Build Instructions

### 1️⃣ Install Dependencies

#### Windows (vcpkg)

```powershell
git clone https://github.com/microsoft/vcpkg
.\vcpkg\bootstrap-vcpkg.bat
.\vcpkg\vcpkg install sqlite3:x64-windows eigen3:x64-windows
Linux (Debian / Ubuntu)
bash
Copy code
sudo apt install build-essential cmake libsqlite3-dev libeigen3-dev
2️⃣ Build
powershell
Copy code
# From project root
mkdir build
cd build

# Windows (Visual Studio)
cmake .. -G "Visual Studio 17 2022" -A x64 `
  -DCMAKE_TOOLCHAIN_FILE="C:/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build . --config Release

# Linux / Ninja
cmake .. -DCMAKE_BUILD_TYPE=Release
make
Note: If not using vcpkg, ensure SQLite3 and Eigen3 are available in default include paths.

▶️ How to Run
Option 1: Simulate Flight (with injected faults)
powershell
Copy code
.\Release\astvdp.exe --simulate
Option 2: Analyze Real CSV Log
powershell
Copy code
.\Release\astvdp.exe --input examples/sample_flight.csv --mission REAL-01 --aircraft F16
Output
output/test.db – Full session database with detected anomalies

output/report.html – Engineer-review report

output/report.pdf – Optional (requires wkhtmltopdf)

🧪 How to Test
Build the executable

Run simulation test:

powershell
Copy code
.\Release\astvdp.exe --simulate
✅ Expected Results
No crashes

output/report.html generated

Report shows Risk Classification: Major (due to injected GNSS dropout + vibration fault)

Validate report contents:

Metrics values < 100%

Anomaly table includes:

gnss_dropout

vibration_buildup

Verdict: FAIL

(Optional) Inspect database:

powershell
Copy code
sqlite3 output/test.db "SELECT type, severity FROM anomalies;"
📊 Report Features
The HTML report includes:

Summary metrics: Stability Index, Sensor Reliability, Mission Compliance

Risk classification: Critical / Major / Minor / Observation

Timestamped anomaly timeline with severity highlighting

Final verdict: PASS / FAIL / OBSERVATIONS

Why HTML?
Portable, version-controllable, printable, and reviewable without proprietary tools—suitable for certification and audit workflows.

🧰 Design Principles
Modular: Ingest, fusion, verification, and diagnostics are isolated for independent validation

Traceable: Every anomaly links to a defined safety envelope or diagnostic rule

Deterministic: Predictable execution and reproducible results

Ground-tool compliant: Engineered for aerospace verification use

Lean: Minimal dependencies and focused scope

📜 License
MIT License — free for commercial and personal use.

🚀 Next Steps (Planned)
Add Matplot++ envelope plots (altitude, dynamic pressure, rates)

Support UDP / serial real-time streaming

Add requirement-ID traceability in reports

CLI option for PDF export
