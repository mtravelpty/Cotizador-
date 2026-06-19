import { useEffect, useRef, useState } from "react";
import {
  useServiceNameSuggestions,
  type SuggestionCategory,
} from "@/lib/useServiceNameSuggestions";

interface Props {
  value: string;
  onChange: (v: string) => void;
  category: SuggestionCategory;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  /**
   * Called when the user confirms the value:
   * - Blur (not caused by suggestion click or Escape)
   * - Enter with no active suggestion
   * - Suggestion selected via click or Enter
   * Receives the final committed value.
   */
  onCommit?: (v: string) => void;
  /** Called when Escape is pressed while the dropdown is closed. */
  onEscape?: () => void;
}

export default function ServiceNameAutocomplete({
  value,
  onChange,
  category,
  placeholder,
  className,
  inputRef,
  onCommit,
  onEscape,
}: Props) {
  const { getSuggestions } = useServiceNameSuggestions();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = (inputRef ?? internalRef) as React.RefObject<HTMLInputElement>;
  const isEscaping = useRef(false);

  const suggestions = value.length >= 2 ? getSuggestions(category, value) : [];
  const isOpen = showDropdown && suggestions.length > 0;

  useEffect(() => {
    setActiveIdx(-1);
  }, [value]);

  function selectSuggestion(s: string) {
    onChange(s);
    setShowDropdown(false);
    setActiveIdx(-1);
    onCommit?.(s);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIdx >= 0) {
        selectSuggestion(suggestions[activeIdx]);
      } else {
        setShowDropdown(false);
        onCommit?.(value);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (isOpen) {
        setShowDropdown(false);
        setActiveIdx(-1);
      } else {
        isEscaping.current = true;
        onEscape?.();
        setTimeout(() => {
          isEscaping.current = false;
        }, 100);
      }
    }
  }

  function handleBlur() {
    setTimeout(() => setShowDropdown(false), 100);
    if (!isEscaping.current) {
      onCommit?.(value);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={ref}
        type="text"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (value.length >= 2) setShowDropdown(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#ffffff",
            border: "1px solid #e8d5e4",
            borderRadius: 10,
            marginTop: 4,
            boxShadow: "0 4px 20px rgba(128,45,98,0.12)",
            overflow: "hidden",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                color: "#802d62",
                cursor: "pointer",
                background: i === activeIdx ? "#f8eef5" : "transparent",
                borderBottom:
                  i < suggestions.length - 1 ? "1px solid #f3e6ef" : "none",
                transition: "background 0.1s",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
