export type RelatedRecordKind = "deal" | "lead";

export interface RelatedRecord {
  id: string;
  kind: RelatedRecordKind;
  title: string;
  stage: string;
  href: string;
  progress: number;
  total: number;
}
