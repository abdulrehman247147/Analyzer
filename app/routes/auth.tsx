import { useEffect } from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router";

import { usePuterStore } from "../lib/puter";

export const meta = () => [
  {
    title: "Resumind | Auth",
  },
  {
    name: "description",
    content: "Log into your account",
  },
];

const Auth = () => {
  const auth = usePuterStore(
    (state) => state.auth,
  );

  const isLoading = usePuterStore(
    (state) => state.isLoading,
  );

  const puterReady = usePuterStore(
    (state) => state.puterReady,
  );

  const error = usePuterStore(
    (state) => state.error,
  );

  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const requestedPath =
    searchParams.get("next");

  const next =
    requestedPath &&
    requestedPath.startsWith("/")
      ? requestedPath
      : "/";

  useEffect(() => {
    if (
      puterReady &&
      !isLoading &&
      auth.isAuthenticated
    ) {
      navigate(next, {
        replace: true,
      });
    }
  }, [
    auth.isAuthenticated,
    isLoading,
    navigate,
    next,
    puterReady,
  ]);

  const handleSignIn = async () => {
    await auth.signIn();
  };

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[url('/images/bg-auth.svg')] bg-cover">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 rounded-2xl bg-white p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>

            <h2>
              Log In to Continue Your Job
              Journey
            </h2>
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            {!puterReady || isLoading ? (
              <button
                type="button"
                className="auth-button animate-pulse"
                disabled
              >
                <p>
                  {!puterReady
                    ? "Loading Puter..."
                    : "Signing you in..."}
                </p>
              </button>
            ) : auth.isAuthenticated ? (
              <button
                type="button"
                className="auth-button"
                onClick={() => {
                  void handleSignOut();
                }}
              >
                <p>Log Out</p>
              </button>
            ) : (
              <button
                type="button"
                className="auth-button"
                onClick={() => {
                  void handleSignIn();
                }}
              >
                <p>Log In</p>
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;