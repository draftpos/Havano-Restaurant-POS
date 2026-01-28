import { Eye, PenBox, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast, Toaster } from "sonner";

import Error from "@/components/Error";
import Loader from "@/components/Loader";
import Container from "@/components/Shared/Container";
import OrderDetailsDialog from "@/components/Shared/OrderDetailsDialog";
import PaymentDialog from "@/components/MenuPage/PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/frappeClient";
import { formatCurrency, markTableAsPaid, getCustomers, getDefaultCustomer, processTablePayment, getCurrentUser } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { ta } from "zod/v4/locales";

const TableDetails = () => {
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isTableStatusUpdating, setIsTableStatusUpdating] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isWaiterNotConfiguredDialogOpen, setIsWaiterNotConfiguredDialogOpen] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [loadingWaiters, setLoadingWaiters] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { register, setValue, watch } = useForm({
    defaultValues: {
      customerName: "",
      waiter: "",
      remarks: "",
    },
  });

  const {
    tableOrders,
    tableOrdersLoading,
    tableOrdersError,
    fetchTableOrders,
  } = useOrderStore();

  const {
    tableDetails,
    loadingTableDetails,
    errorTableDetails,
    fetchTableDetails,
    fetchTables,
  } = useTableStore();

  const { startTableOrder, loadCartFromOrder, clearCart } = useCartStore();

  useEffect(() => {
    if (!id) return;
    fetchTableDetails(id);
  }, [id, fetchTableDetails]);

  useEffect(() => {
    if (!id) return;
    fetchTableOrders(id);
  }, [id, fetchTableOrders]);

  useEffect(() => {
    const fetchCustomersData = async () => {
      setLoadingCustomers(true);
      try {
        const customerList = await getCustomers();
        setCustomers(customerList);
      } catch (err) {
        console.error("Error loading customers:", err);
        toast.error("Failed to load customers", {
          description: "Please try refreshing the page",
          duration: 4000,
        });
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomersData();
  }, []);

  useEffect(() => {
    const setDefaultCustomer = async () => {
      if (tableDetails?.customer_name) {
        // Check if customer_name is a customer ID (exists in customers list)
        const customer = customers.find(
          (c) => c.name === tableDetails.customer_name || c.customer_name === tableDetails.customer_name
        );
        if (customer) {
          setValue("customerName", customer.name);
        } else {
          // If not found, it might be just a display name, try to find by customer_name
          const customerByName = customers.find(
            (c) => c.customer_name === tableDetails.customer_name
          );
          if (customerByName) {
            setValue("customerName", customerByName.name);
          } else {
            // If still not found, set as is (might be a text value)
            setValue("customerName", tableDetails.customer_name);
          }
        }
      } else {
        // Set default customer from settings if no customer is set
        try {
          const defaultCustomer = await getDefaultCustomer();
          if (defaultCustomer) {
            setValue("customerName", defaultCustomer);
          } else {
            setValue("customerName", "");
          }
        } catch (err) {
          console.error("Error fetching default customer:", err);
          setValue("customerName", "");
        }
      }
    };
    // Only set default customer after customers are loaded
    if (customers.length > 0 || !loadingCustomers) {
      setDefaultCustomer();
    }
  }, [tableDetails, customers, loadingCustomers, setValue]);

  useEffect(() => {
    const setWaiterFromUser = async () => {
      // Always get waiter from logged in user, regardless of table status
      setLoadingWaiters(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.name) {
          // Get waiter name from HA Waiter doctype where user matches logged in user
          const waiterDocs = await db.getDocList("HA Waiter", {
            fields: ["name", "user", "waiter_name"],
            filters: {
              user: currentUser.name
            }
          });
          if (waiterDocs && waiterDocs.length > 0) {
            // Set the waiter in the select list (only the waiter for logged in user)
            setWaiters(waiterDocs);
            // Use the name field from HA Waiter doctype (document name, not waiter_name)
            // This matches the SelectItem value which uses waiter.name
            const waiterName = waiterDocs[0].name;
            setValue("waiter", waiterName, { shouldValidate: true });
          } else {
            // No waiter configured for this user
            setWaiters([]);
            setValue("waiter", "", { shouldValidate: true });
            // Show popup message
            setIsWaiterNotConfiguredDialogOpen(true);
          }
        }
      } catch (err) {
        console.error("Error getting waiter from user:", err);
        setWaiters([]);
        setValue("waiter", "", { shouldValidate: true });
        // Show popup message on error
        setIsWaiterNotConfiguredDialogOpen(true);
      } finally {
        setLoadingWaiters(false);
      }
    };
    
    // Set waiter even if table is occupied
    if (tableDetails) {
      setWaiterFromUser();
    }
  }, [tableDetails, setValue]);



  const handleNewOrder = () => {
    clearCart();
    startTableOrder(id, watch("waiter"), null, watch("customerName"));
    navigate(`/menu`);
  };

  const handleViewOrder = (orderId) => {
    if (!orderId) {
      return;
    }
    setSelectedOrderId(orderId);
    setIsOrderDialogOpen(true);
  };

  const handleEditOrder = async (orderId) => {
    if (!orderId) {
      return;
    }
    await loadCartFromOrder(orderId);
    startTableOrder(id, watch("waiter"), orderId, watch("customerName"));
    navigate(`/menu`);
  };
  
  const handleUnassignTable = async () => {
    if (!id) {
      return;
    }
    try {
      setIsTableStatusUpdating(true);
      await db.updateDoc("HA Table", id, {
        status: "Available",
      });
      fetchTableDetails(id);
    } catch (err) {
      console.error("Table status update error:", err);
    } finally {
      setIsTableStatusUpdating(false);
    }
  };

  const handleTableAction = async (event) => {
    event.preventDefault();
    if (!tableDetails?.name) {
      return;
    }

    const waiter = watch("waiter");
    if (!waiter) {
      // Check if user is configured as waiter
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.name) {
          const waiters = await db.getDocList("HA Waiter", {
            fields: ["name", "user"],
            filters: {
              user: currentUser.name
            }
          });
          
          if (!waiters || waiters.length === 0) {
            // User is not configured as waiter, show popup
            setIsWaiterNotConfiguredDialogOpen(true);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking waiter configuration:", err);
      }
      
      toast.error("Select a waiter before placing an order.");
      return;
    }

    if (tableDetails.status !== "Occupied") { 
      try {
        await db.updateDoc("HA Table", tableDetails.name, {
          status: "Occupied",
        });
      handleNewOrder();
      } catch (err) {
        console.error("Table status update error:", err);
      }
    }else{
      handleNewOrder();
    }
  };

  const handleMarkAsPaid = () => {
    // Open payment dialog with total from all orders
    setIsPaymentDialogOpen(true);
  };

  const handleTablePaymentPaid = async (paymentResult) => {
    // Payment dialog will handle the actual payment processing
    // This callback is just for UI updates after payment
    // Only refresh after payment is fully complete
    if (paymentResult && paymentResult.success && paymentResult.message === "Payment successful") {
      // Refresh data only after payment is fully complete
      if (id) {
        await fetchTableOrders(id);
        await fetchTableDetails(id);
        // Refresh tables list to reflect latest changes
        await fetchTables();
      }
    }
  };

  if (errorTableDetails) {
    return <Error message={errorTableDetails} />;
  }

  if (loadingTableDetails) {
    return <Loader />;
  }

  return (
    <Container>
      <Toaster richColors duration={4000} position="top-center" />
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary my-4">
            {tableDetails?.table_number
              ? `Table ${tableDetails.table_number}`
              : id}
          </h1>
          {tableDetails?.status ? (
            <Badge variant={tableDetails.status.toLowerCase()}>
              {tableDetails.status}
            </Badge>
          ) : null}
        </div>
        <div className="flex gap-4">
          <div className="flex-3">
            <Card className="min-h-[80vh]">
              <CardHeader>
                <CardTitle>
                  Orders for{" "}
                  {tableDetails?.table_number
                    ? `Table ${tableDetails.table_number}`
                    : id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table className="px-4" maxHeight="36rem">
                  <TableHeader>
                    <TableRow className="h-10 font-bold">
                      <TableHead className="text-xl font-bold">
                        Order No
                      </TableHead>
                      <TableHead className="text-xl font-bold text-right">
                        Status
                      </TableHead>
                      <TableHead className="text-xl font-bold text-right">
                        Value
                      </TableHead>
                      <TableHead className="text-xl font-bold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-none">
                    {tableOrdersLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Loading orders…
                        </TableCell>
                      </TableRow>
                    ) : tableOrdersError ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-red-500"
                        >
                          <Error />
                        </TableCell>
                      </TableRow>
                    ) : tableOrders.length > 0 ? (
                      tableOrders.map((order) => (
                        <TableRow key={order.order}>
                          <TableCell>{order.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                typeof order.order_status  === "string"
                                  ? order.order_status .toLowerCase()
                                  : "secondary"
                              }
                            >
                              {order.order_status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(order.total_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              onClick={() => handleViewOrder(order.name)}
                            >
                              <Eye />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No unpaid orders for this table
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="font-bold text-right">
                        {formatCurrency(
                          tableOrders.reduce((sum, o) => sum + (o.total_price || o.value || 0), 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="flex-2 h-full">
            <Card className="min-h-[80vh]">
              <CardHeader>
                <CardTitle>
                  {tableDetails?.table_number
                    ? `Table ${tableDetails.table_number} Details`
                    : id + " Details"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTableAction}>
                  <div className="flex flex-col gap-4">
                    <div className="space-y-4">
                      <Label>Customer Name</Label>
                      <Combobox
                        type="customer"
                        options={customers.map((cust) => ({
                          value: cust.name,
                          name: cust.name,
                          customer_name: cust.customer_name,
                          label: cust.customer_name || cust.name,
                        }))}
                        value={watch("customerName")}
                        onValueChange={(value) =>
                          setValue("customerName", value, { shouldValidate: true })
                        }
                        placeholder={loadingCustomers ? "Loading..." : "Select customer"}
                        searchPlaceholder="Search customers..."
                        disabled={loadingCustomers}
                        className="w-full"
                        onCreate
                        onCreated={(newCustomer) => {
                          // Add new customer to the list and refresh
                          const refreshCustomers = async () => {
                            try {
                              const customerList = await getCustomers();
                              setCustomers(customerList);
                            } catch (err) {
                              console.error("Error refreshing customers:", err);
                            }
                          };
                          refreshCustomers();
                          setValue("customerName", newCustomer.value, { shouldValidate: true });
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label>Waiter</Label>
                      <Select
                        value={watch("waiter") || ""}
                        onValueChange={(value) =>
                          setValue("waiter", value, { shouldValidate: true })
                        }
                        disabled={loadingWaiters || !!watch("waiter")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select waiter" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingWaiters && (
                            <SelectItem value="loading" disabled>
                              Loading waiters...
                            </SelectItem>
                          )}
                          {!loadingWaiters && waiters.length === 0 && (
                            <SelectItem value="no-waiters" disabled>
                              No waiters available
                            </SelectItem>
                          )}
                          {waiters.map((waiter) => (
                            <SelectItem key={waiter.name} value={waiter.name}>
                              {waiter.waiter_name || waiter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-4">
                      <Label>Remarks</Label>
                      <Textarea
                        {...register("remarks")}
                        className="min-h-[200px]"
                      />
                    </div>
                    <div className="mb-4">
                      <Button
                        type="submit"
                        block
                        disabled={
                          !watch("waiter") ||
                          loadingWaiters ||
                          isTableStatusUpdating
                        }
                      >
                        New Order
                      </Button>
                    </div>
                  </div>
                </form>
                
                {tableDetails?.status === "Available" && (
                  <Button className="bg-gray-300 hover:bg-gray-200 text-black" block>
                    Book Table
                  </Button>
                )}
                {tableDetails?.status === "Occupied" && tableOrders.length > 0 && (
  <div className="flex gap-2 mb-4">
    {/* Close Table */}
    <Button
      className="bg-gray-300 hover:bg-gray-200 text-black flex-1"
      onClick={handleMarkAsPaid}
      disabled={isMarkingPaid}
    >
      Close Table
    </Button>

    {/* Print Bill */}
    <Button
      className="bg-blue-500 hover:bg-blue-400 text-white flex-1"
      onClick={() => {
        if (!tableDetails?.table_number) return;
        window.open(
          `/api/method/havano_restaurant_pos.api.download_table_orders_json?table_number=${tableDetails.table_number}`,
          "_blank"
        );
      }} // define this function to handle printing
    >
      Print Bill
    </Button>
  </div>
)}

              

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <OrderDetailsDialog
        open={isOrderDialogOpen}
        orderId={selectedOrderId}
        onClose={() => {
          setIsOrderDialogOpen(false);
          setSelectedOrderId(null);
        }}
        onEdit={handleEditOrder}
        onDeleted={async () => {
          if (id) {
            await fetchTableOrders(id);
          }
          await fetchTableDetails(id);
        }}
      />
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onPaid={handleTablePaymentPaid}
        cartItems={tableOrders.flatMap(order => {
          // Create summary items from orders
          return [{
            name: order.name,
            item_name: `Order ${order.name}`,
            quantity: 1,
            price: order.total_price || order.value || 0,
            standard_rate: order.total_price || order.value || 0
          }];
        })}
        customer={tableDetails?.customer_name || watch("customerName") || ""}
        orderId={null}
        orderPayload={{
          order_type: "Dine In",
          customer_name: tableDetails?.customer_name || watch("customerName") || "",
          table: id,
          waiter: watch("waiter") || tableDetails?.assigned_waiter || "",
          order_items: tableOrders.flatMap(order => {
            // We need to fetch order items, but for now use summary
            return [{
              name: order.name,
              item_code: order.name,
              quantity: 1,
              qty: 1,
              price: order.total_price || order.value || 0,
              rate: order.total_price || order.value || 0
            }];
          }),
          table_orders: tableOrders.map(order => order.name || order.order)
        }}
        isExistingTransaction={false}
        transactionDoctype={null}
        transactionName={null}
      />
      <Dialog
        open={isWaiterNotConfiguredDialogOpen}
        onOpenChange={setIsWaiterNotConfiguredDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waiter Not Configured</DialogTitle>
            <DialogDescription>
              No available waiter, please contact admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsWaiterNotConfiguredDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default TableDetails;
