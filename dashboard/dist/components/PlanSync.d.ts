interface Task {
    id: string;
    title: string;
    description: string;
    phase: number;
}
export declare function parseTasksFromPlan(planPath: string): Promise<Task[]>;
export declare function syncPlanToGitHub(tasks: Task[], phaseNumber: number, phaseName: string): Promise<Map<string, number>>;
export declare function markIssueInProgress(issueNumber: number): Promise<void>;
export declare function markIssueComplete(issueNumber: number): Promise<void>;
export declare function isPlanApproved(planPath: string): Promise<boolean>;
export declare function approvePlan(planPath: string): Promise<void>;
export {};
