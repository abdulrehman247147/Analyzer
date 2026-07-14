import { cn } from "../lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from "./Accordion";

interface Tip {
  type?: "good" | "improve";
  tip?: string;
  explanation?: string;
}

interface FeedbackCategory {
  score?: number;
  tips?: Tip[];
}

interface FeedbackShape {
  toneAndStyle?: FeedbackCategory;
  content?: FeedbackCategory;
  structure?: FeedbackCategory;
  skills?: FeedbackCategory;

  // Fallbacks in case the AI uses different property names
  tone_and_style?: FeedbackCategory;
  toneStyle?: FeedbackCategory;
  skill?: FeedbackCategory;
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
): Tip[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return {
        type: "improve",
        tip: "No suggestion provided",
        explanation: "",
      };
    }

    const tip = item as Tip;

    return {
      type:
        tip.type === "good"
          ? "good"
          : "improve",
      tip:
        typeof tip.tip === "string"
          ? tip.tip
          : "No suggestion provided",
      explanation:
        typeof tip.explanation === "string"
          ? tip.explanation
          : "",
    };
  });
};

const ScoreBadge = ({
  score,
}: {
  score: number;
}) => {
  const safeScore =
    normalizeScore(score);

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1 rounded-[96px] px-2 py-0.5",
        safeScore > 69
          ? "bg-badge-green"
          : safeScore > 39
            ? "bg-badge-yellow"
            : "bg-badge-red",
      )}
    >
      <img
        src={
          safeScore > 69
            ? "/icons/check.svg"
            : "/icons/warning.svg"
        }
        alt=""
        className="size-4"
      />

      <p
        className={cn(
          "text-sm font-medium",
          safeScore > 69
            ? "text-badge-green-text"
            : safeScore > 39
              ? "text-badge-yellow-text"
              : "text-badge-red-text",
        )}
      >
        {safeScore}/100
      </p>
    </div>
  );
};

const CategoryHeader = ({
  title,
  categoryScore,
}: {
  title: string;
  categoryScore?: number;
}) => {
  return (
    <div className="flex flex-row items-center gap-4 py-2">
      <p className="text-2xl font-semibold">
        {title}
      </p>

      <ScoreBadge
        score={normalizeScore(
          categoryScore,
        )}
      />
    </div>
  );
};

const CategoryContent = ({
  tips,
}: {
  tips?: Tip[];
}) => {
  const safeTips =
    normalizeTips(tips);

  if (safeTips.length === 0) {
    return (
      <div className="w-full rounded-lg bg-gray-50 px-5 py-4">
        <p className="text-gray-500">
          No feedback was provided for this category.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="grid w-full grid-cols-2 gap-4 rounded-lg bg-gray-50 px-5 py-4 max-md:grid-cols-1">
        {safeTips.map(
          (tip, index) => (
            <div
              className="flex flex-row items-center gap-2"
              key={`${tip.tip}-${index}`}
            >
              <img
                src={
                  tip.type === "good"
                    ? "/icons/check.svg"
                    : "/icons/warning.svg"
                }
                alt=""
                className="size-5"
              />

              <p className="text-xl text-gray-500">
                {tip.tip}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="flex w-full flex-col gap-4">
        {safeTips.map(
          (tip, index) => (
            <div
              key={`${tip.tip}-detail-${index}`}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-4",
                tip.type === "good"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700",
              )}
            >
              <div className="flex flex-row items-center gap-2">
                <img
                  src={
                    tip.type === "good"
                      ? "/icons/check.svg"
                      : "/icons/warning.svg"
                  }
                  alt=""
                  className="size-5"
                />

                <p className="text-xl font-semibold">
                  {tip.tip}
                </p>
              </div>

              {tip.explanation && (
                <p>
                  {tip.explanation}
                </p>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
};

const Details = ({
  feedback,
}: {
  feedback:
    | Feedback
    | FeedbackShape
    | null
    | undefined;
}) => {
  const safeFeedback =
    (feedback ?? {}) as FeedbackShape;

  const toneAndStyle =
    safeFeedback.toneAndStyle ??
    safeFeedback.tone_and_style ??
    safeFeedback.toneStyle ??
    {};

  const content =
    safeFeedback.content ?? {};

  const structure =
    safeFeedback.structure ?? {};

  const skills =
    safeFeedback.skills ??
    safeFeedback.skill ??
    {};

  return (
    <div className="flex w-full flex-col gap-4">
      <Accordion>
        <AccordionItem id="tone-style">
          <AccordionHeader itemId="tone-style">
            <CategoryHeader
              title="Tone & Style"
              categoryScore={
                toneAndStyle.score
              }
            />
          </AccordionHeader>

          <AccordionContent itemId="tone-style">
            <CategoryContent
              tips={toneAndStyle.tips}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem id="content">
          <AccordionHeader itemId="content">
            <CategoryHeader
              title="Content"
              categoryScore={
                content.score
              }
            />
          </AccordionHeader>

          <AccordionContent itemId="content">
            <CategoryContent
              tips={content.tips}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem id="structure">
          <AccordionHeader itemId="structure">
            <CategoryHeader
              title="Structure"
              categoryScore={
                structure.score
              }
            />
          </AccordionHeader>

          <AccordionContent itemId="structure">
            <CategoryContent
              tips={structure.tips}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem id="skills">
          <AccordionHeader itemId="skills">
            <CategoryHeader
              title="Skills"
              categoryScore={
                skills.score
              }
            />
          </AccordionHeader>

          <AccordionContent itemId="skills">
            <CategoryContent
              tips={skills.tips}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default Details;