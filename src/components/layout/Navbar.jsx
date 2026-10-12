import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function Navbar({ navItems, openDropdown, setOpenDropdown }) {
  const location = useLocation();

  const isActive = (path, children) => {
    if (path && location.pathname === path) return true;
    if (children) return children.some((c) => location.pathname === c.path);
    return false;
  };

  return (
    <ul className="hidden md:flex items-center justify-center gap-0.5 py-1 flex-wrap">
      {navItems.map((item) => (
        <li key={item.key} className="relative">
          {item.children ? (
            <>
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === item.key ? null : item.key)
                }
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                  isActive(undefined, item.children)
                    ? "bg-nav-active text-primary-foreground"
                    : "text-nav-foreground hover:bg-nav-hover"
                }`}
              >
                {item.label}
                <ChevronDown size={12} />
              </button>
              {openDropdown === item.key && (
                <div className="absolute top-full left-0 mt-0.5 bg-card border border-border rounded-md shadow-lg min-w-[220px] z-50 animate-fade-in">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`block px-4 py-2.5 text-xs font-medium transition-colors hover:bg-accent ${
                        location.pathname === child.path
                          ? "text-primary bg-accent"
                          : "text-foreground"
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
              className={`block px-3 py-2 text-xs font-semibold rounded transition-colors ${
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
