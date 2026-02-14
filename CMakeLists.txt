cmake_minimum_required(VERSION 3.20)
project(ast-vdp VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(ASTVDP_SOURCES
    src/analysis/metrics_engine.cpp
    src/core/database.cpp
    src/diagnostics/diagnostic_engine.cpp
    src/fusion/complementary_fusion.cpp
    src/ingest/csv_ingest.cpp
    src/reporting/report_generator.cpp
    src/simulation/flight_simulator.cpp
    src/verification/safety_verifier.cpp
    src/main.cpp
)

add_executable(astvdp ${ASTVDP_SOURCES})

target_include_directories(astvdp PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

if(MSVC)
    target_compile_options(astvdp PRIVATE /W4 /permissive-)
else()
    target_compile_options(astvdp PRIVATE -Wall -Wextra -Wpedantic)
endif()

find_package(SQLite3 QUIET)
if(SQLite3_FOUND)
    if(TARGET SQLite::SQLite3)
        target_link_libraries(astvdp PRIVATE SQLite::SQLite3)
    else()
        target_include_directories(astvdp PRIVATE ${SQLite3_INCLUDE_DIRS})
        target_link_libraries(astvdp PRIVATE ${SQLite3_LIBRARIES})
    endif()
elseif(WIN32)
    target_link_libraries(astvdp PRIVATE winsqlite3)
    message(WARNING "SQLite3 package not found; falling back to Windows SDK winsqlite3.")
else()
    message(FATAL_ERROR "SQLite3 not found. Install sqlite3 via vcpkg or system packages.")
endif()

set(ASTVDP_SOURCE_DIR_DEF "${CMAKE_SOURCE_DIR}")
file(TO_CMAKE_PATH "${ASTVDP_SOURCE_DIR_DEF}" ASTVDP_SOURCE_DIR_DEF)
target_compile_definitions(astvdp PRIVATE ASTVDP_SOURCE_DIR="${ASTVDP_SOURCE_DIR_DEF}")

enable_testing()
add_test(NAME astvdp_help COMMAND $<TARGET_FILE:astvdp> --help)
set_tests_properties(astvdp_help PROPERTIES
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

add_test(
    NAME astvdp_simulate_smoke
    COMMAND $<TARGET_FILE:astvdp> --simulate --output-dir ctest_output --db-path ctest_output/test.db
)
set_tests_properties(astvdp_simulate_smoke PROPERTIES
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

message(STATUS "Optional: install wkhtmltopdf and run with --pdf for PDF export")
