import RemoteGame from "@/components/RemoteGame";

export default async function RoomGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RemoteGame code={code.toUpperCase()} />;
}
