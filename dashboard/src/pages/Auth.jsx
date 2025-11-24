import { useState, useEffect } from "react";
import { getCurrentUserFullName } from "@/lib/utils";
import Login from "@/components/AuthPage/Login";
import Logout from "@/components/AuthPage/Logout";
import Loader from "@/components/Loader";

const Auth = () => {
  const [currentUserFullName, setCurrentUserFullName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const fullName = await getCurrentUserFullName();
        setCurrentUserFullName(fullName);
      } catch (error) {
        console.error("Error fetching user name:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <Loader/>;


  return currentUserFullName ? (
    <div className="w-full h-full flex justify-center items-center">
      <Logout userName={currentUserFullName} />
    </div>
  ) : (
    <div className="w-full h-full flex justify-center items-center">
      <Login/>
    </div>
  );
};

export default Auth;
