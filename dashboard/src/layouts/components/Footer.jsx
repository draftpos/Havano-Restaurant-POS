import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import Container from "@/components/Shared/Container";
import getNavLinks from "@/navLinks";
import { useCartStore } from "@/stores/useCartStore";

const Footer = () => {
  const [navLinks, setNavLinks] = useState([]);
  const { startNewTakeAwayOrder } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLinks = async () => {
      const links = await getNavLinks();
      setNavLinks(links);
    };
    fetchLinks();
  }, []);

  const handleNavClick = (e, link) => {
    if (link.path === "/menu") {
      e.preventDefault();
      startNewTakeAwayOrder();
      navigate(link.path);
    }
  };

  return (
    <div>
      <hr className="border border-primary" />
      <Container>
        <div className="py-4">
          <div className="flex items-center justify-between">
            {/* App Icon - Link to main Frappe app */}
            <a
              href="/app"
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              title="Go to App"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700 hover:text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </a>
            {navLinks.map((link) => {
              if (!link.active) {
                return (
                  <span
                    key={link.name}
                    className="text-gray-400 cursor-not-allowed py-1 opacity-50"
                  >
                    {link.name}
                  </span>
                );
              }

              return (
                <NavLink
                  to={link.path}
                  key={link.name}
                  end
                  onClick={(e) => handleNavClick(e, link)}
                  className={({ isActive }) =>
                    isActive
                      ? "text-primary font-semibold border-y-2 border-primary py-1 transition-colors"
                      : "text-primary/70 hover:text-primary hover:border-b-2 hover:border-primary py-1 transition-colors"
                  }
                >
                  {link.name}
                </NavLink>
              );
            })}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Footer;
