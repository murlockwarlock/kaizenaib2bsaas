type KaizenMarkProps = {
  className?: string;
};

export default function KaizenMark({ className = '' }: KaizenMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 5.5V18.5M7 12H11.5M11.5 12L17 5.5M11.5 12L17 18.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
