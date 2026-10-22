import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/session";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { AccountPage } from "@/pages/account/AccountPage";
import { PlansPage } from "@/pages/plans/PlansPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { ConsumptionPage } from "@/pages/consumption/ConsumptionPage";
import { RecordsPage } from "@/pages/records/RecordsPage";

function PageRoutes() {
  const { pathname } = useLocation();
  const { hideCreatedKey } = useSession();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (pathname !== "/account") hideCreatedKey();
  }, [pathname, hideCreatedKey]);
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/account" replace />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/consumption" element={<ConsumptionPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/translation" element={<Navigate to="/consumption" replace />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
              <div className="max-w-md text-center">
                <h1 className="text-7xl font-bold text-foreground">404</h1>
                <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Go home
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
      <Toaster />
    </AppLayout>
  );
}
export function App() {
  return (
    <SessionProvider>
      <PageRoutes />
    </SessionProvider>
  );
}
