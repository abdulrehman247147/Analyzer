import ScoreGauge from "../components/ScoreGauge";
import ScoreBadge from "../components/ScoreBadge";

interface CategoryProps {
  title: string;
  score?: number | null;
}

const normalizeScore = (
  score: unknown,
): number => {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(numericScore)),
  );
};

const Category = ({
  title,
  score,
}: CategoryProps) => {
  const safeScore =
    normalizeScore(score);

  const textColor =
    safeScore > 70
      ? "text-green-600"
      : safeScore > 49
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="resume-summary">
      <div className="category">
        <div className="flex flex-row items-center justify-center gap-2">
          <p className="text-2xl">
            {title}
          </p>

          <ScoreBadge
            score={safeScore}
          />
        </div>

        <p className="text-2xl">
          <span className={textColor}>
            {safeScore}
          </span>
          /100
        </p>
      </div>
    </div>
  );
};

const Summary = ({
  feedback,
}: {
  feedback: Feedback | null | undefined;
}) => {
  const overallScore =
    normalizeScore(
      feedback?.overallScore,
    );

  return (
    <div className="w-full rounded-2xl bg-white shadow-md">
      <div className="flex flex-row items-center gap-8 p-4 max-sm:flex-col max-sm:items-start">
        <ScoreGauge
          score={overallScore}
        />

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">
            Your Resume Score
          </h2>

          <p className="text-sm text-gray-500">
            This score is calculated
            based on the categories
            listed below.
          </p>
        </div>
      </div>

      <Category
        title="Tone & Style"
        score={
          feedback?.toneAndStyle?.score
        }
      />

      <Category
        title="Content"
        score={
          feedback?.content?.score
        }
      />

      <Category
        title="Structure"
        score={
          feedback?.structure?.score
        }
      />

      <Category
        title="Skills"
        score={
          feedback?.skills?.score
        }
      />
    </div>
  );
};

export default Summary;