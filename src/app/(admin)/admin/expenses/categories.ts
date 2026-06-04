export const EXPENSE_CATEGORIES = [
  "Papelaria",
  "Materiais Clínicos",
  "Doação",
  "Cedidos",
  "Cantina",
  "Higiene",
  "Sinalização",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
