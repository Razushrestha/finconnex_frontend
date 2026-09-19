/** Map a typed Kanban title onto an existing mortgage pipeline stage. */

export type StageTitleOption = {
  id: string;
  label: string;
  required?: boolean;
};

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function displayStageLabel(
  stage: StageTitleOption,
  labels?: Record<string, string>,
) {
  const custom = labels?.[stage.id]?.trim();
  return custom || stage.label;
}

export function bindKanbanStageTitle(input: {
  stages: StageTitleOption[];
  selectedStageIds: string[];
  stageLabels: Record<string, string>;
  title: string;
}):
  | {
      ok: true;
      selectedStageIds: string[];
      stageLabels: Record<string, string>;
      stageId: string;
    }
  | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Enter a stage title" };

  const selected = input.selectedStageIds.filter((id) =>
    input.stages.some((stage) => stage.id === id),
  );
  const selectedSet = new Set(selected);
  const needle = normalizeTitle(title);

  const match = input.stages.find(
    (stage) => normalizeTitle(displayStageLabel(stage, input.stageLabels)) === needle,
  );
  if (match) {
    if (selectedSet.has(match.id)) {
      return {
        ok: true,
        selectedStageIds: selected,
        stageLabels: { ...input.stageLabels },
        stageId: match.id,
      };
    }
    return {
      ok: true,
      selectedStageIds: [...selected, match.id],
      stageLabels: { ...input.stageLabels },
      stageId: match.id,
    };
  }

  const hidden = input.stages.filter((stage) => !selectedSet.has(stage.id));
  const bind = hidden.find((stage) => !stage.required) ?? hidden[0];
  if (!bind) {
    return {
      ok: false,
      error:
        "All pipeline stages are already on the board. Hide one with the trash icon, or rename an existing title.",
    };
  }

  return {
    ok: true,
    selectedStageIds: [...selected, bind.id],
    stageLabels: { ...input.stageLabels, [bind.id]: title },
    stageId: bind.id,
  };
}
