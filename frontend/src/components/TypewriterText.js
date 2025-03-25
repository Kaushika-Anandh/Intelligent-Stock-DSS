import React, { useEffect, useState } from 'react';

function TypewriterText({ text = "", speed = 20 }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // Sanitize input to avoid null/undefined issues.
    const safeText = text ?? "";
    // Split into words, filtering out empty entries.
    const words = safeText.split(" ").filter(Boolean);

    setDisplayedText(""); // Reset displayed text whenever 'text' changes

    let index = 0;
    const intervalId = setInterval(() => {
      if (index < words.length) {
        // If words[index] is undefined for any reason, fall back to an empty string.
        const currentWord = words[index] ?? "";
        setDisplayedText((prev) => {
          // Add a space before each word except the first.
          return prev + (index > 0 ? " " : "") + currentWord;
        });
        index++;
      } else {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

export default TypewriterText;
