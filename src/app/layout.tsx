import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CE Database Admin - Group 2 (Central User Database)",
  description: "Central User Database for Wi-Fi 802.1X & IoT Door Access Control Project",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
