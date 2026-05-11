import Link from "next/link";
import { RegisterForm } from "./register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/layout/brand-mark";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen bg-brand-gradient">
      <div className="relative z-10 grid min-h-screen place-items-center p-6">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <BrandMark />
            <span className="text-lg tracking-tight">Tec5<span className="text-primary">.Tech</span></span>
          </Link>
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
