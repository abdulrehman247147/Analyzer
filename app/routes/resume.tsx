import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  useEffect,
  useState,
} from "react";

import { usePuterStore } from "../lib/puter";

import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";

export const meta = () => [
  {
    title: "Resumind | Resume Review",
  },
  {
    name: "description",
    content:
      "Detailed overview of your resume",
  },
];

interface Tip {
  type: "good" | "improve";
  tip: string;
  explanation: string;
}

interface FeedbackCategory {
  score: number;
  tips: Tip[];
}

interface NormalizedFeedback {
  overallScore: number;

  ATS: FeedbackCategory;

  toneAndStyle: FeedbackCategory;
  content: FeedbackCategory;
  structure: FeedbackCategory;
  skills: FeedbackCategory;
}

interface RawCategory {
  score?: unknown;
  tips?: unknown;
  suggestions?: unknown;
  feedback?: unknown;
}

interface RawFeedback {
  overallScore?: unknown;
  overall_score?: unknown;
  overall?: unknown;
  score?: unknown;

  ATS?: RawCategory;
  ats?: RawCategory;

  ATS_friendly?: unknown;
  ats_friendly?: unknown;
  atsFriendly?: unknown;
  atsScore?: unknown;
  ats_score?: unknown;

  toneAndStyle?: RawCategory;
  tone_and_style?: RawCategory;
  toneStyle?: RawCategory;

  content?: RawCategory;
  structure?: RawCategory;
  skills?: RawCategory;
  skill?: RawCategory;

  communication_clarity?: unknown;
  alignment_with_job_requirements?: unknown;
  education_relevance?: unknown;
  experience_relevance?: unknown;
  technical_skill_match?: unknown;

  strengths?: unknown;
  improvements?: unknown;
  suggestions?: unknown;
  tips?: unknown;

  detailed_improvement_guidance?: unknown;
  tailored_action_items_for_user?: unknown;
  areas_of_improvement_if_present_in_resume?: unknown;

  feedback?: RawFeedback;
  result?: RawFeedback;
  data?: RawFeedback;
}

interface StoredResumeData {
  id: string;
  resumePath: string;
  imagePath: string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  feedback?: RawFeedback | Feedback | null;
}

const normalizeScore = (
  value: unknown,
): number => {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(score)),
  );
};

const normalizeTips = (
  value: unknown,
  defaultType: "good" | "improve" = "improve",
): Tip[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): Tip | null => {
      if (typeof item === "string") {
        return {
          type: defaultType,
          tip: item,
          explanation: item,
        };
      }

      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const rawTip = item as {
        type?: unknown;
        tip?: unknown;
        suggestion?: unknown;
        title?: unknown;
        explanation?: unknown;
        detail?: unknown;
        description?: unknown;
      };

      const tipText =
        typeof rawTip.tip === "string"
          ? rawTip.tip
          : typeof rawTip.suggestion === "string"
            ? rawTip.suggestion
            : typeof rawTip.title === "string"
              ? rawTip.title
              : "";

      if (!tipText.trim()) {
        return null;
      }

      const explanation =
        typeof rawTip.explanation === "string"
          ? rawTip.explanation
          : typeof rawTip.detail === "string"
            ? rawTip.detail
            : typeof rawTip.description === "string"
              ? rawTip.description
              : tipText;

      return {
        type:
          rawTip.type === "good"
            ? "good"
            : defaultType,
        tip: tipText.trim(),
        explanation:
          explanation.trim(),
      };
    })
    .filter(
      (item): item is Tip =>
        item !== null,
    );
};

const normalizeCategory = (
  category: RawCategory | undefined,
  fallbackScore: unknown,
  fallbackTips?: unknown,
): FeedbackCategory => {
  return {
    score: normalizeScore(
      category?.score ??
        fallbackScore,
    ),

    tips: normalizeTips(
      category?.tips ??
        category?.suggestions ??
        category?.feedback ??
        fallbackTips,
    ),
  };
};

const normalizeFeedback = (
  rawValue: RawFeedback | Feedback,
): NormalizedFeedback => {
  const rawFeedback =
    rawValue as RawFeedback;

  const source =
    rawFeedback.feedback ??
    rawFeedback.result ??
    rawFeedback.data ??
    rawFeedback;

  const atsCategory =
    source.ATS ??
    source.ats;

  const toneCategory =
    source.toneAndStyle ??
    source.tone_and_style ??
    source.toneStyle;

  const contentCategory =
    source.content;

  const structureCategory =
    source.structure;

  const skillsCategory =
    source.skills ??
    source.skill;

  const improvementTips =
    source.detailed_improvement_guidance ??
    source.tailored_action_items_for_user ??
    source.areas_of_improvement_if_present_in_resume ??
    source.improvements ??
    source.suggestions ??
    source.tips;

  const strengths =
    source.strengths;

  const normalized: NormalizedFeedback = {
    overallScore: normalizeScore(
      source.overallScore ??
        source.overall_score ??
        source.overall ??
        source.score,
    ),

    ATS: normalizeCategory(
      atsCategory,
      source.ATS_friendly ??
        source.ats_friendly ??
        source.atsFriendly ??
        source.atsScore ??
        source.ats_score ??
        source.score,
      improvementTips,
    ),

    toneAndStyle: normalizeCategory(
      toneCategory,
      source.communication_clarity,
      strengths,
    ),

    content: normalizeCategory(
      contentCategory,
      source.alignment_with_job_requirements ??
        source.experience_relevance,
      improvementTips,
    ),

    structure: normalizeCategory(
      structureCategory,
      source.ATS_friendly ??
        source.ats_friendly ??
        source.atsFriendly,
      improvementTips,
    ),

    skills: normalizeCategory(
      skillsCategory,
      source.technical_skill_match,
      strengths,
    ),
  };

  if (normalized.overallScore === 0) {
    const availableScores = [
      normalized.ATS.score,
      normalized.toneAndStyle.score,
      normalized.content.score,
      normalized.structure.score,
      normalized.skills.score,
    ].filter((score) => score > 0);

    if (availableScores.length > 0) {
      normalized.overallScore =
        Math.round(
          availableScores.reduce(
            (total, score) =>
              total + score,
            0,
          ) / availableScores.length,
        );
    }
  }

  return normalized;
};

const Resume = () => {
  const {
    auth,
    isLoading,
    fs,
    kv,
  } = usePuterStore();

  const { id } = useParams();

  const navigate = useNavigate();

  const [imageUrl, setImageUrl] =
    useState("");

  const [resumeUrl, setResumeUrl] =
    useState("");

  const [feedback, setFeedback] =
    useState<NormalizedFeedback | null>(
      null,
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (
      !isLoading &&
      !auth.isAuthenticated
    ) {
      navigate(
        `/auth?next=/resume/${id ?? ""}`,
        {
          replace: true,
        },
      );
    }
  }, [
    auth.isAuthenticated,
    id,
    isLoading,
    navigate,
  ]);

  useEffect(() => {
    if (
      isLoading ||
      !auth.isAuthenticated ||
      !id
    ) {
      return;
    }

    let cancelled = false;
    let createdResumeUrl = "";
    let createdImageUrl = "";

    const loadResume = async () => {
      try {
        setError("");

        const storedResume =
          await kv.get(`resume:${id}`);

        if (!storedResume) {
          throw new Error(
            "Resume data was not found.",
          );
        }

        const data = JSON.parse(
          storedResume,
        ) as StoredResumeData;

        console.log(
          "Stored resume data:",
          data,
        );

        if (!data.resumePath) {
          throw new Error(
            "The stored PDF path is missing.",
          );
        }

        if (!data.imagePath) {
          throw new Error(
            "The stored preview path is missing.",
          );
        }

        if (!data.feedback) {
          throw new Error(
            "Resume feedback was not found.",
          );
        }

        const normalizedFeedback =
          normalizeFeedback(
            data.feedback,
          );

        console.log(
          "Feedback loaded from storage:",
          data.feedback,
        );

        console.log(
          "Normalized feedback for UI:",
          normalizedFeedback,
        );

        const [resumeBlob, imageBlob] =
          await Promise.all([
            fs.read(data.resumePath),
            fs.read(data.imagePath),
          ]);

        if (!resumeBlob) {
          throw new Error(
            "Could not load the stored PDF.",
          );
        }

        if (!imageBlob) {
          throw new Error(
            "Could not load the resume preview.",
          );
        }

        const pdfBlob =
          resumeBlob.type ===
          "application/pdf"
            ? resumeBlob
            : new Blob([resumeBlob], {
                type: "application/pdf",
              });

        createdResumeUrl =
          URL.createObjectURL(pdfBlob);

        createdImageUrl =
          URL.createObjectURL(imageBlob);

        if (cancelled) {
          URL.revokeObjectURL(
            createdResumeUrl,
          );

          URL.revokeObjectURL(
            createdImageUrl,
          );

          return;
        }

        setResumeUrl(createdResumeUrl);
        setImageUrl(createdImageUrl);
        setFeedback(
          normalizedFeedback,
        );
      } catch (loadError) {
        console.error(
          "Failed to load resume:",
          loadError,
        );

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load the resume.",
          );
        }
      }
    };

    void loadResume();

    return () => {
      cancelled = true;

      if (createdResumeUrl) {
        URL.revokeObjectURL(
          createdResumeUrl,
        );
      }

      if (createdImageUrl) {
        URL.revokeObjectURL(
          createdImageUrl,
        );
      }
    };
  }, [
    auth.isAuthenticated,
    fs,
    id,
    isLoading,
    kv,
  ]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link
          to="/"
          className="back-button"
        >
          <img
            src="/icons/back.svg"
            alt=""
            className="h-2.5 w-2.5"
          />

          <span className="text-sm font-semibold text-gray-800">
            Back to Homepage
          </span>
        </Link>
      </nav>

      {error ? (
        <section className="flex min-h-[70vh] items-center justify-center p-8">
          <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-red-700">
              Resume could not be loaded
            </h2>

            <p className="text-red-600">
              {error}
            </p>

            <Link
              to="/upload"
              className="primary-button mt-6 inline-flex"
            >
              Upload another resume
            </Link>
          </div>
        </section>
      ) : (
        <div className="flex w-full flex-row max-lg:flex-col-reverse">
          <section className="feedback-section sticky top-0 flex h-screen items-center justify-center bg-[url('/images/bg-small.svg')] bg-cover max-lg:relative max-lg:h-auto">
            {imageUrl && resumeUrl ? (
              <div className="gradient-border animate-in fade-in h-[90%] w-fit duration-1000 max-sm:m-0">
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open resume PDF"
                >
                  <img
                    src={imageUrl}
                    className="h-full w-full rounded-2xl object-contain"
                    alt="Resume preview"
                  />
                </a>
              </div>
            ) : (
              <img
                src="/images/resume-scan-2.gif"
                className="w-full"
                alt="Loading resume preview"
              />
            )}
          </section>

          <section className="feedback-section">
            <h1 className="text-4xl font-bold !text-black">
              Resume Review
            </h1>

            {feedback ? (
              <div className="animate-in fade-in flex flex-col gap-8 duration-1000">
                <Summary
                  feedback={
                    feedback as Feedback
                  }
                />

                <ATS
                  score={
                    feedback.ATS.score
                  }
                  suggestions={
                    feedback.ATS.tips
                  }
                />

                <Details
                  feedback={
                    feedback as Feedback
                  }
                />
              </div>
            ) : (
              <img
                src="/images/resume-scan-2.gif"
                className="w-full"
                alt="Loading ATS feedback"
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default Resume;