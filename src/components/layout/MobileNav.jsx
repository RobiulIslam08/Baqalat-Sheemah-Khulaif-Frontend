import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function MobileNav({ navItems, openDropdown, setOpenDropdown }) {
  const location = useLocation();

  const isActive = (path, children) => {
    if (path && location.pathname === path) return true;
    if (children) return children.some((c) => location.pathname === c.path);
    return false;
  };

  return (
    <ul className="md:hidden pb-3 space-y-0.5 animate-fade-in">
      {navItems.map((item) => (
        <li key={item.key}>
          {item.children ? (
            <>
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === item.key ? null : item.key)
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded ${
                  isActive(undefined, item.children)
                    ? "bg-nav-active text-primary-foreground"
                    : "text-nav-foreground hover:bg-nav-hover"
                }`}
              >
                {item.label}
                <ChevronDown
                  size={14}
                  className={
                    openDropdown === item.key
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                />
              </button>
              {openDropdown === item.key && (
                <div className="ml-4 mt-0.5 space-y-0.5 animate-fade-in">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`block px-3 py-2 text-sm rounded ${
                        location.pathname === child.path
                          ? "text-nav-active font-semibold"
                          : "text-nav-foreground/80 hover:bg-nav-hover"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Link
              to={item.path}
              className={`block px-3 py-2.5 text-sm font-medium rounded ${
                isActive(item.path)
                  ? "bg-nav-active text-primary-foreground"
                  : "text-nav-foreground hover:bg-nav-hover"
              }`}
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
