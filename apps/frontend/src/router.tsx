import { createBrowserRouter } from "react-router-dom";

import {
  App,
  CapturePage,
  HomePage,
  RouteErrorBoundary,
  homeAction,
  homeLoader
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
      }
    ]
  }
]);

