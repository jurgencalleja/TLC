interface Issue {
    number: number;
    title: string;
    state: 'open' | 'closed';
    labels: string[];
    assignee: string | null;
}
interface GitHubPaneProps {
    isActive: boolean;
    isTTY?: boolean;
    onAssignToAgent?: (issue: Issue) => void;
}
export declare function GitHubPane({ isActive, isTTY, onAssignToAgent }: GitHubPaneProps): import("react/jsx-runtime").JSX.Element;
export declare function syncTaskToGitHub(title: string, body: string): Promise<number | null>;
export declare function markIssueComplete(number: number): Promise<void>;
export {};
