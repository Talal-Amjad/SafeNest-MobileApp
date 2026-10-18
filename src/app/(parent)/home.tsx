import { Body, Card, Screen, Title } from "@/components/ui";
import { useSession } from "@/state/session";

// Children and device status arrive in task 4.
export default function Home() {
  const session = useSession();
  const name = session.status === "parent" ? session.me.user.full_name : "";
  return (
    <Screen>
      <Title>Hi {name.split(" ")[0] || "there"}</Title>
      <Card>
        <Body muted>Your children and their devices will appear here.</Body>
      </Card>
    </Screen>
  );
}
