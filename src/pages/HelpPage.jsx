/* eslint-disable react/prop-types */
import {
  FiCalendar,
  FiSearch,
  FiWifiOff,
  FiAlertCircle,
  FiFlag,
} from "react-icons/fi";
import PageHeader from "../components/PageHeader";

const SECTIONS = [
  {
    Icon: FiCalendar,
    title: "What is this app?",
    body: [
      "ESI Calendar is a timetable viewer for ESI students. It shows class and group schedules in one place.",
      "When you are online, schedules load live from Google Calendar. After a sync, your schedules stay available offline from the data saved on your device.",
    ],
  },
  {
    Icon: FiSearch,
    title: "How do I find a schedule?",
    steps: [
      "Open the Schedule tab and switch between Classes and Groups.",
      "Type a room (for example A1) or a group (for example 1CP A G01) in the search bar and pick it.",
      "Open the Teachers tab to search a teacher by name, then tap a name to see the week.",
      "Open the Sessions tab to filter every session by type, subject and week.",
    ],
  },
  {
    Icon: FiWifiOff,
    title: "How does offline work?",
    body: [
      "The first time you open the app with internet, it quietly saves the full academic year in the background.",
      "If you lose connection later, the Schedule tab shows the saved week automatically, with a note that you are offline.",
      "To refresh or resize the saved data, open More, then Sync, and pick one year, one month or one week before tapping Sync now.",
    ],
  },
  {
    Icon: FiAlertCircle,
    title: "Why does a calendar show as unavailable?",
    body: [
      "A calendar can show as unavailable when the school has not published it yet. This is known to happen for a couple of calendars each year.",
      "There is nothing to fix on your side. Check back after the school updates its calendars, or ask your department whether that schedule exists.",
    ],
  },
  {
    Icon: FiFlag,
    title: "Something looks wrong",
    body: [
      "If a session looks wrong or missing, first re-sync from More, then Sync, to make sure your saved data is fresh.",
    ],
    link: {
      label: "Open the GitHub repository to report an issue",
      href: "https://github.com/RedaHamzi/ESI-Calendar",
    },
  },
];

const HelpPage = ({ isDark, onBack }) => {
  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const linkClass = isDark ? "text-indigo-300" : "text-indigo-600";

  return (
    <div>
      <PageHeader title="Help" isDark={isDark} onBack={onBack} />
      <main className="content-area content-with-tabs px-4">
        <div className="max-w-md mx-auto space-y-4">
          {SECTIONS.map(({ Icon, title, body, steps, link }) => (
            <section
              key={title}
              className={`rounded-2xl p-4 border ${cardClass}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    isDark ? "bg-indigo-600" : "bg-indigo-500"
                  }`}
                >
                  <Icon size={18} className="text-white" />
                </span>
                <h2 className={`font-semibold text-base ${textClass}`}>
                  {title}
                </h2>
              </div>
              {body &&
                body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className={`text-sm mt-3 ${subClass}`}>
                    {paragraph}
                  </p>
                ))}
              {steps && (
                <ol className={`mt-3 space-y-2 text-sm ${subClass}`}>
                  {steps.map((step, i) => (
                    <li key={step.slice(0, 24)} className="flex gap-2">
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                          isDark
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-500 text-white"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {link && (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center min-h-[44px] mt-3 text-sm font-medium ${linkClass}`}
                >
                  {link.label}
                </a>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HelpPage;
