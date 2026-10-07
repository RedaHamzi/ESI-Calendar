/* eslint-disable react/prop-types */
import { FiList } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";

const SessionsPage = ({ isDark, setIsDark }) => {
  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";

  return (
    <div>
      <PageHeader
        title="Sessions"
        isDark={isDark}
        action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
      />
      <main className="content-area content-with-tabs px-4">
        <div className="max-w-md mx-auto">
          <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isDark ? "bg-indigo-600" : "bg-indigo-500"
              }`}
            >
              <FiList size={22} className="text-white" />
            </div>
            <h2 className={`font-semibold text-lg ${textClass}`}>
              Browse sessions
            </h2>
            <p className={`text-sm mt-1 ${subClass}`}>
              Filter every session by type, subject and week. Coming soon —
              sync your calendars first so offline data is ready.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionsPage;
