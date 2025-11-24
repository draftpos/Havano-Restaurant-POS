import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useState } from "react";
import { logout } from "@/lib/utils";

const Logout = ({ userName }) => {
  const [loading, setLoading] = useState(false);
  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      console.log("Logout successful");
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="h-[40vh] w-[50vh] flex justify-center items-center">
      <h1 className="font-bold">Hello {userName}</h1>
      <Button disabled={loading} onClick={handleLogout}>Sign Out</Button>
    </Card>
  );
};

export default Logout