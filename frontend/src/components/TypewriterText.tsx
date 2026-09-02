import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterText({
  text,
  speed = 60,
  onComplete,
  className,
}: TypewriterTextProps) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayedWords([]);
    setIsComplete(false);
    indexRef.current = 0;

    if (!text) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const words = text.split(' ');

    function typeNext() {
      if (indexRef.current < words.length) {
        setDisplayedWords((prev) => [...prev, words[indexRef.current]]);
        indexRef.current++;
        timerRef.current = setTimeout(typeNext, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    }

    timerRef.current = setTimeout(typeNext, speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed, onComplete]);

  if (!text) return null;

  return (
    <span className={className}>
      {displayedWords.map((word, i) => (
        <span key={i}>
          {word}
          {i < displayedWords.length - 1 ? ' ' : ''}
        </span>
      ))}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}
