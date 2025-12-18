#include "csv_ingest.h"
#include <sstream>
#include <string>

namespace astvdp {

bool CsvIngest::open(const std::string& path) {
    file_.open(path);
    if (!file_.is_open()) return false;
    std::getline(file_, header_);
    return true;
}

bool CsvIngest::readNext(TimestampedSample& out) {
    if (!file_.good()) return false;
    std::string line;
    if (!std::getline(file_, line)) return false;

    std::stringstream ss(line);
    std::string cell;
    std::vector<double> vals;
    while (std::getline(ss, cell, ',')) {
        cell.erase(0, cell.find_first_not_of(" \t"));
        cell.erase(cell.find_last_not_of(" \t") + 1);
        if (cell.empty()) {
            vals.push_back(0.0);
            continue;
        }
        try {
            vals.push_back(std::stod(cell));
        } catch (...) {
            return false;
        }
    }
    if (vals.size() < 12) return false;

    out.timestamp = vals[0];
    out.imu_ax = vals[1]; out.imu_ay = vals[2]; out.imu_az = vals[3];
    out.imu_gx = vals[4]; out.imu_gy = vals[5]; out.imu_gz = vals[6];
    out.gps_lat = vals[7]; out.gps_lon = vals[8]; out.gps_alt = vals[9];
    out.gps_vx = vals[10]; out.gps_vy = vals[11];
    if (vals.size() > 12) out.static_pressure = vals[12];
    if (vals.size() > 13) out.temperature = vals[13];
    if (vals.size() > 16) {
        out.vib_x = vals[14]; out.vib_y = vals[15]; out.vib_z = vals[16];
    }
    return true;
}

void CsvIngest::close() {
    if (file_.is_open()) file_.close();
}

}  // namespace astvdp