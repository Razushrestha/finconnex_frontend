"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, category: string) => void;
}

export function AddTaskModal({
  open,
  onOpenChange,
  onAddTask,
}: AddTaskModalProps) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("Default");

  const handleClose = () => {
    setTitle("");
    setCategory("Default");
    onOpenChange(false);
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddTask(title.trim(), category);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-2xl p-0"
      >
        <DialogTitle className="sr-only">Add New Task</DialogTitle>

        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">Add New Task</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        <div className="flex flex-col gap-3 px-6 py-5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task"
            className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <Select
            value={category}
            onValueChange={(value) => setCategory(value ?? "Default")}
          >
            <SelectTrigger className="h-12 w-full rounded-xl border-gray-200 px-4 text-sm text-gray-700">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Default">Default</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="High Priority">High Priority</SelectItem>
              <SelectItem value="Info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="secondary"
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            type="button"
            className="bg-violet-600 hover:bg-violet-700"
            onClick={handleAdd}
          >
            Add Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddTaskModal;
