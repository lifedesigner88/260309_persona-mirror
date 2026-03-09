import { createBrowserRouter } from "react-router-dom";

import {
  AdminUsersPage,
  App,
  CapturePage,
  HomePage,
  LoginPage,
  RouteErrorBoundary,
  SignupPage,
  adminUsersLoader,
  homeAction,
  homeLoader,
  loginAction,
  logoutAction,
  signupAction
} from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
        loader: homeLoader,
        action: homeAction
      },
      {
        path: "capture",
        element: <CapturePage />
      },
      {
        path: "auth/signup",
        element: <SignupPage />,
        action: signupAction
      },
      {
        path: "auth/login",
        element: <LoginPage />,
        action: loginAction
      },
      {
        path: "auth/logout",
        action: logoutAction
      },
      {
        path: "admin/users",
        element: <AdminUsersPage />,
        loader: adminUsersLoader
      }
    ]
  }
]);
