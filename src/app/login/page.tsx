import { Suspense } from "react";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/layout/brand-mark";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-brand-gradient">
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <BrandMark />
            <span className="text-lg tracking-tight">Tec5<span className="text-primary">.Tech</span></span>
          </Link>

          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              <span className="gradient-text">Panel de campañas</span>
              <br />
              publicitarias
            </h1>
            <p className="text-muted-foreground">
              Google, Meta, YouTube, SEO, GEO, email frío, LinkedIn, podcast y webinars en un solo lugar.
              Métricas claras, objetivos por canal y control operativo con un click.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "9 canales en un mismo panel",
                "Objetivos y seguimiento con semáforo",
                "Roles: Admin · Manager · Viewer",
                "Modo claro y oscuro",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Tec5.Tech · All rights reserved.
          </p>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-end p-4">
            <ThemeToggle />
          </div>
          <div className="flex-1 grid place-items-center px-6 pb-10">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
