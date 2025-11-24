import { NavLink, useNavigate } from "react-router-dom";

import Container from "@/components/Shared/Container";
import navLinks from "@/navLinks";
import { useCartStore } from "@/stores/useCartStore";

const Footer = () => {
  const { startNewTakeAwayOrder } = useCartStore();
  const navigate = useNavigate();

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
            {navLinks.map((link) => {
              if (!link.active) {
                // Render disabled/non-active links
                return (
                  <span
                    key={link.name}
                    className="text-gray-400 cursor-not-allowed py-1 opacity-50"
                  >
                    {link.name}
                  </span>
                );
              }
              
              // Render active links
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
