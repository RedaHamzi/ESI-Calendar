import { classes, groups } from "../data/data";
import { useEffect, useRef, useState } from "react";
import { FiSearch, FiChevronDown, FiX } from "react-icons/fi";
import { getRecent, pushRecent, clearRecent, saveLastSelection } from "../utils/history";

const SearchBar = ({ setList, type, isDark }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const dropdownRef = useRef();
  const blurTimer = useRef(null);

  const selectedList = (type == "class") ? classes : groups;

  useEffect(() => {
    setInputValue("");
    setIsOpen(false);
    setRecent(getRecent(type));
  }, [type]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const filteredItems = selectedList.filter(item =>
    item.title.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (item) => {
    setInputValue(item.title);
    setIsOpen(false);
    setList(item);
    setRecent(pushRecent(type, item));
    saveLastSelection(type, item.title);
  };

  const handleClearRecent = () => {
    setRecent(clearRecent(type));
  };

  const handleClear = () => {
    setInputValue("");
    setIsOpen(false);
    // Optionally reset to default list when cleared
    const fallback = type === "class" ? classes[0] : groups[0];
    setList(fallback);
    saveLastSelection(type, fallback.title);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setRecent(getRecent(type));
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Short delay so clicks on dropdown items register before hiding
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setIsOpen(false), 120);
  };

  // Theme-based styles
  const inputBg = isDark ? "bg-white/10 backdrop-blur-lg" : "bg-white/80 backdrop-blur-lg";
  const inputText = isDark ? "text-white" : "text-gray-900";
  const inputPlaceholder = isDark ? "placeholder-purple-200" : "placeholder-purple-400";
  const inputBorder = isDark ? "border-white/20" : "border-purple-200";
  const dropdownBg = isDark ? "bg-white/95 backdrop-blur-lg" : "bg-white backdrop-blur-lg";
  const dropdownBorder = isDark ? "border-white/20" : "border-purple-200";
  const iconColor = isDark ? "text-purple-400" : "text-purple-500";
  const clearButtonColor = isDark ? "text-purple-300 hover:text-white" : "text-purple-500 hover:text-purple-700";
  const chipStyles = isDark
    ? "bg-white/10 border-white/20 text-purple-100 hover:bg-white/20"
    : "bg-white/80 border-purple-200 text-purple-700 hover:bg-purple-50";

  const renderRow = (item, key) => (
    <button
      key={key}
      className={`w-full min-h-[44px] px-4 py-3 text-left active:scale-[0.97] transition-colors duration-150 border-b last:border-b-0 ${
        isDark
          ? 'hover:bg-purple-500/20 border-gray-700'
          : 'hover:bg-purple-50 border-gray-200'
      }`}
      onClick={() => handleSelect(item)}
    >
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
          isDark ? 'bg-indigo-600' : 'bg-indigo-500'
        }`}>
          <span className="text-white text-xs font-bold">
            {type === 'class' ? 'C' : 'G'}
          </span>
        </div>
        <span className="font-medium text-gray-800">
          {item.title}
        </span>
      </div>
    </button>
  );

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <FiSearch size={18} className={`${iconColor}`} />
        </div>
        <input
          className={`w-full ${inputBg} ${inputText} ${inputPlaceholder} pl-12 pr-12 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base ${inputBorder}`}
          type="text"
          placeholder={`Search ${type}...`}
          aria-label={`Search ${type}`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        
        {/* Clear Button - Shows only when there's text */}
        {inputValue && (
          <button
            onClick={handleClear}
            className={`absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-all duration-200 hover:bg-white/20 ${clearButtonColor}`}
            aria-label="Clear search"
          >
            <FiX size={18} />
          </button>
        )}
        
        {/* Dropdown Chevron */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <FiChevronDown size={16} className={`${iconColor} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Recent history strip — separate from the dropdown */}
      {recent.length > 0 && (
        <div className="flex items-center gap-2 mt-2 overflow-x-auto hide-scrollbar">
          {recent.map((item) => (
            <button
              key={`recent-${item.title}`}
              onClick={() => handleSelect(item)}
              className={`shrink-0 min-h-[44px] flex items-center px-3 py-1.5 text-sm rounded-full border active:scale-[0.97] transition-colors duration-150 ${chipStyles}`}
            >
              {item.title}
            </button>
          ))}
          <button
            onClick={handleClearRecent}
            className={`shrink-0 px-2 py-1.5 text-xs transition-colors duration-150 ${clearButtonColor}`}
          >
            Clear
          </button>
        </div>
      )}

      {/* Dropdown — only while the search input is focused */}
      {isOpen && (
        <div ref={dropdownRef} className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 max-h-80 overflow-hidden ${dropdownBg} ${dropdownBorder}`}>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No {type} found
              </div>
            ) : (
              <div className="py-2">
                {filteredItems.map((item) => renderRow(item, item.title))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
