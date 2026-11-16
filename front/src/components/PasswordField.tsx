"use client";

import { useState } from "react";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete: "current-password" | "new-password";
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  autoComplete,
}: Props) {
  const [visible, setVisible] = useState(false);
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-row">
        <input
          id={id}
          className="input has-toggle"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "숨기기" : "보기"}
        </button>
      </div>
      {error ? (
        <div id={`${id}-msg`} className="field-error">
          {error}
        </div>
      ) : hint ? (
        <div id={`${id}-msg`} className="hint">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
