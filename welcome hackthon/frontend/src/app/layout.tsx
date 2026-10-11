import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Call Agent - Antigravity Screening Dashboard",
  description: "Real-time AI-powered personal call assistant with Aceternity UI, 3D reactive orb, and co-pilot streaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#06080e] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
