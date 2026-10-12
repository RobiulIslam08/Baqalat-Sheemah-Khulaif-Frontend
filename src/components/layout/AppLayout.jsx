import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLicense } from "@/contexts/LicenseContext";
import { getNavItems } from "@/config/nav.config";
import { Menu, X, AlertTriangle } from "lucide-react";
import Header from "./Header";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";

export default function AppLayout({ children }) {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const { license, isSuspended, isReadOnly, refreshLicense } = useLicense();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const navItems = getNavItems(t, user?.role);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  // If website is turned OFF (suspended) and current user is NOT developer, show full maintenance screen
  if (isSuspended && user?.role !== "developer") {
    return <MaintenanceScreen license={license} onRefresh={refreshLicense} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Read-Only Maintenance Banner */}
      {isReadOnly && user?.role !== "developer" && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 animate-bounce" />
            <span className="font-bold">
              {lang === "ar"
                ? "وضع الصيانة نشط (للقراءة فقط): تم إيقاف جميع عمليات الإضافة والتعديل والحذف مؤقتاً بأمر المطور."
                : "Maintenance Mode Active (Read-Only): Adding, editing, and deleting are temporarily disabled by the developer."}
            </span>
            {license?.note && (
              <span className="opacity-90 italic">
                — {license.note}
              </span>
            )}
          </div>
          {license?.supportPhone && (
            <span className="font-mono bg-amber-500/20 px-2.5 py-1 rounded text-xs font-semibold">
              📞 {license.supportPhone}
            </span>
          )}
        </div>
      )}

      <Header />

      {/* Navigation */}
      <nav className="bg-nav sticky top-0 z-50 shadow-md" ref={dropdownRef}>
        <div className="container mx-auto px-4">
          {/* Mobile toggle */}
          <div className="md:hidden flex items-center justify-between py-2">
            <span className="text-nav-foreground font-semibold text-sm">
              {t("nav.sales")}
            </span>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-nav-foreground p-1"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Desktop nav */}
          <Navbar
            navItems={navItems}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
          />

          {/* Mobile nav */}
          {mobileOpen && (
            <MobileNav
              navItems={navItems}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
