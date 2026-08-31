import type { FormField } from "./types";

export function removeFieldById(fields: FormField[], id: string): FormField[] {
  return fields
    .filter((f) => f.id !== id)
    .map((f) =>
      f.columns
        ? { ...f, columns: f.columns.map((col) => removeFieldById(col, id)) }
        : f,
    );
}

export function updateFieldById(
  fields: FormField[],
  id: string,
  patch: Partial<FormField>,
): FormField[] {
  return fields.map((f) => {
    if (f.id === id) return { ...f, ...patch };
    if (f.columns) {
      return {
        ...f,
        columns: f.columns.map((col) => updateFieldById(col, id, patch)),
      };
    }
    return f;
  });
}

export function insertFieldInColumn(
  fields: FormField[],
  layoutFieldId: string,
  columnIndex: number,
  newField: FormField,
): FormField[] {
  return fields.map((f) => {
    if (f.id === layoutFieldId && f.columns) {
      return {
        ...f,
        columns: f.columns.map((col, i) =>
          i === columnIndex ? [...col, newField] : col,
        ),
      };
    }
    if (f.columns) {
      return {
        ...f,
        columns: f.columns.map((col) =>
          insertFieldInColumn(col, layoutFieldId, columnIndex, newField),
        ),
      };
    }
    return f;
  });
}
