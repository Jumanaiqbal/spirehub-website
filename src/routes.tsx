import type { RouteRecord } from "vite-react-ssg";
import { RootLayout } from "./components/layout/Layout";
import Home from "./pages/Home";
import Coworking from "./pages/Coworking";
import PrivateOffices from "./pages/PrivateOffices";
import MeetingRoomsPage from "./pages/MeetingRoomsPage";
import Mentorship from "./pages/Mentorship";
import Cafe from "./pages/Cafe";
import PortalLogin from "./pages/PortalLogin";
import Portal from "./pages/Portal";
import PortalPay from "./pages/PortalPay";
import NotFound from "./pages/NotFound";

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home />, entry: "src/pages/Home.tsx" },
      {
        path: "coworking",
        element: <Coworking />,
        entry: "src/pages/Coworking.tsx",
      },
      {
        path: "private-offices",
        element: <PrivateOffices />,
        entry: "src/pages/PrivateOffices.tsx",
      },
      {
        path: "meeting-rooms",
        element: <MeetingRoomsPage />,
        entry: "src/pages/MeetingRoomsPage.tsx",
      },
      {
        path: "mentorship",
        element: <Mentorship />,
        entry: "src/pages/Mentorship.tsx",
      },
      { path: "cafe", element: <Cafe />, entry: "src/pages/Cafe.tsx" },
      {
        path: "portal/login",
        element: <PortalLogin />,
        entry: "src/pages/PortalLogin.tsx",
      },
      { path: "portal", element: <Portal />, entry: "src/pages/Portal.tsx" },
      { path: "portal/pay", element: <PortalPay />, entry: "src/pages/PortalPay.tsx" },
      { path: "404", element: <NotFound />, entry: "src/pages/NotFound.tsx" },
      { path: "*", element: <NotFound />, entry: "src/pages/NotFound.tsx" },
    ],
  },
];
