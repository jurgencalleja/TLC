interface Phase {
    number: number;
    name: string;
    status: 'completed' | 'in_progress' | 'pending';
}
export declare function PhasesPane(): import("react/jsx-runtime").JSX.Element;
export declare function parseRoadmap(content: string): Phase[];
export {};
