import { ChildProcess } from 'child_process';
type AgentStatus = 'idle' | 'working' | 'done' | 'error';
interface Agent {
    id: number;
    status: AgentStatus;
    task: string | null;
    issueNumber: number | null;
    output: string[];
    process: ChildProcess | null;
}
interface AgentsPaneProps {
    isActive: boolean;
    isTTY?: boolean;
    onTaskComplete?: (issueNumber: number) => void;
}
export declare function AgentsPane({ isActive, isTTY, onTaskComplete }: AgentsPaneProps): import("react/jsx-runtime").JSX.Element;
export declare function getIdleAgent(agents: Agent[]): Agent | undefined;
export {};
