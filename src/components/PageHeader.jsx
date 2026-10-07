/* eslint-disable react/prop-types */
import { FiChevronLeft } from "react-icons/fi";

const PageHeader = ({ title, isDark, onBack, action }) => {
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const backColor = isDark
    ? "text-purple-200 hover:text-white"
    : "text-purple-600 hover:text-purple-800";

  return (
    <header className="header-spacing px-4 safe-area-top">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between min-h-[48px]">
          <div className="flex items-center min-h-[44px]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className={`-ml-2 mr-1 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl active:scale-[0.97] transition-transform ${backColor}`}
              >
                <FiChevronLeft size={22} />
              </button>
            )}
            <h1 className={`text-xl font-bold ${titleColor}`}>{title}</h1>
          </div>
          {action && <div className="ml-3 flex items-center">{action}</div>}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
