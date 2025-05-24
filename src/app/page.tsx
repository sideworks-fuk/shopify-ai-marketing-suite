"use client"

import { AppProvider } from "@/contexts/AppContext"
import MainLayout from "@/components/layout/MainLayout"
import SalesDashboard from "@/components/dashboards/SalesDashboard"
import CustomerDashboard from "@/components/dashboards/CustomerDashboard"
import AIInsightsDashboard from "@/components/dashboards/AIInsightsDashboard"
import { useAppContext } from "@/contexts/AppContext"

export default function Home() {
  return (
    <AppProvider>
      <MainLayoutWrapper />
    </AppProvider>
  )
}

function MainLayoutWrapper() {
  const { activeTab } = useAppContext()

  return (
    <MainLayout>
      {activeTab === "sales" && <SalesDashboard />}
      {activeTab === "customers" && <CustomerDashboard />}
      {activeTab === "ai" && <AIInsightsDashboard />}
    </MainLayout>
  )
}
