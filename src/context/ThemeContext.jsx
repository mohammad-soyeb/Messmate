import { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

const readStoredTheme = () => {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
};

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("dark", darkMode);

    try {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    } catch {
      console.error("Theme preference could not be saved.");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((previousMode) => !previousMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
