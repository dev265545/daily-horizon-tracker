import { NavLink, useNavigate } from "react-router-dom";
import { Factory, LayoutDashboard, FileText, Settings, Calculator, LogOut, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

interface AppNavProps {
  onLogout: () => void;
}

const AppNav = ({ onLogout }: AppNavProps) => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("prodtrack-theme");
    return stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("prodtrack-theme", dark ? "dark" : "light");
  }, [dark]);

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/reports", icon: FileText, label: "Reports" },
    { to: "/salary-sheet", icon: Calculator, label: "Salary Sheet" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="no-print sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-primary" />
              <span className="font-heading font-bold text-foreground text-lg">ProdTrack</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) => `nav-item flex items-center gap-1.5 ${isActive ? "nav-item-active" : ""}`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="btn-icon" title="Toggle theme">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={onLogout} className="btn-ghost flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `nav-item flex items-center gap-1.5 whitespace-nowrap ${isActive ? "nav-item-active" : ""}`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default AppNav;
