"use client"

import { AppProvider } from "../contexts/AppContext"
import MainLayout from "../components/layout/MainLayout"
import SalesDashboard from "../components/dashboards/SalesDashboard"

export default function HomePage() {
  return (
    <AppProvider>
      <MainLayout>
        <SalesDashboard />
      </MainLayout>
    </AppProvider>
  )
}
