import * as React from "react";

interface AiAssistantContextType {
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
}

const AiAssistantContext = React.createContext<AiAssistantContextType | undefined>(undefined);

export function AiAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const openAssistant = React.useCallback(() => setIsOpen(true), []);
  const closeAssistant = React.useCallback(() => setIsOpen(false), []);
  const toggleAssistant = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AiAssistantContext.Provider value={{ isOpen, openAssistant, closeAssistant, toggleAssistant }}>
      {children}
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant(): AiAssistantContextType {
  const ctx = React.useContext(AiAssistantContext);
  if (!ctx) {
    throw new Error("useAiAssistant must be used within an AiAssistantProvider");
  }
  return ctx;
}
