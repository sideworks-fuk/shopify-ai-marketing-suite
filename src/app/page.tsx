"use client"

import { AppProvider, useAppContext } from "../contexts/AppContext"
import MainLayout from "../components/layout/MainLayout"
import SalesDashboard from "../components/dashboards/SalesDashboard"
import CustomerDashboard from "../components/dashboards/CustomerDashboard"
import AIInsightsDashboard from "../components/dashboards/AIInsightsDashboard"

function DashboardContent() {
  const { activeTab } = useAppContext()

  switch (activeTab) {
    case "sales":
      return <SalesDashboard />
    case "customers":
      return <CustomerDashboard />
    case "ai":
      return <AIInsightsDashboard />
    default:
      return <SalesDashboard />
  }
}

export default function Home() {
  return (
    <AppProvider>
      <MainLayout>
        <DashboardContent />
      </MainLayout>
    </AppProvider>
  )
}
