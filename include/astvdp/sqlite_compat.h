#pragma once

#if __has_include(<sqlite3.h>)
#include <sqlite3.h>
#elif __has_include(<winsqlite/winsqlite3.h>)
#include <winsqlite/winsqlite3.h>
#else
#error "No SQLite header found. Install sqlite3 development headers."
#endif
