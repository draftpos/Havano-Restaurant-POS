import { Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Error from "@/components/Error";
import Loader from "@/components/Loader";
import Container from "@/components/Shared/Container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent,CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBgColor } from "@/lib/utils";
import { useTableStore } from "@/stores/useTableStore";

const Tables = () => {
  const {
    tables,
    floors,
    loadingTables,
    loadingFloors,
    errorTables,
    errorFloors,
    fetchTables,
    fetchFloors,
  } = useTableStore();
  const [filter, setFilter] = useState({
    status: "All",
    floor: "All",
  });

  useEffect(() => {
    fetchTables();
    fetchFloors();
  }, [fetchFloors, fetchTables]);

  if (loadingTables || loadingFloors) {
    return <Loader />;
  }

  if (errorTables || errorFloors) {
    console.error("Error fetching tables:", errorTables);
    console.error("Error fetching floors:", errorFloors);
    return <Error />;
  }
  return (
    <>
      <Container>
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-primary">Tables</h1>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label className="text-lg font-bold">Select Floor</Label>
              <Select
                value={filter.floor}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, floor: value }))
                }
              >
                <SelectTrigger className="bg-background w-40">
                  <SelectValue placeholder="Select Floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {floors.map((floor) => (
                    <SelectItem key={floor.name} value={floor.name}>
                      {floor.floor_name || floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-lg font-bold">Select Status</Label>
              <Select
                value={filter.status}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="bg-background w-40">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-4">
          {tables
            .filter(
              (table) =>
                (filter.status === "All" || table.status === filter.status) &&
                (filter.floor === "All" || table.floor === filter.floor)
            )
            .map((table) => (
              <Link key={table.name} to={`/tables/${table.name}`}>
                <Card className="cursor-pointer">
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>{`Table ${table.table_number}`}</CardTitle>
                    <Badge variant={table.status.toLowerCase()}>
                      {table.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center mb-4">
                      <div
                        className="flex items-center rounded-full p-4"
                        style={{ backgroundColor: getBgColor() }}
                      >
                        <Utensils size={24} className="text-white" />
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Capacity: {table.capacity}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      </Container>
    </>
  );
};

export default Tables;
