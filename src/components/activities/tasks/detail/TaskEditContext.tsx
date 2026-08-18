"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SectionHandlers = {
  start: () => void;
  save: () => void;
  cancel: () => void;
};

type TaskEditContextValue = {
  editing: boolean;
  beginEdit: () => void;
  saveAll: () => void;
  cancelAll: () => void;
  register: (id: string, handlers: SectionHandlers) => () => void;
};

const TaskEditContext = createContext<TaskEditContextValue | null>(null);

export function TaskEditProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const handlersRef = useRef(new Map<string, SectionHandlers>());

  const register = useCallback((id: string, handlers: SectionHandlers) => {
    handlersRef.current.set(id, handlers);
    return () => {
      handlersRef.current.delete(id);
    };
  }, []);

  const beginEdit = useCallback(() => {
    handlersRef.current.forEach((handlers) => handlers.start());
    setEditing(true);
  }, []);

  const saveAll = useCallback(() => {
    handlersRef.current.forEach((handlers) => handlers.save());
    setEditing(false);
  }, []);

  const cancelAll = useCallback(() => {
    handlersRef.current.forEach((handlers) => handlers.cancel());
    setEditing(false);
  }, []);

  return (
    <TaskEditContext.Provider
      value={{ editing, beginEdit, saveAll, cancelAll, register }}
    >
      {children}
    </TaskEditContext.Provider>
  );
}

export function useTaskPageEditing() {
  const ctx = useContext(TaskEditContext);
  if (!ctx) {
    throw new Error("useTaskPageEditing must be used within TaskEditProvider");
  }
  return ctx;
}

export function useTaskSectionEdit(handlers: SectionHandlers) {
  const ctx = useContext(TaskEditContext);
  const id = useId();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!ctx) return;
    return ctx.register(id, {
      start: () => handlersRef.current.start(),
      save: () => handlersRef.current.save(),
      cancel: () => handlersRef.current.cancel(),
    });
  }, [ctx, id]);

  return ctx?.editing ?? false;
}
