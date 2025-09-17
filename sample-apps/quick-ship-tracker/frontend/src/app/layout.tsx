import type { Metadata } from "next";
import { Suspense } from "react";
import ShopifyProvider from "@/components/providers/ShopifyProvider";
import AppBridgeProvider from "@/components/providers/AppBridgeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quick Ship Tracker",
  description: "Easily manage and track your Shopify order shipments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ShopifyProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <AppBridgeProvider>
              {children}
            </AppBridgeProvider>
          </Suspense>
        </ShopifyProvider>
      </body>
    </html>
  );
}
