import React from "react";

import Container from "@/components/Shared/Container";

const Header = () => {
  return (
    <>
      <div>
        <Container>
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-primary">LOGO</h1>
            <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
          </div>
        </Container>
      </div>
      <hr className="border border-primary" />
    </>
  );
};

export default Header;
