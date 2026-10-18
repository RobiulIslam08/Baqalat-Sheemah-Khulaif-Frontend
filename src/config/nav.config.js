/**
 * Navigation Configuration
 * -------------------------
 * Defines all navigation menu items and their structure.
 * To add a new menu item, just add it here — no other file needs to change.
 */

/**
 * Build navigation items using the translation function.
 * @param {Function} t - Translation function from LanguageContext
 * @returns {Array} Navigation items
 */
export function getNavItems(t, role) {
  const visible = (roles) => !roles || role === "developer" || roles.includes(role);
  const items = [
    {
      key: "sales",
      label: t("nav.sales"),
      children: [
        { key: "newSales", label: t("sales.title"), path: "/" },
        { key: "salesReturn", label: t("salesReturn.title"), path: "/sales-return" },
      ],
    },
    {
      key: "purchase",
      label: t("nav.purchase"),
      children: [
        { key: "newPurchase", label: t("purchase.title"), path: "/purchase-invoice", roles: ["admin", "manager"] },
        { key: "viewPurchase", label: t("viewPurchase.title"), path: "/view-purchase-invoice" },
      ],
    },
    {
      key: "inventory",
      label: t("nav.inventory"),
      children: [
        { key: "addProduct", label: t("inv.addProducts"), path: "/add-product", roles: ["admin", "manager"] },
        { key: "viewProducts", label: t("inv.viewProducts"), path: "/view-products" },
        { key: "productsSuppliers", label: t("inv.productsSuppliers"), path: "/products-suppliers", roles: ["admin", "manager"] },
        { key: "stock", label: t("inv.stock"), path: "/stock" },
        { key: "stockReturn", label: t("inv.stockReturn"), path: "/stock-return", roles: ["admin", "manager"] },
        { key: "stockCorrection", label: t("inv.stockCorrection"), path: "/stock-correction", roles: ["admin", "manager"] },
        { key: "supplierCredit", label: t("inv.supplierCredit"), path: "/supplier-credit", roles: ["admin", "manager"] },
        { key: "customerCredit", label: t("inv.customerCredit"), path: "/customer-credit", roles: ["admin", "manager"] },
        { key: "cashAdjustment", label: t("inv.cashAdjustment"), path: "/cash-adjustment", roles: ["admin", "manager"] },
      ],
    },
    {
      key: "barcode",
      label: t("nav.barcode"),
      path: "/barcode",
    },
    {
      key: "expense",
      label: t("nav.expense"),
      path: "/expense",
    },
    {
      key: "masters",
      label: t("nav.masters"),
      children: [
        { key: "addSupplier", label: t("masters.addSupplier"), path: "/add-supplier", roles: ["admin", "manager"] },
        { key: "addCustomer", label: t("masters.addCustomer"), path: "/add-customer", roles: ["admin", "manager"] },
        { key: "addFormulation", label: t("masters.addFormulation"), path: "/add-formulation", roles: ["admin", "manager"] },
        { key: "addUser", label: t("masters.addUser"), path: "/add-user", roles: ["admin"] },
        { key: "linkBox", label: t("masters.linkBox"), path: "/link-box", roles: ["admin", "manager"] },
        { key: "deleteProducts", label: t("masters.deleteProducts"), path: "/delete-products", roles: ["admin"] },
        { key: "supplierCreditMaster", label: t("masters.supplierCreditMaster"), path: "/supplier-credit-master", roles: ["admin", "manager"] },
        { key: "customerCreditMaster", label: t("masters.customerCreditMaster"), path: "/customer-credit-master", roles: ["admin", "manager"] },
      ],
    },
    {
      key: "settings",
      label: t("nav.settings"),
      path: "/settings",
    },
    {
      key: "zatca",
      label: t("nav.zatca") || "ZATCA",
      path: "/zatca",
      roles: ["admin", "manager"],
    },
    {
      key: "reports",
      label: t("nav.reports"),
      path: "/sales-report",
    },
    {
      key: "backup",
      label: t("nav.backup"),
      path: "/backup",
      roles: ["admin"],
    },
    ...(role === "developer"
      ? [{ key: "developer", label: t("nav.developer"), path: "/license" }]
      : []),
    // {
    //   key: "help",
    //   label: t("nav.help"),
    //   path: "/help",
    // },
  ];

  return items
    .map((item) => {
      if (!item.children) return visible(item.roles) ? item : null;
      const children = item.children.filter((child) => visible(child.roles));
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);
}
