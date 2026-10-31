import React from "react";
import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const PortalLayout: React.FC = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};
