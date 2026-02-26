import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/import", label: "Import" },
  { to: "/battle", label: "Battle" },
  { to: "/rankings", label: "Rankings" },
];

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <NavLink to="/" className="text-lg font-bold text-purple-400 shrink-0">
          YT Music Ranker
        </NavLink>
        <div className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
