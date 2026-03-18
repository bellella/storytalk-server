/** BRANCH_TRIGGER / BRANCH_AND_TRIGGER 씬의 data 필드 구조 */
export interface BranchTriggerSceneData {
  threshold?: number;
  candidateKeys?: string[];
  selectionMode?: 'TOP' | string;
  fallbackKeys?: string[];
}
