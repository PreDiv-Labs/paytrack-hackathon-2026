import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import "./public.css";
import "./responsive.css";
import "./refinements.css";
import "./visual-theme.css";
import "./design-system.css";
import { themeVariables } from "@/lib/design-system";
export const metadata: Metadata = {
  title: "PayTrack — Your financial picture, finally clear.",
  description: "An evidence-backed financial copilot for verified PayPal Sandbox activity.",
  icons: { icon: "/icon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={themeVariables}>
      <body>{children}</body>
    </html>
  );
}
