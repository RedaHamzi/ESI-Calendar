import { useState, useEffect } from "react";
import SearchBar from "./components/SearchBar";
import MiniNavigator from "./components/MiniNavigator";
import ThemeToggle from "./components/ThemeToggle";
import { classes } from "./data/data";

function App() {
  const [list, setList] = useState(classes[0]);
  const [type, setType] = useState("class");
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Load saved theme preference
    const savedTheme = localStorage.getItem('esi-calendar-theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      // Default to dark theme if no preference saved
      setIsDark(true);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save theme preference whenever it changes
  useEffect(() => {
    localStorage.setItem('esi-calendar-theme', isDark ? 'dark' : 'light');
    
    // Update document class for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const themeClasses = isDark 
    ? "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 safe-area-padding"
    : "min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 safe-area-padding";

  const headerTextColor = isDark ? "text-white" : "text-gray-900";
  const subheaderTextColor = isDark ? "text-purple-200" : "text-purple-600";
  const selectedItemBg = isDark ? "bg-white/10 backdrop-blur-lg" : "bg-white/80 backdrop-blur-lg";
  const selectedItemBorder = isDark ? "border-white/20" : "border-purple-200";
  const calendarBg = isDark ? "bg-white" : "bg-white";
  const calendarBorder = isDark ? "border-white/20" : "border-purple-200";

  return (
    <div className={themeClasses}>
      {/* Header */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className={`text-3xl font-bold ${headerTextColor} text-center mb-2`}>
                ESI Calendar
              </h1>
              <p className={`text-center text-sm ${subheaderTextColor}`}>
                Your academic schedule, simplified
              </p>
            </div>
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-md mx-auto">
          {/* Search and Navigation */}
          <div className="space-y-4 mb-6">
            <SearchBar setList={setList} type={type} isDark={isDark} />
            <MiniNavigator type={type} setType={setType} setList={setList} isDark={isDark} />
          </div>

          {/* Selected Item Display */}
          <div className={`${selectedItemBg} rounded-2xl p-4 mb-4 border ${selectedItemBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-purple-200' : 'text-purple-600'}`}>
                  Selected {type}
                </p>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {list.title}
                </h3>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                  : 'bg-gradient-to-r from-purple-400 to-blue-400'
              }`}>
                <span className="text-white font-bold text-sm">
                  {type === 'class' ? 'C' : 'G'}
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Frame */}
          <div className={`${calendarBg} rounded-2xl shadow-2xl overflow-hidden border ${calendarBorder}`}>
            <iframe
              src={`https://calendar.google.com/calendar/embed?showTz=0${(type == "class") ? `&src=${list.src}` : `${list?.src?.map((e) => `&src=${e}`).join("")}&color=%23E67C73&color=%23616161`}&showPrint=0&showCalendars=0&mode=WEEK`}
              className="hidden md:block w-full h-[65vh]"
              loading="lazy"
            ></iframe>
            <iframe
              src={`https://calendar.google.com/calendar/embed?showTz=0${(type == "class") ? `&src=${list.src}` : `${list?.src?.map((e) => `&src=${e}`).join("")}&color=%23E67C73&color=%23616161`}&showPrint=0&showTitle=1&showDate=0&showTabs=1&showCalendars=0&mode=AGENDA&dates=20090401/20501231`}
              className="block md:hidden w-full h-[70vh]"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 pt-4 px-4">
        <div className="max-w-md mx-auto text-center">
          <a
            className={`hover:text-white transition-colors text-sm flex items-center justify-center gap-2 ${
              isDark ? 'text-purple-300' : 'text-purple-500'
            }`}
            href="https://github.com/RedaHamzi/ESI-Calendar"
            target="_blank"
            rel="noreferrer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;