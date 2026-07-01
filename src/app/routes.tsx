import { createBrowserRouter } from "react-router";
import Home from "./Home";
import Dashboard from "./Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
]);
