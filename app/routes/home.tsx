import type { Route } from "./+types/home";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import Navbar from "../components/Navbar";
import ResumeCard from "../components/ResumeCard";
import { usePuterStore } from "../lib/puter";

export function meta(
  {}: Route.MetaArgs,
) {
  return [
    {
      title: "Resumind",
    },
    {
      name: "description",
      content:
        "Smart feedback for your dream job!",
    },
  ];
}

export default function Home() {
  const auth = usePuterStore(
    (state) => state.auth,
  );

  const kv = usePuterStore(
    (state) => state.kv,
  );

  const isLoading = usePuterStore(
    (state) => state.isLoading,
  );

  const puterReady = usePuterStore(
    (state) => state.puterReady,
  );

  const storeError = usePuterStore(
    (state) => state.error,
  );

  const navigate = useNavigate();

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [
    loadingResumes,
    setLoadingResumes,
  ] = useState(false);

  const [
    resumeError,
    setResumeError,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !puterReady) {
      return;
    }

    if (!auth.isAuthenticated) {
      navigate("/auth?next=/", {
        replace: true,
      });
    }
  }, [
    auth.isAuthenticated,
    isLoading,
    navigate,
    puterReady,
  ]);

  useEffect(() => {
    if (
      isLoading ||
      !puterReady ||
      !auth.isAuthenticated
    ) {
      return;
    }

    let cancelled = false;

    const loadResumes = async () => {
      try {
        setLoadingResumes(true);
        setResumeError(null);

        const items = await kv.list(
          "resume:*",
          true,
        );

        if (cancelled) {
          return;
        }

        if (!items) {
          setResumes([]);
          return;
        }

        const parsedResumes: Resume[] = [];

        for (const item of items) {
          try {
            if (
              typeof item === "object" &&
              item !== null &&
              "value" in item
            ) {
              parsedResumes.push(
                JSON.parse(
                  String(item.value),
                ) as Resume,
              );
            }
          } catch (error) {
            console.error(
              "Failed to parse resume:",
              item,
              error,
            );
          }
        }

        setResumes(parsedResumes);
      } catch (error) {
        console.error(
          "Failed to load resumes:",
          error,
        );

        if (!cancelled) {
          setResumeError(
            "Unable to load your resumes.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingResumes(false);
        }
      }
    };

    void loadResumes();

    return () => {
      cancelled = true;
    };
  }, [
    auth.isAuthenticated,
    isLoading,
    kv,
    puterReady,
  ]);

  if (isLoading || !puterReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-lg text-black">
          Loading application...
        </p>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-lg text-black">
          Redirecting to login...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[url('/images/bg-main.png')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>
            Track Your Applications &amp;
            Resume Ratings
          </h1>

          {!loadingResumes &&
          resumes.length === 0 ? (
            <h2>
              No resumes found. Upload your
              first resume to get feedback.
            </h2>
          ) : (
            <h2>
              Review your submissions and
              check AI-powered feedback.
            </h2>
          )}
        </div>

        {(storeError || resumeError) && (
          <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-red-50 p-4">
            <p className="text-center text-red-600">
              {resumeError || storeError}
            </p>
          </div>
        )}

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img
              src="/images/resume-scan-2.gif"
              className="w-[200px]"
              alt="Loading resumes"
            />
          </div>
        )}

        {!loadingResumes &&
          resumes.length > 0 && (
            <div className="resumes-section">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                />
              ))}
            </div>
          )}

        {!loadingResumes &&
          resumes.length === 0 && (
            <div className="mt-10 flex flex-col items-center justify-center gap-4">
              <Link
                to="/upload"
                className="primary-button w-fit text-xl font-semibold"
              >
                Upload Resume
              </Link>
            </div>
          )}
      </section>
    </main>
  );
}