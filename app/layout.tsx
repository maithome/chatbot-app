import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Käänik – eesti keele harjutamise abiline",
  description: "Kolmveerand Keelestuudio vestlusrobot eesti keele õppijatele (A1–A2).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="antialiased">{children}</body>
    </html>
  );
}
