import React, { ReactNode } from "react";
import Navbar from "./Navbar";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
};

export default PageLayout;
