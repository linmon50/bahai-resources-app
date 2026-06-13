import React, { useState, useEffect, useRef } from "react";

export default function CustomSelect({ value, onChange, options, disabled, className, style, triggerStyle, labelId, placeholder = "Select...", variant }) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const selectId = useRef(Math.random().toString(36).substring(2, 9)).current;
    const listboxId = `listbox-${selectId}`;

    const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];
    const selectedIndex = options.findIndex(o => String(o.value) === String(value));

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [isOpen, selectedIndex]);

    useEffect(() => {
        if (isOpen && listRef.current && focusedIndex >= 0) {
            const item = listRef.current.children[focusedIndex];
            if (item) item.scrollIntoView({ block: "nearest" });
        }
    }, [focusedIndex, isOpen]);

    const handleKeyDown = (e) => {
        if (disabled) return;
        switch (e.key) {
            case "Enter":
            case " ":
                e.preventDefault();
                if (isOpen && focusedIndex >= 0) {
                    onChange({ target: { value: options[focusedIndex].value } });
                    setIsOpen(false);
                } else {
                    setIsOpen(true);
                }
                break;
            case "ArrowDown":
                e.preventDefault();
                if (!isOpen) { setIsOpen(true); break; }
                setFocusedIndex(i => Math.min(i + 1, options.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocusedIndex(i => Math.max(i - 1, 0));
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                break;
            case "Tab":
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={containerRef} className={`custom-select-container ${className || ""}`} style={{ position: "relative", ...style }}>
            <div
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={labelId}
                aria-controls={listboxId}
                aria-activedescendant={isOpen && focusedIndex >= 0 ? `opt-${selectId}-${focusedIndex}` : undefined}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                className={`admin-input custom-select-trigger ${variant === 'dense' ? 'dense' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                style={{
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: disabled ? 0.6 : 1,
                    userSelect: "none",
                    outline: "none",
                    ...triggerStyle
                }}
            >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span aria-hidden="true" style={{
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.7)",
                    marginLeft: "10px"
                }}>▼</span>
            </div>

            {isOpen && !disabled && (
                <ul
                    ref={listRef}
                    role="listbox"
                    id={listboxId}
                    aria-labelledby={labelId}
                    className="custom-select-dropdown"
                >
                    {options.map((opt, idx) => (
                        <li
                            key={opt.value}
                            id={`opt-${selectId}-${idx}`}
                            role="option"
                            aria-selected={String(value) === String(opt.value)}
                            className={`custom-select-option ${String(value) === String(opt.value) ? "selected" : ""} ${idx === focusedIndex ? "focused" : ""}`}
                            onClick={() => {
                                onChange({ target: { value: opt.value } });
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
