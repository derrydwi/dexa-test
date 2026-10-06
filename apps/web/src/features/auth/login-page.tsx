import { Brand } from "@/components/brand";
import { ErrorNotice } from "@/components/feedback";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage } from "@/lib/http";
import type { User } from "@wfh/contracts";
import { ArrowRight, Check, House, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginValues } from "./schema";
import { authApi } from "./api";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const login = useMutation({ mutationFn: authApi.login, onSuccess: onLogin });

  const busy = form.formState.isSubmitting || login.isPending;

  const submit = async (values: LoginValues) => {
    try {
      await login.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const name of ["email", "password"] as const) {
          const messages = error.fieldErrors[name];
          if (messages) {
            form.setError(name, {
              type: "server",
              message: messages.join(" · "),
            });
          }
        }
      }
      form.setError("root.server", { message: errorMessage(error) });
    }
  };

  const demo = (email: string) => {
    form.reset({ email, password: "DemoPass123!" });
    login.reset();
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-statement">
          <h1>
            Work from home.
            <br />
            <span>Stay connected.</span>
          </h1>
          <p>
            A simple way to record your workday,
            <br />
            wherever home happens to be.
          </p>
          <div className="story-checklist">
            <span>
              <Check size={17} />
              Photo-backed attendance
            </span>
            <span>
              <Check size={17} />
              One place for your team
            </span>
          </div>
        </div>
        <div className="login-foot">
          <span>Built for the everyday workday.</span>
          <span>WIB / UTC+7</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="welcome-icon">
            <House size={26} strokeWidth={1.7} />
          </span>
          <h2>Welcome back</h2>
          <p className="login-intro">Sign in to start your workday.</p>
          <form noValidate onSubmit={form.handleSubmit(submit)}>
            <Field
              label="Email address"
              error={form.formState.errors.email?.message}
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              {...form.register("email")}
              disabled={busy}
              required
              maxLength={254}
            />
            <Field
              label="Password"
              error={form.formState.errors.password?.message}
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              {...form.register("password")}
              disabled={busy}
              required
              maxLength={128}
            />
            <ErrorNotice
              message={form.formState.errors.root?.server?.message || ""}
            />
            <Button className="login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </Button>
          </form>
          {import.meta.env.VITE_DEMO_MODE !== "false" && (
            <div className="demo-panel">
              <div>
                <ShieldCheck size={17} />
                <strong>Explore the local demo</strong>
              </div>
              <p>Choose an account to fill in the demo credentials.</p>
              <div className="demo-buttons">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => demo("employee@wfh.test")}
                  disabled={busy}
                >
                  Employee account
                  <ArrowRight size={14} />
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => demo("hr@wfh.test")}
                  disabled={busy}
                >
                  HR administrator
                  <ArrowRight size={14} />
                </Button>
              </div>
              <small>Default demo password: DemoPass123!</small>
            </div>
          )}
          <p className="login-help">
            Need an account? Contact your HR administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
