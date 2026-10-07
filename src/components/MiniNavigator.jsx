import { classes, groups } from "../data/data";
import { FiBookOpen, FiUsers } from "react-icons/fi";
import { saveLastSelection } from "../utils/history";

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
              ? `${isDark ? 'bg-indigo-600' : 'bg-indigo-500'} text-white` 
              : inactiveText
          }`}
          onClick={() => { setType("class"); setList(classes[0]); saveLastSelection("class", classes[0].title); }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <FiBookOpen size={16} /> Classes
          </span>
        </button>
        <button
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
            type === 'group' 
              ? `${isDark ? 'bg-indigo-600' : 'bg-indigo-500'} text-white` 
              : inactiveText
          }`}
          onClick={() => { setType("group"); setList(groups[0]); saveLastSelection("group", groups[0].title); }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <FiUsers size={16} /> Groups
          </span>
        </button>
      </div>
    </div>
  );
};

export default MiniNavigator;