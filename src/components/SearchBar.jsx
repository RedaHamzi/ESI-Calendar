import { classes, groups } from "../data/data";
import { useEffect, useRef, useState } from "react";
import { BsSearch, BsChevronDown } from "react-icons/bs";

const SearchBar = ({ setList, type }) => {
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

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <BsSearch className="text-purple-400 text-lg" />
        </div>
        <input
          className="w-full bg-white/10 backdrop-blur-lg text-white placeholder-purple-200 pl-12 pr-12 py-4 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base"
          type="text"
          placeholder={`Search ${type}...`}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <BsChevronDown className={`text-purple-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 z-50 max-h-80 overflow-hidden">
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No {type} found
              </div>
            ) : (
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.title}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-bold">
                          {type === 'class' ? 'C' : 'G'}
                        </span>
                      </div>
                      <span className="text-gray-800 font-medium">{item.title}</span>
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