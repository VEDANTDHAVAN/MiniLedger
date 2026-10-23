
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { requestOtp, verifyOtp } from "./src/lib/auth";
import { clearToken, getToken, saveToken } from "./src/lib/api";
import {
  createLoan,
  fetchLoans,
  fetchSummary,
  repayLoan,
  type Loan,
  type LoanSummary,
} from "./src/lib/loans";

type Screen = "dashboard" | "add-loan";

const COLORS = {
  background: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#2457E6",
  text: "#172033",
  muted: "#697386",
  border: "#E5E9F2",
  green: "#16804A",
  greenLight: "#E8F7EE",
  red: "#C62828",
  redLight: "#FDECEC",
  blueLight: "#EAF0FF",
};

function money(value: string | number): string {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function dateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function errorMessage(error: any, fallback: string): string {
  return (
    error?.response?.data?.message ??
    error?.message ??
    fallback
  );
}

export default function App() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary>({
    totalLent: "0.00",
    totalRepaid: "0.00",
    overdueAmount: "0.00",
  });

  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    getToken()
      .then((token) => {
        if (active && token) setAuthenticated(true);
      })
      .catch(() => {
        if (active) setError("Unable to restore your session.");
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    const [nextLoans, nextSummary] = await Promise.all([
      fetchLoans(),
      fetchSummary(),
    ]);

    setLoans(nextLoans);
    setSummary(nextSummary);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    loadDashboard().catch((err) => {
      setError(errorMessage(err, "Unable to load your loans."));
    });
  }, [authenticated, loadDashboard]);

  async function handleRequestOtp() {
    setError("");
    setNotice("");

    const normalized = phone.replace(/[\s()-]/g, "");
    const valid = /^\d{10}$/.test(normalized) ||
      /^\+[1-9]\d{7,14}$/.test(normalized);

    if (!valid) {
      setError("Enter a valid phone number.");
      return;
    }

    const formatted = /^\d{10}$/.test(normalized)
      ? `+91${normalized}`
      : normalized;

    setBusy(true);

    try {
      await requestOtp(formatted);
      setPhone(formatted);
      setOtpRequested(true);
      setNotice("OTP requested. Check the API server logs.");
    } catch (err) {
      setError(errorMessage(err, "Could not request OTP."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setNotice("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setBusy(true);

    try {
      const result = await verifyOtp(phone, otp);

      if (!result.token) {
        throw new Error("The API response does not contain a token.");
      }

      await saveToken(result.token);
      setAuthenticated(true);
      setOtp("");
    } catch (err) {
      setError(errorMessage(err, "OTP verification failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await clearToken();
      setAuthenticated(false);
      setOtpRequested(false);
      setPhone("");
      setOtp("");
      setLoans([]);
      setSummary({
        totalLent: "0.00",
        totalRepaid: "0.00",
        overdueAmount: "0.00",
      });
      setScreen("dashboard");
      setError("");
      setNotice("");
    } catch {
      setError("Unable to sign out.");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");

    try {
      await loadDashboard();
    } catch (err) {
      setError(errorMessage(err, "Unable to refresh your loans."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateLoan() {
    setError("");
    setNotice("");

    const cleanName = friendName.trim();
    const parsedAmount = Number(amount);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) &&
      !Number.isNaN(new Date(`${dueDate}T00:00:00.000Z`).getTime()) &&
      new Date(`${dueDate}T00:00:00.000Z`)
        .toISOString()
        .slice(0, 10) === dueDate;

    if (!cleanName || cleanName.length > 100) {
      setError("Enter a friend's name (maximum 100 characters).");
      return;
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > 9_999_999_999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(amount.trim())
    ) {
      setError("Enter a positive amount with up to 2 decimal places.");
      return;
    }

    if (!validDate) {
      setError("Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    setBusy(true);

    try {
      await createLoan({
        friendName: cleanName,
        amount: parsedAmount,
        dueDate,
      });

      await loadDashboard();

      setFriendName("");
      setAmount("");
      setDueDate("");
      setScreen("dashboard");
      setNotice("Loan added successfully.");
    } catch (err) {
      setError(errorMessage(err, "Unable to create the loan."));
    } finally {
      setBusy(false);
    }
  }

  function handleRepay(loan: Loan) {
    Alert.alert(
      "Mark as repaid?",
      `Confirm that ${loan.friendName} has repaid ${money(loan.amount)}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm repayment",
          onPress: async () => {
            setError("");
            setBusy(true);

            try {
              await repayLoan(loan.id);
              await loadDashboard();
              setNotice(`${loan.friendName}'s loan was marked as repaid.`);
            } catch (err) {
              setError(errorMessage(err, "Unable to update repayment."));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading MiniLedger…</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.loginContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>M</Text>
              </View>
              <Text style={styles.brandName}>MiniLedger</Text>
            </View>

            <View style={styles.loginHero}>
              <Text style={styles.eyebrow}>YOUR PERSONAL LENDING TRACKER</Text>
              <Text style={styles.heroTitle}>
                Keep track of{"\n"}every rupee.
              </Text>
              <Text style={styles.subtitle}>
                Know who owes you, what's due, and what's been repaid.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {otpRequested ? "Verify your number" : "Welcome back"}
              </Text>
              <Text style={styles.subtitle}>
                {otpRequested
                  ? `Enter the OTP sent to ${phone}.`
                  : "Sign in using your phone number."}
              </Text>

              <Text style={styles.label}>
                {otpRequested ? "6-digit OTP" : "Phone number"}
              </Text>

              <TextInput
                style={[styles.input, otpRequested && styles.otpInput]}
                value={otpRequested ? otp : phone}
                onChangeText={(value) => {
                  if (otpRequested) {
                    setOtp(value.replace(/\D/g, "").slice(0, 6));
                  } else {
                    setPhone(value);
                  }
                }}
                placeholder={otpRequested ? "000000" : "98765 43210"}
                placeholderTextColor="#9298A5"
                keyboardType="phone-pad"
                editable={!busy}
                maxLength={otpRequested ? 6 : 18}
              />

              <Pressable
                style={[styles.primaryButton, busy && styles.disabled]}
                disabled={busy}
                onPress={otpRequested ? handleVerifyOtp : handleRequestOtp}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {otpRequested ? "Verify and continue" : "Request OTP"}
                  </Text>
                )}
              </Pressable>

              {otpRequested && (
                <Pressable
                  style={styles.textButton}
                  onPress={() => {
                    setOtpRequested(false);
                    setOtp("");
                    setError("");
                    setNotice("");
                  }}
                >
                  <Text style={styles.linkText}>Change phone number</Text>
                </Pressable>
              )}

              {!!notice && <Text style={styles.notice}>{notice}</Text>}
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
            </View>

            <Text style={styles.footer}>
              Simple, secure tracking for money lent to friends.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const overdueCount = loans.filter((loan) => loan.isOverdue).length;
  const outstandingCount = loans.filter((loan) => !loan.isRepaid).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View>
            <Text style={styles.brandName}>MiniLedger</Text>
            <Text style={styles.headerSubtitle}>Your money, in view.</Text>
          </View>
        </View>

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            setScreen("dashboard");
            setError("");
          }}
          style={[styles.tab, screen === "dashboard" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              screen === "dashboard" && styles.activeTabText,
            ]}
          >
            My loans
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setScreen("add-loan");
            setError("");
            setNotice("");
          }}
          style={[styles.tab, screen === "add-loan" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              screen === "add-loan" && styles.activeTabText,
            ]}
          >
            + Add loan
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {screen === "dashboard" ? (
          <>
            <View style={styles.welcomeRow}>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.dashboardTitle}>Your overview</Text>
                <Text style={styles.subtitle}>
                  Here's where your lending stands.
                </Text>
              </View>

              <Pressable
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing || busy}
              >
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, styles.summaryPrimary]}>
                <Text style={styles.summaryLabelLight}>TOTAL LENT</Text>
                <Text style={styles.summaryValueLight}>
                  {money(summary.totalLent)}
                </Text>
                <Text style={styles.summaryCaptionLight}>All loans</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>TOTAL REPAID</Text>
                <Text style={[styles.summaryValue, { color: COLORS.green }]}>
                  {money(summary.totalRepaid)}
                </Text>
                <Text style={styles.summaryCaption}>Money returned</Text>
              </View>

              <View style={[styles.summaryCard, styles.overdueSummary]}>
                <Text style={styles.summaryLabel}>OVERDUE AMOUNT</Text>
                <Text style={[styles.summaryValue, { color: COLORS.red }]}>
                  {money(summary.overdueAmount)}
                </Text>
                <Text style={styles.summaryCaption}>
                  {overdueCount} overdue {overdueCount === 1 ? "loan" : "loans"}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your loans</Text>
                <Text style={styles.subtitle}>
                  {outstandingCount} outstanding · {loans.length} total
                </Text>
              </View>
              <Pressable onPress={() => setScreen("add-loan")}>
                <Text style={styles.linkText}>+ Add new</Text>
              </Pressable>
            </View>

            {busy && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.subtitle}>Updating your loans…</Text>
              </View>
            )}

            {loans.length === 0 && !busy ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>₹</Text>
                <Text style={styles.emptyTitle}>No loans yet</Text>
                <Text style={styles.subtitle}>
                  Add your first loan to start tracking repayments.
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setScreen("add-loan")}
                >
                  <Text style={styles.primaryButtonText}>Add your first loan</Text>
                </Pressable>
              </View>
            ) : (
              loans.map((loan) => (
                <View
                  key={loan.id}
                  style={[
                    styles.loanCard,
                    loan.isOverdue && styles.overdueLoanCard,
                  ]}
                >
                  <View style={styles.loanTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(loan.friendName?.trim()[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.loanPerson}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {loan.friendName}
                      </Text>
                      <Text style={styles.loanDueDate}>
                        Due {dateLabel(loan.dueDate)}
                      </Text>
                    </View>

                    <View style={styles.loanAmountContainer}>
                      <Text style={styles.loanAmount}>{money(loan.amount)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          loan.isRepaid
                            ? styles.repaidBadge
                            : loan.isOverdue
                              ? styles.overdueBadge
                              : styles.pendingBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            loan.isRepaid
                              ? styles.repaidText
                              : loan.isOverdue
                                ? styles.overdueText
                                : styles.pendingText,
                          ]}
                        >
                          {loan.isRepaid
                            ? "Repaid"
                            : loan.isOverdue
                              ? "Overdue"
                              : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {!loan.isRepaid && (
                    <Pressable
                      style={styles.repayButton}
                      onPress={() => handleRepay(loan)}
                      disabled={busy}
                    >
                      <Text style={styles.repayButtonText}>
                        Mark as repaid
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.dashboardTitle}>Add a loan</Text>
            <Text style={[styles.subtitle, { marginBottom: 20 }]}>
              Record money you've lent to a friend.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Friend's name</Text>
              <TextInput
                style={styles.input}
                value={friendName}
                onChangeText={setFriendName}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#9298A5"
                maxLength={100}
                editable={!busy}
              />

              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 1500.00"
                placeholderTextColor="#9298A5"
                keyboardType="decimal-pad"
                editable={!busy}
              />

              <Text style={styles.label}>Due date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9298A5"
                maxLength={10}
                editable={!busy}
              />
              <Text style={styles.helper}>
                Use year-month-day format, for example 2026-12-31.
              </Text>

              <Pressable
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={handleCreateLoan}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save loan</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setScreen("dashboard");
                  setError("");
                }}
                disabled={busy}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        )}

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        <Text style={styles.footer}>
          MiniLedger · Keep every repayment accounted for.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.muted },
  loginContainer: { flexGrow: 1, padding: 24, paddingTop: 30 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#FFFFFF", fontSize: 23, fontWeight: "800" },
  brandName: { fontSize: 21, fontWeight: "800", color: COLORS.text },
  headerSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  loginHero: { marginTop: 40, marginBottom: 25 },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 35,
    lineHeight: 42,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DCE1EA",
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  otpInput: { textAlign: "center", fontSize: 24, letterSpacing: 7 },
  primaryButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  textButton: { alignItems: "center", paddingTop: 17 },
  linkText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
  notice: { color: COLORS.green, fontSize: 13, lineHeight: 19, marginTop: 12 },
  error: { color: COLORS.red, fontSize: 13, lineHeight: 20, marginTop: 12 },
  footer: {
    textAlign: "center",
    color: "#8A92A2",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signOutText: { color: COLORS.muted, fontWeight: "700", fontSize: 12 },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#E9EDF5",
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: { color: COLORS.muted, fontWeight: "600", fontSize: 13 },
  activeTabText: { color: COLORS.primary, fontWeight: "800" },
  dashboardContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  welcomeTextContainer: { flex: 1, paddingRight: 8 },
  dashboardTitle: { fontSize: 25, fontWeight: "800", color: COLORS.text },
  refreshButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: COLORS.blueLight,
  },
  refreshText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  summaryGrid: { gap: 12, marginBottom: 28 },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  overdueSummary: { borderColor: "#F4D5D5" },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  summaryLabelLight: {
    color: "#DDE6FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 8,
  },
  summaryValueLight: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: "800",
    marginTop: 8,
  },
  summaryCaption: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  summaryCaptionLight: { color: "#DDE6FF", fontSize: 12, marginTop: 5 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  loanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  overdueLoanCard: {
    borderColor: "#E8A2A2",
    backgroundColor: "#FFFAFA",
  },
  loanTopRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.blueLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  avatarText: { color: COLORS.primary, fontWeight: "800", fontSize: 17 },
  loanPerson: { flex: 1, minWidth: 0 },
  friendName: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  loanDueDate: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  loanAmountContainer: { alignItems: "flex-end", marginLeft: 6 },
  loanAmount: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  repaidBadge: { backgroundColor: COLORS.greenLight },
  overdueBadge: { backgroundColor: COLORS.redLight },
  pendingBadge: { backgroundColor: "#FFF4D8" },
  statusText: { fontSize: 10, fontWeight: "800" },
  repaidText: { color: COLORS.green },
  overdueText: { color: COLORS.red },
  pendingText: { color: "#8B6200" },
  repayButton: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 14,
    paddingTop: 12,
    alignItems: "center",
  },
  repayButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 32, color: COLORS.primary, fontWeight: "800" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 10,
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  helper: { color: COLORS.muted, fontSize: 11, marginTop: 7 },
  cancelButton: { alignItems: "center", paddingVertical: 15 },
  cancelText: { color: COLORS.muted, fontWeight: "700" },
});
