# Changelog

## 2026-02-18

- Breaking change: removed legacy chat skill aliases `excel-import` and `excel-export`.
- Import/export chat actions are now CSV-only: `csv-import`, `csv-export`.
- Removed Excel keyword triggers from chat routing (`excel`, `אקסל`).
- Migration note: any persisted records or tests that still reference `excel-*` must be updated to `csv-*`.
