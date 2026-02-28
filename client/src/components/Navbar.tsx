import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/import", label: "Import" },
  { to: "/battle", label: "Battle" },
  { to: "/rankings", label: "Rankings" },
];

function linkClass(isActive: boolean) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-purple-500/20 text-purple-300"
      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
  }`;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { token, email, logout } = useAuth();

  const handleNavClick = () => setOpen(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <NavLink to="/" className="text-lg font-bold text-purple-400 shrink-0">
          YT Music Ranker
        </NavLink>

        {token && (
          <>
            {/* Desktop links */}
            <div className="hidden sm:flex gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Desktop user info + logout */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-gray-400 truncate max-w-[200px]">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* Mobile dropdown */}
      {open && token && (
        <div className="sm:hidden border-t border-gray-800 bg-gray-900 px-4 py-2 flex flex-col gap-1">
          {links.map((link) => {
            const isActive =
              link.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={linkClass(isActive)}
                onClick={handleNavClick}
              >
                {link.label}
              </NavLink>
            );
          })}
          <button
            onClick={() => {
              handleLogout();
              setOpen(false);
            }}
            className="text-left px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Logout ({email})
          </button>
        </div>
      )}
    </nav>
  );
}
