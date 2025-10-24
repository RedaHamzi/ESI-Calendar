import { classes, groups } from "../data/data";
import { useEffect, useRef, useState } from "react";
import { BsSearch, BsChevronDown, BsX } from "react-icons/bs";

const SearchBar = ({ setList, type, isDark }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  const selectedList = (type == "class") ? classes : groups;

  useEffect(() => {
    setInputValue("");
    setIsOpen(false);
  }, [type]);

  const filteredItems = selectedList.filter(item =>
    item.title.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (item) => {
    setInputValue(item.title);
    setIsOpen(false);
    setList(item);
  };

  const handleClear = () => {
    setInputValue("");
    setIsOpen(false);
    // Optionally reset to default list when cleared
    if (type === "class") {
      setList(classes[0]);
    } else {
      setList(groups[0]);
    }
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

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <BsSearch className={`${iconColor} text-lg`} />
        </div>
        <input
          className={`w-full ${inputBg} ${inputText} ${inputPlaceholder} pl-12 pr-12 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base ${inputBorder}`}
          type="text"
          placeholder={`Search ${type}...`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        
        {/* Clear Button - Shows only when there's text */}
        {inputValue && (
          <button
            onClick={handleClear}
            className={`absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-all duration-200 hover:bg-white/20 ${clearButtonColor}`}
            aria-label="Clear search"
          >
            <BsX className="text-xl" />
          </button>
        )}
        
        {/* Dropdown Chevron */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <BsChevronDown className={`${iconColor} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 max-h-80 overflow-hidden ${dropdownBg} ${dropdownBorder}`}>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No {type} found
              </div>
            ) : (
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.title}
                    className={`w-full px-4 py-3 text-left transition-colors duration-150 border-b last:border-b-0 ${
                      isDark 
                        ? 'hover:bg-purple-500/20 border-gray-700' 
                        : 'hover:bg-purple-50 border-gray-200'
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        isDark 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                          : 'bg-gradient-to-r from-purple-400 to-blue-400'
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
                ))}
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