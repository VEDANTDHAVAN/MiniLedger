import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MiniLedger</Text>
      <Text style={styles.subtitle}>
        Mobile application initialized successfully.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#166534",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
  },
});