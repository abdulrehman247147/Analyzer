import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router";

import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";

import { usePuterStore } from "../lib/puter";
import { convertPdfToImage } from "../lib/pdf2img";
import { generateUUID } from "../lib/utils";

import { prepareInstructions } from "../../constants";

interface AnalyzeResumeParams {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  file: File;
}

interface UploadedFileResult {
  path?: string;
}

interface AIResponseContentItem {
  text?: string;
}

interface AIResponseLike {
  message?: {
    content?: string | AIResponseContentItem[];
  };
}

interface RawTip {
  type?: unknown;
  tip?: unknown;
  suggestion?: unknown;
  title?: unknown;
  explanation?: unknown;
  detail?: unknown;
  description?: unknown;
}

interface NormalizedTip {
  type: "good" | "improve";
  tip: string;
  explanation: string;
}

interface RawCategory {
  score?: unknown;
  tips?: unknown;
  suggestions?: unknown;
  feedback?: unknown;
}

interface RawFeedback {
  feedback?: RawFeedback;
  result?: RawFeedback;
  data?: RawFeedback;

  overallScore?: unknown;
  overall_score?: unknown;
  overall_rating?: unknown;
  score?: unknown;
  score_reason?: unknown;

  ATS?: RawCategory;
  ats?: RawCategory;
  atsScore?: unknown;
  ats_score?: unknown;
  atsTips?: unknown;
  ats_tips?: unknown;

  detailed_improvement_guidance?: unknown;
  areas_of_improvement_if_present_in_resume?: unknown;

  toneAndStyle?: RawCategory;
  tone_and_style?: RawCategory;
  toneStyle?: RawCategory;

  content?: RawCategory;
  structure?: RawCategory;

  skills?: RawCategory;
  skill?: RawCategory;

  ATS_friendly?: unknown;
overall?: unknown;
alignment_with_job_requirements?: unknown;
communication_clarity?: unknown;
education_relevance?: unknown;
experience_relevance?: unknown;
technical_skill_match?: unknown;
}

const getUploadedFilePath = (
  result:
    | UploadedFileResult
    | UploadedFileResult[]
    | null
    | undefined,
): string | null => {
  if (!result) {
    return null;
  }

  if (Array.isArray(result)) {
    return result[0]?.path ?? null;
  }

  return result.path ?? null;
};

const getAIResponseText = (
  response: unknown,
): string => {
  if (
    !response ||
    typeof response !== "object"
  ) {
    throw new Error(
      "The AI returned an empty response.",
    );
  }

  const typedResponse =
    response as AIResponseLike;

  const content =
    typedResponse.message?.content;

  if (typeof content === "string") {
    const text = content.trim();

    if (!text) {
      throw new Error(
        "The AI response was empty.",
      );
    }

    return text;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (
          item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return "";
      })
      .join("")
      .trim();

    if (!text) {
      throw new Error(
        "The AI response did not contain readable text.",
      );
    }

    return text;
  }

  throw new Error(
    "The AI response did not contain feedback.",
  );
};

const cleanJsonResponse = (
  value: string,
): string => {
  let cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1,
    );
  }

  return cleaned;
};

const parseFeedback = (
  responseText: string,
): RawFeedback => {
  const cleanedResponse =
    cleanJsonResponse(responseText);

  try {
    return JSON.parse(
      cleanedResponse,
    ) as RawFeedback;
  } catch (error) {
    console.error(
      "Raw AI response:",
      responseText,
    );

    console.error(
      "Cleaned AI JSON:",
      cleanedResponse,
    );

    console.error(
      "JSON parsing failed:",
      error,
    );

    throw new Error(
      "The AI returned invalid JSON. Open the browser console to inspect the response.",
    );
  }
};

const normalizeScore = (
  value: unknown,
): number => {
  const numericScore = Number(value);

  if (!Number.isFinite(numericScore)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(numericScore)),
  );
};

const normalizeTips = (
  value: unknown,
): NormalizedTip[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): NormalizedTip | null => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const rawTip = item as RawTip;

      const tipText =
        typeof rawTip.tip === "string"
          ? rawTip.tip
          : typeof rawTip.suggestion === "string"
            ? rawTip.suggestion
            : typeof rawTip.title === "string"
              ? rawTip.title
              : "";

      const explanationText =
        typeof rawTip.explanation === "string"
          ? rawTip.explanation
          : typeof rawTip.detail === "string"
            ? rawTip.detail
            : typeof rawTip.description === "string"
              ? rawTip.description
              : "";

      if (!tipText.trim()) {
        return null;
      }

      return {
        type:
          rawTip.type === "good"
            ? "good"
            : "improve",
        tip: tipText.trim(),
        explanation:
          explanationText.trim(),
      };
    })
    .filter(
      (
        item,
      ): item is NormalizedTip =>
        item !== null,
    );
};

const normalizeCategory = (
  category: RawCategory | undefined,
) => {
  return {
    score: normalizeScore(
      category?.score,
    ),
    tips: normalizeTips(
      category?.tips ??
        category?.suggestions ??
        category?.feedback,
    ),
  };
};

const normalizeFeedback = (
  rawFeedback: RawFeedback,
): Feedback => {
  const source =
    rawFeedback.feedback ??
    rawFeedback.result ??
    rawFeedback.data ??
    rawFeedback;

  const atsCategory =
    source.ATS ??
    source.ats ??
    {};

  const toneCategory =
    source.toneAndStyle ??
    source.tone_and_style ??
    source.toneStyle ??
    {};

  const contentCategory =
    source.content ?? {};

  const structureCategory =
    source.structure ?? {};

  const skillsCategory =
    source.skills ??
    source.skill ??
    {};

const normalizedATS = {
  score: normalizeScore(
    atsCategory.score ??
      source.atsScore ??
      source.ats_score ??
      source.ATS_friendly ??
      source.score,
  ),

  tips: normalizeTips(
    atsCategory.tips ??
      atsCategory.suggestions ??
      atsCategory.feedback ??
      source.atsTips ??
      source.ats_tips ??
      source.detailed_improvement_guidance ??
      source.areas_of_improvement_if_present_in_resume,
  ),
};

  const normalizedFeedback = {
overallScore: normalizeScore(
  source.overallScore ??
    source.overall_score ??
    source.overall ??
    source.score ??
    atsCategory.score,
),

    ATS: normalizedATS,

    toneAndStyle:
      normalizeCategory(
        toneCategory,
      ),

    content:
      normalizeCategory(
        contentCategory,
      ),

    structure:
      normalizeCategory(
        structureCategory,
      ),

    skills:
      normalizeCategory(
        skillsCategory,
      ),
  };

  /*
   * Use the average category score when the AI
   * does not provide an overall score.
   */
  if (
    normalizedFeedback.overallScore === 0
  ) {
    const categoryScores = [
      normalizedFeedback.ATS.score,
      normalizedFeedback.toneAndStyle
        .score,
      normalizedFeedback.content.score,
      normalizedFeedback.structure.score,
      normalizedFeedback.skills.score,
    ].filter((score) => score > 0);

    if (categoryScores.length > 0) {
      normalizedFeedback.overallScore =
        Math.round(
          categoryScores.reduce(
            (total, score) =>
              total + score,
            0,
          ) / categoryScores.length,
        );
    }
  }

  return normalizedFeedback as Feedback;
};

const getErrorMessage = (
  error: unknown,
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const possibleError =
      error as {
        message?: string;
        error?: string;
        code?: string;
      };

    if (possibleError.message) {
      return possibleError.message;
    }

    if (possibleError.error) {
      return possibleError.error;
    }

    if (possibleError.code) {
      return possibleError.code;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "An unknown error occurred.";
    }
  }

  return "An unknown error occurred.";
};

const Upload = () => {
  const {
    auth,
    isLoading,
    fs,
    ai,
    kv,
  } = usePuterStore();

  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [statusText, setStatusText] =
    useState("");

  const [errorText, setErrorText] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  useEffect(() => {
    if (
      !isLoading &&
      !auth.isAuthenticated
    ) {
      navigate(
        "/auth?next=/upload",
        {
          replace: true,
        },
      );
    }
  }, [
    auth.isAuthenticated,
    isLoading,
    navigate,
  ]);

  const handleFileSelect = (
    selectedFile: File | null,
  ) => {
    setFile(selectedFile);
    setErrorText("");
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: AnalyzeResumeParams) => {
    setIsProcessing(true);
    setErrorText("");

    let previewUrl = "";

    try {
      setStatusText(
        "Uploading the PDF...",
      );

      const uploadedPdf =
        await fs.upload([file]);

      console.log(
        "PDF upload response:",
        uploadedPdf,
      );

      const resumePath =
        getUploadedFilePath(
          uploadedPdf,
        );

      if (!resumePath) {
        throw new Error(
          "The PDF upload did not return a valid Puter path.",
        );
      }

      setStatusText(
        "Converting PDF to image...",
      );

      const imageResult =
        await convertPdfToImage(file);

      console.log(
        "PDF conversion response:",
        imageResult,
      );

      if (!imageResult.file) {
        throw new Error(
          imageResult.error ||
            "The PDF could not be converted to an image.",
        );
      }

      previewUrl = imageResult.url;

      setStatusText(
        "Uploading resume preview...",
      );

      const uploadedImage =
        await fs.upload([
          imageResult.file,
        ]);

      console.log(
        "Image upload response:",
        uploadedImage,
      );

      const imagePath =
        getUploadedFilePath(
          uploadedImage,
        );

      if (!imagePath) {
        throw new Error(
          "The image upload did not return a valid Puter path.",
        );
      }

      const uuid = generateUUID();

      const resumeData = {
        id: uuid,
        resumePath,
        imagePath,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null,
      };

      setStatusText(
        "Saving resume data...",
      );

      const initialSave =
        await kv.set(
          `resume:${uuid}`,
          JSON.stringify(resumeData),
        );

      if (initialSave === false) {
        throw new Error(
          "Failed to save the resume data.",
        );
      }

      setStatusText(
        "Analyzing your resume...",
      );

      const instructions =
        prepareInstructions({
          jobTitle,
          jobDescription,
          AIResponseFormat: "json",
        });

      console.log(
        "Resume path sent to AI:",
        resumePath,
      );

      const aiResponse =
        await ai.feedback(
          resumePath,
          instructions,
        );

      console.log(
        "Complete AI response:",
        aiResponse,
      );

      const feedbackText =
        getAIResponseText(aiResponse);

      console.log(
        "AI feedback text:",
        feedbackText,
      );

      const rawFeedback =
        parseFeedback(feedbackText);

      console.log(
        "Raw parsed feedback:",
        rawFeedback,
      );

      const parsedFeedback =
        normalizeFeedback(rawFeedback);

      console.log(
        "Normalized feedback:",
        parsedFeedback,
      );

      const completedResumeData = {
        ...resumeData,
        feedback: parsedFeedback,
      };

      setStatusText(
        "Saving ATS results...",
      );

      const finalSave =
        await kv.set(
          `resume:${uuid}`,
          JSON.stringify(
            completedResumeData,
          ),
        );

      if (finalSave === false) {
        throw new Error(
          "Failed to save the ATS results.",
        );
      }

      console.log(
        "Completed resume data:",
        completedResumeData,
      );

      setStatusText(
        "Analysis complete. Opening results...",
      );

      navigate(
        `/resume/${uuid}`,
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Resume analysis failed:",
        error,
      );

      setErrorText(
        getErrorMessage(error),
      );

      setStatusText("");
      setIsProcessing(false);
    } finally {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    setErrorText("");

    const formData =
      new FormData(
        event.currentTarget,
      );

    const companyName = String(
      formData.get(
        "company-name",
      ) ?? "",
    ).trim();

    const jobTitle = String(
      formData.get(
        "job-title",
      ) ?? "",
    ).trim();

    const jobDescription = String(
      formData.get(
        "job-description",
      ) ?? "",
    ).trim();

    if (!file) {
      setErrorText(
        "Please upload a PDF resume.",
      );

      return;
    }

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setErrorText(
        "Please select a valid PDF file.",
      );

      return;
    }

    if (!jobTitle) {
      setErrorText(
        "Please enter the job title.",
      );

      return;
    }

    if (!jobDescription) {
      setErrorText(
        "Please enter the job description.",
      );

      return;
    }

    await handleAnalyze({
      companyName,
      jobTitle,
      jobDescription,
      file,
    });
  };

  return (
    <main className="min-h-screen bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>
            Smart feedback for your
            dream job
          </h1>

          {isProcessing ? (
            <>
              <h2>
                {statusText ||
                  "Processing your resume..."}
              </h2>

              <img
                src="/images/resume-scan.gif"
                alt="Analyzing resume"
                className="w-full"
              />
            </>
          ) : (
            <h2>
              Drop your resume for an
              ATS score and improvement
              tips
            </h2>
          )}

          {errorText && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left"
            >
              <p className="font-semibold text-red-700">
                Resume analysis failed
              </p>

              <p className="mt-1 break-words text-sm text-red-600">
                {errorText}
              </p>
            </div>
          )}

          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-4"
            >
              <div className="form-div">
                <label htmlFor="company-name">
                  Company Name
                </label>

                <input
                  id="company-name"
                  name="company-name"
                  type="text"
                  placeholder="Company Name"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">
                  Job Title
                </label>

                <input
                  id="job-title"
                  name="job-title"
                  type="text"
                  placeholder="Job Title"
                  required
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">
                  Job Description
                </label>

                <textarea
                  id="job-description"
                  name="job-description"
                  rows={5}
                  placeholder="Job Description"
                  required
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">
                  Upload Resume
                </label>

                <FileUploader
                  onFileSelect={
                    handleFileSelect
                  }
                />
              </div>

              <button
                type="submit"
                className="primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  !file ||
                  isProcessing
                }
              >
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;