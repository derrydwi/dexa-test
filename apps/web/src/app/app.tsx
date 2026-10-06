import { Brand } from "@/components/brand";
import { ErrorNotice, Loading } from "@/components/feedback";
import { lazy, Suspense } from "react";
import { useSession } from "@/features/auth/use-session";
import { AppLayout } from "./app-layout";

const Login = lazy(() =>
  import("@/features/auth/login-page").then((module) => ({
    default: module.Login,
  })),
);

export function App() {
  const session = useSession();

  if (session.loading) {
    return (
      <div className="startup">
        <Brand />
        <Loading />
      </div>
    );
  }
  if (session.error && !session.user) {
    return (
      <div className="startup">
        <Brand />
        <ErrorNotice
          message={session.error}
          retry={() => void session.loadSession()}
        />
      </div>
    );
  }
  if (!session.user) {
    return (
      <Suspense fallback={<Loading />}>
        <Login onLogin={session.setUser} />
      </Suspense>
    );
  }

  return (
    <AppLayout
      key={session.user.id}
      user={session.user}
      error={session.error}
      logoutBusy={session.logoutBusy}
      logout={session.logout}
    />
  );
}
