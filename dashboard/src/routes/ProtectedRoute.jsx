import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import Loader from "@/components/Loader";
import { getCurrentUserFullName } from "@/lib/utils";

const ProtectedRoute = ({ children, redirectTo = "/auth" }) => {
  const location = useLocation();
  const [state, setState] = useState({
    loading: true,
    userFullName: null,
  });

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        const fullName = await getCurrentUserFullName();
        if (!isMounted) return;
        setState({
          loading: false,
          userFullName: fullName,
        });
      } catch (error) {
        console.error("ProtectedRoute auth check failed:", error);
        if (!isMounted) return;
        setState({
          loading: false,
          userFullName: null,
        });
      }
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.loading) {
    return <Loader />;
  }

  if (!state.userFullName) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname === redirectTo ? undefined : location,
        }}
      />
    );
  }

  if (children) {
    return children;
  }

  return <Outlet />;
};

export default ProtectedRoute;
