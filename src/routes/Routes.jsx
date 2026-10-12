/**
 * Routes Configuration
 * ---------------------
 * All application routes are defined here.
 * Unauthenticated users are redirected to /login.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";

// Auth
import LoginPage from "@/features/auth/LoginPage";

// Sales
import SalesPage from "@/features/sales/SalesPage";
import SalesReturnPage from "@/features/sales/SalesReturnPage";
import SalesReportPage from "@/features/sales/SalesReportPage";

// Purchase
import PurchaseInvoicePage from "@/features/purchase/PurchaseInvoicePage";
import ViewPurchaseInvoicePage from "@/features/purchase/ViewPurchaseInvoicePage";

// Inventory
import AddProductPage from "@/features/inventory/AddProductPage";
import ViewProductsPage from "@/features/inventory/ViewProductsPage";
import StockPage from "@/features/inventory/StockPage";
import StockReturnPage from "@/features/inventory/StockReturnPage";
import StockCorrectionPage from "@/features/inventory/StockCorrectionPage";
import ProductsSuppliersPage from "@/features/inventory/ProductsSuppliersPage";
import SupplierCreditPage from "@/features/inventory/SupplierCreditPage";
import CustomerCreditPage from "@/features/inventory/CustomerCreditPage";
import CashAdjustmentPage from "@/features/inventory/CashAdjustmentPage";

// Masters
import AddSupplierPage from "@/features/masters/AddSupplierPage";
import AddCustomerPage from "@/features/masters/AddCustomerPage";
import AddFormulationPage from "@/features/masters/AddFormulationPage";
import AddUserPage from "@/features/masters/AddUserPage";
import LinkBoxPage from "@/features/masters/LinkBoxPage";
import DeleteProductsPage from "@/features/masters/DeleteProductsPage";
import SupplierCreditMasterPage from "@/features/masters/SupplierCreditMasterPage";
import CustomerCreditMasterPage from "@/features/masters/CustomerCreditMasterPage";

// Others
import BarcodePage from "@/features/barcode/BarcodePage";
import ExpensePage from "@/features/expense/ExpensePage";
import SettingsPage from "@/features/settings/SettingsPage";
import ChangePasswordPage from "@/features/settings/ChangePasswordPage";
import BackupPage from "@/features/backup/BackupPage";
import LicensePage from "@/features/license/LicensePage";
import HelpPage from "@/features/help/HelpPage";
import NotFound from "@/features/NotFound";

/** Wrapper that requires authentication. */
function ProtectedRoute({ children, developerOnly = false, roles }) {
  const { isAuthenticated, isLoading, user } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (developerOnly && user?.role !== "developer") {
    return <Navigate to="/" replace />;
  }

  if (roles && user?.role !== "developer" && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}

      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all wrapped in AppLayout */}
      <Route path="/" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/sales-return" element={<ProtectedRoute><SalesReturnPage /></ProtectedRoute>} />
      <Route path="/sales-report" element={<ProtectedRoute><SalesReportPage /></ProtectedRoute>} />

      <Route path="/purchase-invoice" element={<ProtectedRoute roles={["admin", "manager"]}><PurchaseInvoicePage /></ProtectedRoute>} />
      <Route path="/view-purchase-invoice" element={<ProtectedRoute><ViewPurchaseInvoicePage /></ProtectedRoute>} />

      <Route path="/add-product" element={<ProtectedRoute roles={["admin", "manager"]}><AddProductPage /></ProtectedRoute>} />
      <Route path="/view-products" element={<ProtectedRoute><ViewProductsPage /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
      <Route path="/stock-return" element={<ProtectedRoute roles={["admin", "manager"]}><StockReturnPage /></ProtectedRoute>} />
      <Route path="/stock-correction" element={<ProtectedRoute roles={["admin", "manager"]}><StockCorrectionPage /></ProtectedRoute>} />
      <Route path="/products-suppliers" element={<ProtectedRoute roles={["admin", "manager"]}><ProductsSuppliersPage /></ProtectedRoute>} />
      <Route path="/supplier-credit" element={<ProtectedRoute roles={["admin", "manager"]}><SupplierCreditPage /></ProtectedRoute>} />
      <Route path="/customer-credit" element={<ProtectedRoute roles={["admin", "manager"]}><CustomerCreditPage /></ProtectedRoute>} />
      <Route path="/cash-adjustment" element={<ProtectedRoute roles={["admin", "manager"]}><CashAdjustmentPage /></ProtectedRoute>} />

      <Route path="/add-supplier" element={<ProtectedRoute roles={["admin", "manager"]}><AddSupplierPage /></ProtectedRoute>} />
      <Route path="/add-customer" element={<ProtectedRoute roles={["admin", "manager"]}><AddCustomerPage /></ProtectedRoute>} />
      <Route path="/add-formulation" element={<ProtectedRoute roles={["admin", "manager"]}><AddFormulationPage /></ProtectedRoute>} />
      <Route path="/add-user" element={<ProtectedRoute roles={["admin"]}><AddUserPage /></ProtectedRoute>} />
      <Route path="/link-box" element={<ProtectedRoute roles={["admin", "manager"]}><LinkBoxPage /></ProtectedRoute>} />
      <Route path="/delete-products" element={<ProtectedRoute roles={["admin"]}><DeleteProductsPage /></ProtectedRoute>} />
      <Route path="/supplier-credit-master" element={<ProtectedRoute roles={["admin", "manager"]}><SupplierCreditMasterPage /></ProtectedRoute>} />
      <Route path="/customer-credit-master" element={<ProtectedRoute roles={["admin", "manager"]}><CustomerCreditMasterPage /></ProtectedRoute>} />

      <Route path="/barcode" element={<ProtectedRoute><BarcodePage /></ProtectedRoute>} />
      <Route path="/expense" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/backup" element={<ProtectedRoute roles={["admin"]}><BackupPage /></ProtectedRoute>} />
      <Route path="/license" element={<ProtectedRoute developerOnly><LicensePage /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
