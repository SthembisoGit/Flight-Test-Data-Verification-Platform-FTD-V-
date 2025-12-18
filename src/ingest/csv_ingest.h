#pragma once
#include "astvdp/interfaces.h"
#include <string>
#include <fstream>

namespace astvdp {

class CsvIngest : public DataIngest {
public:
    bool open(const std::string& path) override;
    bool readNext(TimestampedSample& out) override;
    void close() override;

private:
    std::ifstream file_;
    std::string header_;
};

}  // namespace astvdp