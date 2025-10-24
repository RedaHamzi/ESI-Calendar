import { classes, groups } from "../data/data";

const MiniNavigator = ({ type, setType, setList }) => {
  return (
    <div className="relative">
      <div className="flex items-center bg-white/10 backdrop-blur-lg rounded-2xl p-1 border border-white/20">
        <button
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
            type === 'class' 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25' 
              : 'text-purple-100 hover:text-white'
          }`}
          onClick={() => { setType("class"); setList(classes[0]); }}
        >
          📚 Classes
        </button>
        <button
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
            type === 'group' 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25' 
              : 'text-purple-100 hover:text-white'
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