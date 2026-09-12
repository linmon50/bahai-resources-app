import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

/**
 * ComboBox — Hybrid text-input + grouped dropdown.
 *
 * Props:
 *   userId        {string|null}  — currently selected user's UUID (null = free-text)
 *   userName      {string}       — display text (profile name or free-text)
 *   onChange      {fn}           — (userId: string|null, userName: string) => void
 *   groups        {Array}        — [{ label: string, options: [{value, label}] }]
 *   placeholder   {string}
 *   disabled      {boolean}
 *   style         {object}
 */
export default function ComboBox({
    userId,
    userName,
    onChange,
    groups = [],
    placeholder = 'Assign to…',
    disabled = false,
    style = {},
    className = 'admin-input'
}) {
    const [inputText, setInputText] = useState(userName || '');
    const [isOpen, setIsOpen]       = useState(false);
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const [coords, setCoords]       = useState({ top: 0, left: 0, width: 0, openUpward: false });
    const containerRef = useRef(null);
    const inputRef     = useRef(null);
    const dropdownRef  = useRef(null);
    const comboUniqueId = useRef(Math.random().toString(36).substring(2, 9)).current;
    const listboxId = `combo-list-${comboUniqueId}`;

    // Keep inputText in sync when parent updates the value
    useEffect(() => {
        setInputText(userName || '');
    }, [userName]);

    // Calculate fixed screen coordinates relative to document.body
    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;

            setCoords({
                top: openUp ? rect.top - 6 : rect.bottom + 6,
                left: rect.left,
                width: Math.max(rect.width, 180),
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

    // Flatten all options for keyboard navigation
    const allOptions = groups.flatMap(g => g.options);

    // Build filtered groups based on current input
    const filteredGroups = groups.map(g => ({
        ...g,
        options: inputText.trim()
            ? g.options.filter(o => o.label.toLowerCase().includes(inputText.toLowerCase()))
            : g.options
    })).filter(g => g.options.length > 0);

    const filteredFlat = filteredGroups.flatMap(g => g.options);

    // Close on outside click + commit free-text value
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
                    return;
                }
                commitValue();
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputText, filteredFlat]);

    const commitValue = () => {
        const text = inputText.trim();
        if (!text) { onChange(null, ''); return; }
        const match = allOptions.find(o => o.label.toLowerCase() === text.toLowerCase());
        if (match) {
            onChange(match.value, match.label);
            setInputText(match.label);
        } else {
            onChange(null, text); // free-text
        }
    };

    const handleSelect = (opt) => {
        onChange(opt.value, opt.label);
        setInputText(opt.label);
        setIsOpen(false);
        setFocusedIdx(-1);
    };

    const handleInputChange = (e) => {
        setInputText(e.target.value);
        setIsOpen(true);
        setFocusedIdx(-1);
    };

    const handleKeyDown = (e) => {
        if (disabled) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setIsOpen(true);
                setFocusedIdx(i => Math.min(i + 1, filteredFlat.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIdx(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIdx >= 0 && filteredFlat[focusedIdx]) {
                    handleSelect(filteredFlat[focusedIdx]);
                } else {
                    commitValue();
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                commitValue();
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    const showDropdown = isOpen && filteredGroups.length > 0;

    return (
        <div ref={containerRef} style={{ position: 'relative', ...style }}>
            <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                aria-activedescendant={showDropdown && focusedIdx >= 0 ? `combo-opt-${comboUniqueId}-${focusedIdx}` : undefined}
                value={inputText}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                className={className}
                style={{ width: '100%' }}
            />

            {showDropdown && ReactDOM.createPortal(
                <ul
                    ref={dropdownRef}
                    id={listboxId}
                    className={`combobox-dropdown ${coords.openUpward ? "open-upward" : ""}`}
                    role="listbox"
                    style={{
                        position: "fixed",
                        top: coords.openUpward ? "auto" : `${coords.top}px`,
                        bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        zIndex: 999999,
                        margin: 0,
                    }}
                >
                    {filteredGroups.map((group, gi) => (
                        <React.Fragment key={gi}>
                            {group.label && (
                                <li className="combobox-group-label" aria-hidden="true">
                                    {group.label}
                                </li>
                            )}
                            {group.options.map((opt) => {
                                const flatIdx = filteredFlat.indexOf(opt);
                                return (
                                    <li
                                        key={opt.value}
                                        id={`combo-opt-${comboUniqueId}-${flatIdx}`}
                                        role="option"
                                        aria-selected={opt.value === userId}
                                        className={[
                                            'combobox-option',
                                            flatIdx === focusedIdx ? 'focused' : '',
                                            opt.value === userId    ? 'selected' : ''
                                        ].join(' ')}
                                        onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                                    >
                                        {opt.label}
                                    </li>
                                );
                            })}
                            {/* Divider between groups (not after last) */}
                            {gi < filteredGroups.length - 1 && (
                                <li className="combobox-divider" aria-hidden="true" />
                            )}
                        </React.Fragment>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
}
