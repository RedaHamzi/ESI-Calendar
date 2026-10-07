/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {},
		fontFamily: {
			sans: ["Cairo", "ui-sans-serif", "system-ui", "sans-serif"],
		},
	},
	darkMode: "class",
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["light"],
	},
};


