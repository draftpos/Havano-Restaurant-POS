import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import MenuPage from "@/pages/MenuPage";
import TransactionPage from "@/pages/TransactionPage";
import Auth from "@/pages/Auth";
import ProtectedRoute from "./ProtectedRoute";

import Home from "../pages/Home";
import Orders from "../pages/Orders";
import TableDetails from "../pages/TableDetails";
import Tables from "../pages/Tables";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MenuPage />} />
        <Route path="tables">
          <Route index element={<Tables />} />
          <Route path=":id" element={<TableDetails />} />
        </Route>
        <Route path="orders">
          <Route index element={<Orders />} />
          <Route path=":id" element={<h1>Order</h1>} />
        </Route>
        <Route path="menu" element={<MenuPage />} />
        <Route path="transaction">
          <Route index element={<TransactionPage />} />
        </Route>
        <Route path="*" element={<h1>404</h1>} />
      </Route>
      <Route path="/auth" element={<MainLayout />}>
        <Route index element={<Auth />} />
      </Route>
      <Route path="*" element={<h1>404</h1>} />
    </Route>
  ),
  {
    basename: "/dashboard",
  }
);

export default router;
