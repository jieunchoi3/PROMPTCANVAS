import { AppShell } from "@/components/app-shell";

export default function CanvasGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
