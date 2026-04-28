import Cookies from "js-cookie";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { signup } from "../api/auth.api";
import { readTokenSession, writeTokenSession } from "../lib/tokenization";
import styles from "./AuthPage.module.css";

function SignalCard({ label, value, note }) {
  return (
    <article className={styles.signalCard}>
      <div className={styles.signalLabel}>{label}</div>
      <div className={styles.signalValue}>{value}</div>
      <div className={styles.signalNote}>{note}</div>
    </article>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const session = readTokenSession();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    wallet: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (session) return <Navigate to="/tokenization" replace />;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
async function handleSubmit(e) {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const res = await login(form); // or signup(form)

    const response = res.data;

    if (!response?.success) {
      throw new Error(response?.message || "Auth failed");
    }

    const { user, token } = response.data;

    writeTokenSession({
      ownerName: user?.name,
      ownerEmail: user?.email,
      token: token,
    });

    navigate("/tokenization");

  } catch (err) {
    setError(
      err?.response?.data?.message ||
      err?.message ||
      "Auth failed"
    );
  } finally {
    setLoading(false);
  }
}




  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        {/* LEFT SIDE */}
        <div className={styles.showcase}>
          <div className={styles.badge}>BREEZO operator onboarding</div>
          <div className={styles.orbitBadge}>Premium DePIN onboarding</div>

          <h1 className={styles.title}>
            Create your private node owner account.
          </h1>

          <p className={styles.subtitle}>
            Sign up with full name, email, wallet and password.
          </p>

          <div className={styles.signalRail}>
            <SignalCard
              label="Identity"
              value="Full name"
              note="Operator profile binding"
            />
            <SignalCard
              label="Wallet"
              value="Solana address"
              note="Used for rewards"
            />
            <SignalCard
              label="Access"
              value="JWT session"
              note="Stored in secure cookie"
            />
          </div>
        </div>

        {/* RIGHT SIDE FORM */}
        <div className={styles.card}>
          <div className={styles.formHeader}>
            <div>
              <div className={styles.eyebrow}>Signup</div>
              <div className={styles.formTitle}>Create account</div>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Full name</span>
              <input
                className={styles.input}
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                className={styles.input}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Wallet</span>
              <input
                className={styles.input}
                name="wallet"
                value={form.wallet}
                onChange={handleChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Password</span>
              <input
                className={styles.input}
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>

            {error && <div className={styles.errorBox}>{error}</div>}

            <button
              className={styles.primaryBtn}
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className={styles.switchRow}>
            <span className={styles.switchText}>Already have an account?</span>
            <Link className={styles.linkBtn} to="/login">
              Go to login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
