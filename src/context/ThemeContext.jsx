import { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

const readStoredTheme = () => {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch (error) {
    console.error("Unable to restore the theme:", error);
    return false;
  }
};

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
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
