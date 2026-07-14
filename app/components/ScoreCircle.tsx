interface ScoreCircleProps {
  score?: number;
}

const ScoreCircle = ({
  score = 75,
}: ScoreCircleProps) => {
  const safeScore = Math.min(
    100,
    Math.max(0, Number(score) || 0),
  );

  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference =
    2 * Math.PI * normalizedRadius;

  const progress = safeScore / 100;

  const strokeDashoffset =
    circumference * (1 - progress);

  return (
    <div className="relative h-[100px] w-[100px]">
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 100 100"
        className="-rotate-90 transform"
        aria-label={`Resume score: ${safeScore} out of 100`}
      >
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />

        <defs>
          <linearGradient
            id="score-gradient"
            x1="1"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#FF97AD"
            />

            <stop
              offset="100%"
              stopColor="#5171FF"
            />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke="url(#score-gradient)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-black">
          {safeScore}/100
        </span>
      </div>
    </div>
  );
};

export default ScoreCircle;