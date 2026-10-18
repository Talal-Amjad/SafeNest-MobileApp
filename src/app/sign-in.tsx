import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { errorMessage } from "@/api";
import { Body, Button, Field, Notice, Screen, Title } from "@/components/ui";
import { useSession } from "@/state/session";

export default function SignIn() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.status === "parent") return <Redirect href="/(parent)/home" />;
  if (session.status === "choose-role") return <Redirect href="/" />;

  async function submit() {
    if (!email.includes("@") || !password) {
      setError("Enter the email and password of your SafeNest account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await session.signIn(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Title>Welcome back</Title>
        <Body muted>Sign in with your SafeNest parent account. New here? Create one on the SafeNest website first.</Body>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error && <Notice tone="danger">{error}</Notice>}
        <Button title={busy ? "Signing in…" : "Sign in"} onPress={submit} busy={busy} />
        <Button title="This is my child's phone instead" variant="secondary" onPress={session.resetRole} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
