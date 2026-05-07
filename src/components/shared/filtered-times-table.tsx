'use client';

import type { ReactNode } from 'react';
import { TimesFilters, type TimesFilterKey } from './times-filters';
import { TimesTable, type TimesColumn, type TimesTableEntry } from './times-table';

type Props = {
  times: TimesTableEntry[];
  columns: TimesColumn[];
  /** When set, renders the filters card above the table. Omit for no filters. */
  filters?: TimesFilterKey[];
  filtersStorageKey?: string;
  favoriteCarIds?: string[];
  emptyMessage?: string;
  /** Per-row controls. Only usable from client contexts (functions can't cross
   * the RSC boundary). */
  renderActions?: (entry: TimesTableEntry) => ReactNode;
  /** Sort by best total ascending, DNF last. Default true. */
  sortByBest?: boolean;
};

/**
 * Client wrapper that bundles `TimesFilters` + `TimesTable`. Designed to be
 * called from both server pages (with serializable props) and client
 * components (which can also hand in `renderActions`).
 */
export function FilteredTimesTable({
  times,
  columns,
  filters,
  filtersStorageKey,
  favoriteCarIds,
  emptyMessage,
  renderActions,
  sortByBest = true,
}: Props) {
  const sort = (entries: TimesTableEntry[]) => {
    if (!sortByBest) return entries;
    return [...entries].sort((a, b) => {
      if (a.isDnf && !b.isDnf) return 1;
      if (!a.isDnf && b.isDnf) return -1;
      return a.totalMs - b.totalMs;
    });
  };

  if (!filters || filters.length === 0) {
    return (
      <TimesTable
        entries={sort(times)}
        columns={columns}
        renderActions={renderActions}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <TimesFilters
      times={times}
      show={filters}
      favoriteCarIds={favoriteCarIds}
      storageKey={filtersStorageKey}
    >
      {(filtered) => (
        <TimesTable
          entries={sort(filtered)}
          columns={columns}
          renderActions={renderActions}
          emptyMessage={emptyMessage}
        />
      )}
    </TimesFilters>
  );
}
