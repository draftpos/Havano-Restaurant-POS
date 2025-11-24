import { useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableStore } from "@/stores/useTableStore";
import { useWaiterStore } from "@/stores/useWaiterStore";

const ALL_OPTION_VALUE = "__all__";

const OrdersFilter = ({ filters, setFilters, statuses = [] }) => {
  const tables = useTableStore((state) => state.tables);
  const loadingTables = useTableStore((state) => state.loadingTables);
  const errorTables = useTableStore((state) => state.errorTables);
  const fetchTables = useTableStore((state) => state.fetchTables);

  const waiters = useWaiterStore((state) => state.waiters);
  const loadingWaiters = useWaiterStore((state) => state.loadingWaiters);
  const errorWaiters = useWaiterStore((state) => state.errorWaiters);
  const fetchWaiters = useWaiterStore((state) => state.fetchWaiters);

  useEffect(() => {
    if (!loadingTables && tables.length === 0) {
      fetchTables();
    }
  }, [fetchTables, loadingTables, tables.length]);

  useEffect(() => {
    if (!loadingWaiters && waiters.length === 0) {
      fetchWaiters();
    }
  }, [fetchWaiters, loadingWaiters, waiters.length]);

  const tableValue = filters.table || ALL_OPTION_VALUE;
  const waiterValue = filters.waiter || ALL_OPTION_VALUE;
  const statusValue = filters.status || ALL_OPTION_VALUE;

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {/* Table filter */}
      <div className="space-y-2 w-full">
        <p>Table</p>
        <Select
          value={tableValue}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              table: value === ALL_OPTION_VALUE ? "" : value,
            })
          }
        >
          <SelectTrigger className="bg-secondary-background w-full">
            <SelectValue placeholder="Filter by Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION_VALUE}>All Tables</SelectItem>
            {loadingTables && (
              <SelectItem value="__loading__" disabled>
                Loading tables…
              </SelectItem>
            )}
            {errorTables && (
              <SelectItem value="__error__" disabled>
                Failed to load tables
              </SelectItem>
            )}
            {!loadingTables &&
              !errorTables &&
              tables.map((table) => {
                const value = String(table.table_number ?? table.name);
                const label = table.table_number
                  ? `Table ${table.table_number}`
                  : table.name;
                return (
                  <SelectItem key={table.name} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      </div>

      {/* Waiter filter */}
      <div className="space-y-2 w-full">
        <p>Waiter</p>
        <Select
          value={waiterValue}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              waiter: value === ALL_OPTION_VALUE ? "" : value,
            })
          }
        >
          <SelectTrigger className="bg-secondary-background w-full">
            <SelectValue placeholder="Filter by Waiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION_VALUE}>All Waiters</SelectItem>
            {loadingWaiters && (
              <SelectItem value="__loading__" disabled>
                Loading waiters…
              </SelectItem>
            )}
            {errorWaiters && (
              <SelectItem value="__error__" disabled>
                Failed to load waiters
              </SelectItem>
            )}
            {!loadingWaiters &&
              !errorWaiters &&
              waiters.map((waiter) => {
                const label = waiter.waiter_name || waiter.name;
                const value = String(
                  waiter.waiter_name ? waiter.waiter_name : waiter.name
                );
                return (
                  <SelectItem key={waiter.name} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter */}
      <div className="space-y-2 w-full">
        <p>Status</p>
        <Select
          value={statusValue}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              status: value === ALL_OPTION_VALUE ? "" : value,
            })
          }
        >
          <SelectTrigger className="bg-secondary-background w-full">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION_VALUE}>All Statuses</SelectItem>
            {statuses.length === 0 ? (
              <SelectItem value="__no_status__" disabled>
                No statuses available
              </SelectItem>
            ) : (
              statuses.map((status) => (
                <SelectItem key={status} value={String(status)}>
                  {status}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default OrdersFilter;
