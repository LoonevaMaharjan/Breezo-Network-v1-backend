import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {getNodeRewardBalance} from '../solana/program/breezo.method'
import { dashboard as fetchDashboard } from "../api/dashboard.api";
import { readTokenSession, TOKEN_SESSION_EVENT } from "../lib/tokenization";

import idl from "../idl/breezo.json";
import styles from "./TokenizationPage.module.css";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("HtKDMvdm79VWbxmaeeBz5yM4qCV6Tg28MeYAk6honseH");
const LAMPORTS_PER_BREEZO = 1_000_000_000;

const getTreasuryPDA = () =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    PROGRAM_ID
  )[0];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatTimeAgo = (date) => {
  if (!date) return "just now";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const aqiColor = (level) => {
  if (level === "GOOD") return "#2dd4bf";
  if (level === "MODERATE") return "#fbbf24";
  return "#f87171";
};

const lamportsToBreezo = (raw) =>
  raw ? Number(BigInt(raw)) / LAMPORTS_PER_BREEZO : 0;
// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function TokenizationPage() {
   const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [toast, setToast] = useState(null);

  const intervalRef = useRef(null);

  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected, disconnect } = wallet;

  const walletConnected = connected && !!publicKey;
  const walletAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);

  // ── Anchor program ───────────────────────────────────────────────────────────
  // FIX: pass wallet object directly (not destructured), no PROGRAM_ID arg needed
  // — new Anchor reads address from idl.address automatically
 const program = useMemo(() => {
    if (!walletConnected || !publicKey) return null;

    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    return new Program(idl, provider);
  }, [connection, walletConnected, publicKey]);

  // ── session ──────────────────────────────────────────────────────────────────
 useEffect(() => {
    const s = readTokenSession();
    setSession(s);
    setSessionReady(true);

    const onChange = (e) => setSession(e.detail);
    window.addEventListener(TOKEN_SESSION_EVENT, onChange);

    return () => window.removeEventListener(TOKEN_SESSION_EVENT, onChange);
  }, []);

  // ── fetch dashboard ──────────────────────────────────────────────────────────
const loadDashboard = async (walletAddr) => {
    if (!walletAddr || !program) return;

    try {
      setLoading(true);

      const res = await fetchDashboard(walletAddr);
      const data = Array.isArray(res) ? res : res?.data ?? [];

      const enriched = await Promise.all(
        data.map(async (node) => {
          try {
            if (!node.nodeAccount) {
              return { ...node, onChainReward: 0 };
            }

            const acc = await program.account.nodeAccount.fetch(
              new PublicKey(node.nodeAccount)
            );

            const rewardweb3 =  getNodeRewardBalance(program , node.nodeAccount)
            console.log("web3 rewar =====",rewardweb3)
            return {
              ...node,
              onChainReward: lamportsToBreezo(rewardweb3?.toString()),
            };
          } catch {
            return { ...node, onChainReward: 0 };
          }
        })
      );

      setNodes(enriched);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // ── auto-refresh every 2 min ─────────────────────────────────────────────────
  useEffect(() => {
    if (!walletConnected) return;

    loadDashboard(walletAddress);

    intervalRef.current = setInterval(() => {
      loadDashboard(walletAddress);
    }, 120000);

    return () => clearInterval(intervalRef.current);
  }, [walletConnected, walletAddress, program]);

  // ── claim ─────────────────────────────────────────────────────────────────────
 const handleClaim = async (node) => {
    try {
      setClaiming(node.nodeId);

      await program.methods
        .claimReward()
        .accounts({
          nodeAccount: new PublicKey(node.nodeAccount),
          owner: publicKey,
          treasury: getTreasuryPDA(),
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setToast({ type: "success", msg: "Claim successful 🚀" });

      await loadDashboard(walletAddress);
    } catch (err) {
      setToast({ type: "error", msg: err?.message || "Claim failed" });
    } finally {
      setClaiming(null);
      setTimeout(() => setToast(null), 4000);
    }
  };;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // ── derived totals ────────────────────────────────────────────────────────────
  const totalOnChain = nodes.reduce((a, n) => a + (n.onChainReward || 0), 0);
  const totalWeb2 = nodes.reduce((a, n) => a + (n.reward || 0), 0);
  const claimableCount = nodes.filter((n) => n.onChainReward > 0).length;

  // ── guards ────────────────────────────────────────────────────────────────────
  if (sessionReady && !session) return <Navigate to="/login" replace />;

  // ── wallet not connected ──────────────────────────────────────────────────────
  if (!walletConnected) {
    return (
      <div className={styles.page}>
        <div className={styles.identityPanel} style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <p className={styles.kicker}>Breezo DePIN</p>
          <h1 className={styles.title}>Connect<br />Wallet</h1>
          <p className={styles.subtitle}>
            Connect your Phantom wallet to view your air quality nodes and claim BREEZO token rewards.
          </p>
          <div className={styles.metaRow} style={{ justifyContent: "center", marginTop: 28 }}>
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  // ── loading ───────────────────────────────────────────────────────────────────
  if (loading && nodes.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <p className={styles.kicker}>Dashboard</p>
          <p className={styles.subtitle} style={{ marginTop: 10 }}>
            Loading nodes + reading on-chain balances…
          </p>
        </div>
      </div>
    );
  }

  // ── no nodes ──────────────────────────────────────────────────────────────────
  if (!loading && nodes.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.identityPanel}>
          <p className={styles.kicker}>No Nodes Found</p>
          <h2 className={styles.panelTitle} style={{ marginTop: 10 }}>No registered nodes</h2>
          <p className={styles.subtitle}>This wallet has no air quality nodes on record.</p>
          <div className={styles.metaRow} style={{ marginTop: 20 }}>
            <button className={styles.secondaryBtn} onClick={() => loadDashboard(walletAddress)}>Retry</button>
            <button className={styles.secondaryBtn} onClick={disconnect}>Disconnect</button>
          </div>
        </div>
      </div>
    );
  }

  // ── main dashboard ────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 14,
          background: toast.type === "success" ? "rgba(45,212,191,0.12)" : "rgba(248,113,113,0.12)",
          border: `1px solid ${toast.type === "success" ? "rgba(45,212,191,0.35)" : "rgba(248,113,113,0.35)"}`,
          color: toast.type === "success" ? "#2dd4bf" : "#f87171",
          fontSize: 14, fontWeight: 600,
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          maxWidth: 340,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── COMMAND DECK ── */}
      <div className={styles.commandDeck}>

        {/* LEFT — Identity */}
        <div className={styles.identityPanel}>
          <div className={styles.panelTopline}>
            <p className={styles.kicker}>DePIN Reward Dashboard</p>
            <span className={styles.metaPill}>
              {walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
            </span>
          </div>

          <h1 className={styles.title}>Reward<br />Earnings</h1>
          <p className={styles.subtitle}>
            Sensor data streams to Web2. When your node earns ≥ 10 BREEZO the backend
            syncs it on-chain via <code style={{ color: "#a78bfa", fontSize: 12 }}>add_reward</code>.
            Once synced, claim directly to your wallet.
          </p>

          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}>
              <span>Total Nodes</span>
              <strong>{nodes.length}</strong>
              {/* <p>{liveCount} live · {syncingCount} syncing</p> */}
            </div>
            <div className={styles.snapshotCard}>
              <span>Claimable On-Chain</span>
              <strong style={{ color: "#38bdf8" }}>{totalOnChain.toFixed(4)}</strong>
              <p>BREEZO ready now</p>
            </div>
            <div className={styles.snapshotCard}>
              <span>Earned Web2</span>
              <strong style={{ color: "#a78bfa" }}>{totalWeb2.toFixed(2)}</strong>
              <p>BREEZO pending sync</p>
            </div>
            <div className={styles.snapshotCard}>
              <span>Last Refresh</span>
              <strong style={{ fontSize: 16, letterSpacing: "-0.02em" }}>
                {formatTimeAgo(lastUpdated)}
              </strong>
              <p>auto every 2 min</p>
            </div>
          </div>

          <div className={styles.metaRow}>
            <button
              className={styles.secondaryBtn}
              onClick={() => loadDashboard(walletAddress)}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button className={styles.secondaryBtn} onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </div>

        {/* RIGHT — Claim summary */}
        <div className={styles.actionPanel}>
          <div className={styles.panelTopline}>
            <p className={styles.kicker}>Claim Summary</p>
          </div>

          <h2 className={styles.panelTitle}>
            {totalOnChain > 0
              ? `${totalOnChain.toFixed(4)} BREEZO`
              : "Nothing to claim"}
          </h2>

          <div className={styles.actionStack}>
            <div className={styles.actionStat}>
              <span>On-chain balance</span>
              <strong style={{ color: "#38bdf8" }}>{totalOnChain.toFixed(4)} BREEZO</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Web2 accumulated</span>
              <strong style={{ color: "#a78bfa" }}>{totalWeb2.toFixed(2)} BREEZO</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Nodes with rewards</span>
              <strong>{claimableCount} / {nodes.length}</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Sync threshold</span>
              <strong>≥ 10 BREEZO</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Chain sync</span>
              {/* <strong style={{ color: syncingCount > 0 ? "#fbbf24" : "#2dd4bf" }}>
                {syncingCount > 0 ? `${syncingCount} in progress` : "All synced"}
              </strong> */}
            </div>
          </div>

          {1 > 4 && (
            <div className={styles.successBox} style={{
              borderColor: "rgba(251,191,36,0.3)",
              background: "rgba(251,191,36,0.07)",
              color: "#fbbf24",
            }}>
              {/* ⏳ {syncingCount} node{syncingCount > 1 ? "s" : ""} currently syncing rewards to chain. */}
            </div>
          )}

          {totalOnChain > 0 && (
            <div className={styles.successBox}>
              ✓ {claimableCount} node{claimableCount > 1 ? "s are" : " is"} ready to claim below ↓
            </div>
          )}

          <div className={styles.contextCard} style={{ marginTop: 4 }}>
            <span>Account Type</span>
            <strong style={{ fontSize: 12, fontFamily: "monospace" }}>
              Keypair account (not PDA)
            </strong>
            <p style={{ marginTop: 6, fontSize: 13 }}>
              Each node's <code style={{ color: "#a78bfa", fontSize: 11 }}>nodeAccount</code> is a
              keypair generated on the backend during <code style={{ color: "#a78bfa", fontSize: 11 }}>initNode</code> and
              stored in MongoDB. Treasury is a PDA with seed{" "}
              <code style={{ color: "#a78bfa", fontSize: 11 }}>"treasury"</code>.
            </p>
          </div>
        </div>
      </div>

      {/* ── NODE GRID + PIPELINE ── */}
      <div className={styles.contentGrid}>

        {/* LEFT — Node cards */}
        <div className={styles.telemetryPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.sectionLabel}>Your Nodes</p>
            <span className={styles.metaPill}>{nodes.length} registered</span>
          </div>

          <div className={styles.fieldGrid}>
            {nodes.map((node, i) => {
              const onChainReward = node.onChainReward ?? 0;
              const web2Reward    = node.reward ?? 0;
              const claimable     = onChainReward > 0;
              const pendingSync   = web2Reward > 0 && onChainReward === 0 && !node.syncing;
              const syncing       = node.syncing;
              const isClaiming    = claiming === node.nodeId;
              const color         = aqiColor(node.aqiLevel);

              return (
                <div key={node.nodeId || i} className={styles.fieldCard}>

                  {/* header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Node #{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={styles.levelBadge}
                      style={{ color, fontSize: 10, padding: "2px 10px", minHeight: 22 }}
                    >
                      {node.aqiLevel ?? "—"}
                    </span>
                  </div>

                  {/* node ID */}
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569" }}>
                    {node.nodeId
                      ? `${node.nodeId.slice(0, 8)}…${node.nodeId.slice(-5)}`
                      : "—"}
                  </span>

                  {/* AQI */}
                  <strong style={{ color, fontSize: 28, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    {node.aqi ?? "—"}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#647086", marginLeft: 5 }}>AQI</span>
                  </strong>

                  {/* sensor row */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {node.pm25 != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        PM2.5 · {node.pm25}
                      </span>
                    )}
                    {node.pm10 != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        PM10 · {node.pm10}
                      </span>
                    )}
                    {node.temperature != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        {node.temperature}°C
                      </span>
                    )}
                  </div>

                  {/* live / syncing indicator */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: syncing ? "#fbbf24" : "#2dd4bf",
                    }} />
                    <span className={styles.kicker} style={{ letterSpacing: "0.1em" }}>
                      {syncing ? "Syncing to chain" : "Live"} · {formatTimeAgo(node.lastSeen)}
                    </span>
                  </div>

                  {/* ── STATE 1: CLAIMABLE ── */}
                  {claimable && (
                    <>
                      <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                        <span>On-chain balance</span>
                        <strong style={{ color: "#38bdf8" }}>{onChainReward.toFixed(4)} BREEZO</strong>
                      </div>
                      {web2Reward > 0 && (
                        <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                          <span>Web2 earned</span>
                          <strong style={{ color: "#a78bfa" }}>{web2Reward.toFixed(2)} BREEZO</strong>
                        </div>
                      )}
                      <button
                        className={styles.primaryBtn}
                        onClick={() => handleClaim(node)}
                        disabled={claiming !== null}
                        style={{ width: "100%" }}
                      >
                        {isClaiming ? "Claiming…" : `Claim ${onChainReward.toFixed(4)} BREEZO`}
                      </button>
                    </>
                  )}

                  {/* ── STATE 2: PENDING SYNC ── */}
                  {pendingSync && (
                    <>
                      <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                        <span>Web2 earned</span>
                        <strong style={{ color: "#a78bfa" }}>{web2Reward.toFixed(2)} BREEZO</strong>
                      </div>
                      <div className={styles.successBox} style={{
                        borderColor: "rgba(251,191,36,0.3)",
                        background: "rgba(251,191,36,0.07)",
                        color: "#fbbf24", fontSize: 12, marginTop: 0,
                      }}>
                        {web2Reward >= 10
                          ? "⏳ Threshold met — awaiting backend sync to chain."
                          : `⏳ ${(10 - web2Reward).toFixed(2)} BREEZO until sync threshold.`}
                      </div>
                    </>
                  )}

                  {/* ── STATE 3: MID-SYNC ── */}
                  {syncing && !claimable && (
                    <div className={styles.successBox} style={{
                      borderColor: "rgba(56,189,248,0.3)",
                      background: "rgba(56,189,248,0.07)",
                      color: "#38bdf8", fontSize: 12, marginTop: 0,
                    }}>
                      🔄 On-chain write in progress — balance updating…
                    </div>
                  )}

                  {/* ── STATE 4: IDLE ── */}
                  {!claimable && !pendingSync && !syncing && (
                    <span className={styles.kicker} style={{ color: "#374151" }}>No rewards yet</span>
                  )}

                  {/* Account address */}
                  {node.pdaAddress && (
                    <span
                      title={node.pdaAddress}
                      style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", cursor: "default" }}
                    >
                      Acct: {node.pdaAddress.slice(0, 8)}…{node.pdaAddress.slice(-5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Pipeline explanation */}
        <div className={styles.contextPanel}>
          <p className={styles.sectionLabel}>Reward Pipeline</p>
          <h3 className={styles.panelTitle} style={{ fontSize: 20, marginTop: 8 }}>How it works</h3>

          <div className={styles.contextStack} style={{ marginTop: 16 }}>
            <div className={styles.contextCard}>
              <span>Step 1 — Stream</span>
              <strong>Sensor ingests data</strong>
              <p>
                Your IoT device sends signed payloads to the server. Each reading
                calculates a reward based on PM2.5 via <code style={{ color: "#a78bfa", fontSize: 11 }}>calculateReward(pm25)</code> and
                accumulates in <code style={{ color: "#a78bfa", fontSize: 11 }}>NodeLatest.reward</code>.
              </p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 2 — Threshold</span>
              <strong>≥ 10 BREEZO triggers sync</strong>
              <p>
                When <code style={{ color: "#a78bfa", fontSize: 11 }}>NodeLatest.reward ≥ 10</code> and the node isn't already
                syncing, the backend calls <code style={{ color: "#a78bfa", fontSize: 11 }}>add_reward</code> on-chain
                and sets <code style={{ color: "#a78bfa", fontSize: 11 }}>syncing: true</code>.
              </p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 3 — On-chain</span>
              <strong>Account balance updated</strong>
              <p>
                The keypair account at <code style={{ color: "#a78bfa", fontSize: 11 }}>Node.nodeAccount</code> receives the
                reward amount in <code style={{ color: "#a78bfa", fontSize: 11 }}>rewardBalance</code>. The dashboard
                reads this directly via Anchor.
              </p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 4 — Claim</span>
              <strong>Transfer to wallet</strong>
              <p>
                You call <code style={{ color: "#a78bfa", fontSize: 11 }}>claim_reward</code>. Lamports move from
                the Treasury PDA to your connected wallet. <code style={{ color: "#a78bfa", fontSize: 11 }}>rewardBalance</code> resets to 0.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
