export interface Conversation {
  id: string;
  title: string;
  date: string;
  project: string;
  decisionsCount: number;
  permanent: boolean;
  excerpt: string;
}

export function ConversationBrowser(_props: { conversations: Conversation[]; onSelect?: (id: string) => void; loading?: boolean }) {
  return <div>TODO</div>;
}
