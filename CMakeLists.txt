cmake_minimum_required(VERSION 3.20)
project(ast-vdp VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Directories
include_directories(include)
include_directories(src)

# Find SQLite3
find_package(PkgConfig QUIET)
if(PkgConfig_FOUND)
    pkg_check_modules(SQLITE3 QUIET sqlite3)
endif()
if(NOT SQLITE3_FOUND)
    find_path(SQLITE3_INCLUDE_DIR sqlite3.h)
    find_library(SQLITE3_LIBRARY sqlite3)
    if(SQLITE3_INCLUDE_DIR AND SQLITE3_LIBRARY)
        set(SQLITE3_FOUND TRUE)
        set(SQLITE3_INCLUDE_DIRS ${SQLITE3_INCLUDE_DIR})
        set(SQLITE3_LIBRARIES ${SQLITE3_LIBRARY})
    endif()
endif()

if(NOT SQLITE3_FOUND)
    message(FATAL_ERROR "SQLite3 not found")
endif()

# Sources
file(GLOB_RECURSE ASTVDP_SOURCES src/*.cpp)

# Executable
add_executable(astvdp ${ASTVDP_SOURCES} src/main.cpp)

# Link
target_include_directories(astvdp PRIVATE ${SQLITE3_INCLUDE_DIRS})
target_link_libraries(astvdp ${SQLITE3_LIBRARIES})

# Install wkhtmltopdf note
message(STATUS "Ensure wkhtmltopdf is in PATH for PDF reports")