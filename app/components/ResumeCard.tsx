import { Link } from "react-router";
import { useEffect, useState } from "react";

import ScoreCircle from "./ScoreCircle";
import { usePuterStore } from "../lib/puter";

interface ResumeCardProps {
  resume: Resume;
}

const ResumeCard = ({
  resume,
}: ResumeCardProps) => {
  const {
    id,
    companyName,
    jobTitle,
    feedback,
    imagePath,
  } = resume;

  const fs = usePuterStore((state) => state.fs);

  const [resumeUrl, setResumeUrl] =
    useState<string>("");

  const [imageError, setImageError] =
    useState(false);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    const loadResume = async () => {
      try {
        setImageError(false);

        if (!imagePath) {
          return;
        }

        /*
         * Public images can be loaded directly.
         * Puter files are loaded through fs.read().
         */
        if (imagePath.startsWith("/")) {
          if (!cancelled) {
            setResumeUrl(imagePath);
          }

          return;
        }

        const blob = await fs.read(imagePath);

        if (!blob || cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setResumeUrl(objectUrl);
      } catch (error) {
        console.error(
          `Failed to load resume image "${imagePath}":`,
          error,
        );

        if (!cancelled) {
          setImageError(true);
        }
      }
    };

    void loadResume();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fs, imagePath]);

  const score =
    feedback?.overallScore ?? 0;

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000"
    >
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="break-words font-bold !text-black">
              {companyName}
            </h2>
          )}

          {jobTitle && (
            <h3 className="break-words text-lg text-gray-500">
              {jobTitle}
            </h3>
          )}

          {!companyName && !jobTitle && (
            <h2 className="font-bold !text-black">
              Resume
            </h2>
          )}
        </div>

        <div className="flex-shrink-0">
          <ScoreCircle score={score} />
        </div>
      </div>

      {resumeUrl && !imageError && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="h-full w-full">
            <img
              src={resumeUrl}
              alt={`${companyName || "Resume"} preview`}
              className="h-[350px] w-full object-cover object-top max-sm:h-[200px]"
              onError={() => {
                setImageError(true);
              }}
            />
          </div>
        </div>
      )}

      {imageError && (
        <div className="flex h-[200px] items-center justify-center rounded-xl bg-gray-100">
          <p className="text-sm text-gray-500">
            Resume preview unavailable
          </p>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;