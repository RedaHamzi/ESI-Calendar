import { useState, useEffect } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

const ThemeToggle = ({ isDark, setIsDark }) => {
  const [mounted, setMounted] = useState(false);

  // After mounting, we can show the UI to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions to avoid layout shift
    return (
      <div className="w-12 h-6 bg-gray-600 rounded-full p-1">
        <div className="w-4 h-4 bg-white rounded-full"></div>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsDark(!isDark)}
      className={`relative w-12 h-6 rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
        isDark ? 'bg-indigo-600' : 'bg-orange-400'
      }`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className={`flex items-center justify-center w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
        isDark ? 'translate-x-6' : 'translate-x-0'
      }`}>
        {isDark ? (
          <FiMoon size={12} className="text-purple-600" />
        ) : (
          <FiSun size={12} className="text-orange-500" />
        )}
      </div>
      
      {/* Animated background elements for better visual feedback */}
      <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
        isDark ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="absolute top-0.5 left-1 w-1 h-1 bg-white rounded-full opacity-70"></div>
        <div className="absolute top-1 left-2.5 w-0.5 h-0.5 bg-white rounded-full opacity-50"></div>
      </div>
    </button>
  );
};

export default ThemeToggle;