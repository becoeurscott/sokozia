import { ThreadView } from "@/components/studio/ThreadView";

export const metadata = { title: "Conversation · Sokozia" };

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  return <ThreadView threadId={threadId} />;
}
