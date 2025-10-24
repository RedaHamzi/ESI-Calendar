import { classes, groups } from "../data/data";

const MiniNavigator = ({ type, setType, setList, isDark }) => {
  const containerBg = isDark ? "bg-white/10 backdrop-blur-lg" : "bg-white/80 backdrop-blur-lg";
  const containerBorder = isDark ? "border-white/20" : "border-purple-200";
  const inactiveText = isDark ? "text-purple-100 hover:text-white" : "text-purple-600 hover:text-purple-800";

  return (
    <div className="relative">
      <div className={`flex items-center rounded-2xl p-1 border ${containerBg} ${containerBorder}`}>
        <button
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
            type === 'class' 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25' 
              : inactiveText
          }`}
          onClick={() => { setType("class"); setList(classes[0]); }}
        >
          📚 Classes
        </button>
        <button
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
            type === 'group' 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25' 
              : inactiveText
          }`}
          onClick={() => { setType("group"); setList(groups[0]); }}
        >
          👥 Groups
        </button>
      </div>
    </div>
  );
};

export default MiniNavigator;