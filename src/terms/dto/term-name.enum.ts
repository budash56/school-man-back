export enum TermName {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
  Final = 'Final',
}

export const TERM_SORT_ORDER: Record<TermName, number> = {
  [TermName.P1]: 1,
  [TermName.P2]: 2,
  [TermName.P3]: 3,
  [TermName.P4]: 4,
  [TermName.Final]: 5,
};
