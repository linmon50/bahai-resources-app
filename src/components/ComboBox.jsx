import React, { useState, useEffect, useRef } from 'react';

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
    style = {}
}) {
    const [inputText, setInputText] = useState(userName || '');
    const [isOpen, setIsOpen]       = useState(false);
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const containerRef = useRef(null);
    const inputRef     = useRef(null);

    // Keep inputText in sync when parent updates the value
    useEffect(() => {
        setInputText(userName || '');
    }, [userName]);

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
                commitValue();
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputText, filteredFlat]);

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
                value={inputText}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                className="task-inline-input"
                style={{ width: '100%' }}
            />

            {showDropdown && (
                <ul className="combobox-dropdown" role="listbox">
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
                </ul>
            )}
        </div>
    );
}
