import { Body, Card, Label, Screen, Title } from "@/components/ui";

/** Plain-language transparency for whoever uses this phone. */
export default function ChildPrivacy() {
  return (
    <Screen>
      <Title>What SafeNest does here</Title>
      <Body muted>SafeNest is visible on purpose. Anyone using this phone can read how it works.</Body>
      <Card>
        <Label>What it does today</Label>
        <Body>
          It links this phone to a child&apos;s profile, downloads the website rules the parent set, and tells SafeNest
          that the phone is online and which app version it runs.
        </Body>
      </Card>
      <Card>
        <Label>What it doesn&apos;t do yet</Label>
        <Body>
          It doesn&apos;t block websites on this phone yet. When it does, it will check only the names of websites (such as
          youtube.com) against the parent&apos;s rules and report blocked attempts: the website name and the time.
        </Body>
      </Card>
      <Card>
        <Label>What it never collects</Label>
        <Body>Page contents, full web addresses or searches, messages, passwords, keystrokes, screenshots, photos, your location, the camera or the microphone.</Body>
      </Card>
    </Screen>
  );
}
