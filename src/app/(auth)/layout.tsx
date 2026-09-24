import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div style={{ viewTransitionName: "app-chrome" }} className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
