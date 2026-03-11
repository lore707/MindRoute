interface FormChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  testId: string;
}

export function FormChip({ label, selected, onClick, testId }: FormChipProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`px-5 py-3 rounded-full text-[14px] border-[1.5px] transition-all duration-300 cursor-pointer ${selected
        ? "border-[#E94560] bg-[#E94560] text-white font-medium shadow-[0_4px_20px_rgba(233,69,96,0.15)]"
        : "border-[var(--border-input)] text-[var(--text-secondary)] bg-[var(--surface-card)] hover:border-[#E94560] hover:text-[var(--text-primary)] hover:-translate-y-0.5"
      }`}
    >
      {label}
    </button>
  );
}
