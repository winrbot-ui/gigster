import { Logo } from "@/components/brand/logo";

/** Minimal, focused chrome for the invite gate. */
export default function GateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Logo className="mb-10" />
      {children}
    </div>
  );
}
