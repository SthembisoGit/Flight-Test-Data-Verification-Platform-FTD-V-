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

