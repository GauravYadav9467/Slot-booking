import { Outlet } from "react-router-dom";
import Footer from "./footer";
import Navbar from "./Navbar";

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-[#0F2128] text-white">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
