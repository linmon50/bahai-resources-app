import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDatePicker({ value, onChange, disabled, className, placeholder = "Select date...", style }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(null);
    const [viewDate, setViewDate] = useState(() => new Date());
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 280, openUpward: false });
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync input value with internal state
    useEffect(() => {
        if (value) {
            const parsed = new Date(value + "T00:00:00");
            if (!isNaN(parsed.getTime())) {
                setCurrentDate(parsed);
                setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
            } else {
                setCurrentDate(null);
            }
        } else {
            setCurrentDate(null);
        }
    }, [value]);

    // Calculate fixed screen coordinates relative to document.body
    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUp = spaceBelow < 300 && spaceAbove > spaceBelow;

            const dropdownWidth = Math.min(280, window.innerWidth - 24);
            const maxLeft = Math.max(12, window.innerWidth - dropdownWidth - 12);
            const calcLeft = Math.min(Math.max(12, rect.left), maxLeft);

            setCoords({
                top: rect.bottom + 6,
                bottom: window.innerHeight - rect.top + 6,
                left: calcLeft,
                width: dropdownWidth,
                openUpward: openUp
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener("scroll", updateCoords, true);
            window.addEventListener("resize", updateCoords);
        }
        return () => {
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [isOpen]);

    // Handle outside clicks to close calendar
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
                    return;
                }
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handlePrevMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDaySelect = (day, e) => {
        e.preventDefault();
        e.stopPropagation();
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const yyyy = selected.getFullYear();
        const mm = String(selected.getMonth() + 1).padStart(2, "0");
        const dd = String(selected.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        onChange({ target: { value: dateStr } });
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange({ target: { value: "" } });
        setIsOpen(false);
    };

    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    const renderCalendarGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        // Index of the first day of the month (0 = Sunday, 1 = Monday...)
        const firstDayIndex = new Date(year, month, 1).getDay();
        // Total days in the current month
        const totalDays = new Date(year, month + 1, 0).getDate();
        // Total days in the previous month
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        const cells = [];

        // 1. Previous month padding days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            cells.push({
                day: prevMonthTotalDays - i,
                isCurrentMonth: false,
            });
        }

        // 2. Current month days
        for (let i = 1; i <= totalDays; i++) {
            cells.push({
                day: i,
                isCurrentMonth: true,
            });
        }

        // 3. Next month padding days to round up to a grid (usually 42 cells)
        const totalCells = cells.length > 35 ? 42 : 35; // standard calendar grid dimensions
        const nextMonthPadding = totalCells - cells.length;
        for (let i = 1; i <= nextMonthPadding; i++) {
            cells.push({
                day: i,
                isCurrentMonth: false,
            });
        }

        return cells;
    };

    const calendarCells = renderCalendarGrid();
    
    // Safely format YYYY-MM-DD to MM/DD/YYYY for UI display while retaining standard storage value
    const getDisplayValue = () => {
        if (!value) return "";
        const parts = value.split("-");
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${month}/${day}/${year}`;
        }
        return value;
    };
    const displayValue = getDisplayValue();

    return (
        <div ref={containerRef} className="custom-datepicker-container" style={style}>
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-haspopup="grid"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                onKeyDown={handleKeyDown}
                className={`custom-datepicker-input-wrapper ${className || ""}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    outline: "none",
                    boxSizing: "border-box",
                }}
            >
                <span className="datepicker-display-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayValue || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={e => e.stopPropagation()}>
                    {displayValue && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Clear date"
                            style={{
                                background: "none",
                                border: "none",
                                color: "rgba(255, 255, 255, 0.4)",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                padding: "2px 4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "color 0.2s"
                            }}
                            className="datepicker-clear-btn"
                        >
                            ✕
                        </button>
                    )}
                    <svg
                        style={{ width: "15px", height: "15px", fill: "currentColor", opacity: 0.5, pointerEvents: "none" }}
                        viewBox="0 0 24 24"
                    >
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                    </svg>
                </div>
            </div>

            {isOpen && ReactDOM.createPortal(
                <div 
                    ref={dropdownRef}
                    className={`custom-datepicker-dropdown ${coords.openUpward ? "open-upward" : ""}`} 
                    role="dialog" 
                    aria-label="Calendar date picker"
                    style={{
                        position: "fixed",
                        top: coords.openUpward ? "auto" : `${coords.top}px`,
                        bottom: coords.openUpward ? `${coords.bottom}px` : "auto",
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        zIndex: 999999,
                        margin: 0,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                        <button type="button" onClick={handlePrevMonth} className="datepicker-nav-btn" aria-label="Previous month">
                            ◀
                        </button>
                        <span style={{ fontWeight: "600", fontSize: "0.88rem", color: "#97f7e9", userSelect: "none" }}>
                            {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button type="button" onClick={handleNextMonth} className="datepicker-nav-btn" aria-label="Next month">
                            ▶
                        </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "0.4rem" }}>
                        {DAYS_OF_WEEK.map(d => (
                            <span key={d} style={{ fontSize: "0.72rem", fontWeight: "bold", color: "rgba(255,255,255,0.45)", userSelect: "none" }}>
                                {d}
                            </span>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                        {calendarCells.map((cell, idx) => {
                            const isSelected = currentDate &&
                                currentDate.getFullYear() === viewDate.getFullYear() &&
                                currentDate.getMonth() === viewDate.getMonth() &&
                                currentDate.getDate() === cell.day &&
                                cell.isCurrentMonth;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => cell.isCurrentMonth && handleDaySelect(cell.day, e)}
                                    disabled={!cell.isCurrentMonth}
                                    className={`datepicker-day ${isSelected ? "selected" : ""} ${!cell.isCurrentMonth ? "empty" : ""}`}
                                    style={{
                                        fontFamily: "inherit"
                                    }}
                                >
                                    {cell.day}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
