import { useEffect, useMemo, useState } from "react";

import Error from "@/components/Error";
import Loader from "@/components/Loader";
import Container from "@/components/Shared/Container";
import OrderDetailsDialog from "@/components/Shared/OrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatDateTime,
  getOrdersPaginated,
} from "@/lib/utils";

const ALL_OPTION = "__all__";
const PAGE_SIZE = 20;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusOptions, setStatusOptions] = useState([]);
  const [waiterOptions, setWaiterOptions] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [waiterFilter, setWaiterFilter] = useState(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState(ALL_OPTION);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    return { from: today, to: endOfToday };
  });
  const [draftDateRange, setDraftDateRange] = useState(dateRange);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const normalizedDateRange = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return null;
    const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
    const toDate = dateRange?.to ? new Date(dateRange.to) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    return { from: fromDate, to: toDate };
  }, [dateRange]);

  const fromDateStr = normalizedDateRange?.from
    ? normalizedDateRange.from.toISOString().slice(0, 19).replace("T", " ")
    : null;
  const toDateStr = normalizedDateRange?.to
    ? normalizedDateRange.to.toISOString().slice(0, 19).replace("T", " ")
    : null;

  const fetchOrders = async () => {
    setOrderLoading(true);
    setOrderError(null);
    try {
      const result = await getOrdersPaginated({
        order_status: statusFilter !== ALL_OPTION ? statusFilter : undefined,
        waiter: waiterFilter !== ALL_OPTION ? waiterFilter : undefined,
        from_date: fromDateStr,
        to_date: toDateStr,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
      });
      setOrders(result.data);
      setTotal(result.total);
      if (page === 0) {
        setStatusOptions(result.status_options || []);
        setWaiterOptions(result.waiter_options || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrderError(err?.message || "Failed to load orders");
      setOrders([]);
      setTotal(0);
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, waiterFilter, fromDateStr, toDateStr]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isSameDay = (dateA, dateB) =>
        dateA?.getFullYear() === dateB?.getFullYear() &&
        dateA?.getMonth() === dateB?.getMonth() &&
        dateA?.getDate() === dateB?.getDate();
      if (isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today)) {
        return "Today";
      }
      if (isSameDay(dateRange.from, dateRange.to)) {
        return dateRange.from.toLocaleDateString();
      }
      return `${dateRange.from.toLocaleDateString()} — ${dateRange.to.toLocaleDateString()}`;
    }
    if (dateRange?.from) return `${dateRange.from.toLocaleDateString()} — …`;
    return "All dates";
  }, [dateRange]);

  useEffect(() => {
    if (statusFilter !== ALL_OPTION && !statusOptions.includes(statusFilter)) {
      setStatusFilter(ALL_OPTION);
    }
  }, [statusOptions, statusFilter]);

  useEffect(() => {
    if (isCalendarOpen) {
      setDraftDateRange({ from: dateRange?.from, to: dateRange?.to });
    }
  }, [isCalendarOpen, dateRange]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  if (orderLoading && orders.length === 0) {
    return <Loader />;
  }

  if (orderError && orders.length === 0) {
    return <Error />;
  }

  return (
    <>
      <Container>
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-primary">Orders</h1>
          <div className="flex flex-wrap items-start gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Filter by waiter</p>
              <Select
                value={waiterFilter}
                onValueChange={(value) => {
                  setWaiterFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-40 bg-secondary-background">
                  <SelectValue placeholder="All waiters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All waiters</SelectItem>
                  {waiterOptions.length === 0 ? (
                    <SelectItem value="__no_waiters__" disabled>
                      No waiters found
                    </SelectItem>
                  ) : (
                    waiterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Filter by status</p>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-40 bg-secondary-background">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All statuses</SelectItem>
                  {statusOptions.length === 0 ? (
                    <SelectItem value="__no_statuses__" disabled>
                      No statuses found
                    </SelectItem>
                  ) : (
                    statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Filter by date</p>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-start">
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-4" align="end">
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={draftDateRange}
                    className="[--cell-size:3rem] text-base"
                    onSelect={(range) => {
                      setDraftDateRange(
                        range ?? { from: undefined, to: undefined }
                      );
                    }}
                    initialFocus
                  />
                  <div className="mt-3 flex justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCalendarOpen(false)}
                    >
                      Cancel
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraftDateRange({
                            from: undefined,
                            to: undefined,
                          })
                        }
                        disabled={!draftDateRange?.from && !draftDateRange?.to}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDateRange({
                            from: draftDateRange?.from,
                            to: draftDateRange?.to,
                          });
                          setIsCalendarOpen(false);
                          setPage(0);
                        }}
                        disabled={
                          !(
                            (!draftDateRange?.from && !draftDateRange?.to) ||
                            (draftDateRange?.from && draftDateRange?.to)
                          )
                        }
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {orderLoading && orders.length > 0 && (
          <div className="mb-4 text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          {orders.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 py-10 text-center text-muted-foreground">
              <p className="text-lg font-semibold">No orders found</p>
              <p className="text-sm">
                Try adjusting the filters or clear them to view more orders.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <Card
                key={order.name}
                className="cursor-pointer transition hover:shadow-lg"
                onClick={() => {
                  setSelectedOrderId(order.name);
                  setIsDialogOpen(true);
                }}
              >
                <CardHeader className="flex justify-between items-center">
                  <p>
                    {`${order.name} ${
                      order.table_number ? "/ Table " + order.table_number : ""
                    }`}
                  </p>
                  {order.order_status && (
                    <Badge variant={order.order_status.toLowerCase()}>
                      {order.order_status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex justify-between text-gray-500 text-sm">
                  <p className="font-bold">
                    {order.waiter_name || order.waiter}
                  </p>
                  <p>{formatDateTime(order.creation)}</p>
                </CardContent>
                <hr className="border border-gray-600" />
                <CardFooter className="flex justify-between items-center font-bold">
                  <p>Total</p>
                  <p>{formatCurrency(order.total_price)}</p>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrev || orderLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={!hasNext || orderLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Container>
      <OrderDetailsDialog
        open={isDialogOpen}
        orderId={selectedOrderId}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedOrderId(null);
        }}
        onEdit={() => {
          setIsDialogOpen(false);
          setSelectedOrderId(null);
        }}
        onDeleted={fetchOrders}
      />
    </>
  );
};

export default Orders;
