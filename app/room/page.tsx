import { Suspense } from "react";
import RoomLobby from "@/components/RoomLobby";

export default function RoomPage() {
  return (
    <Suspense>
      <RoomLobby />
    </Suspense>
  );
}
