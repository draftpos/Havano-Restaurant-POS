import { useState, useEffect } from "react";
import { call } from "@/lib/frappeClient";

export default function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await call.get("havano_restaurant_pos.api.get_booked_rooms");
      if (response.message && response.message.success) {
        setRooms(response.message.rooms || []);
      } else {
        setError(response.message?.message || "Failed to fetch rooms");
        setRooms([]);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError(err?.message || "Failed to fetch rooms");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return { rooms, loading, error, fetchRooms };
}
