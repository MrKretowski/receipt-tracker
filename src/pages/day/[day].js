import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

// Helper to format currency
function formatCurrency(value) {
  return value.toFixed(2);
}

export default function DayPage() {
  const router = useRouter();
  const { day } = router.query;

  const [user, setUser] = useState(null);
  // Receipts stored in ascending order (oldest first)
  const [receipts, setReceipts] = useState([]);
  // mainIndex indicates which receipt is in the CENTER (main position)
  const [mainIndex, setMainIndex] = useState(0);
  const [dayTotal, setDayTotal] = useState(0);

  // Modal state for adding a new receipt
  const [showModal, setShowModal] = useState(false);
  const [modalShop, setModalShop] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // Check authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

  // Fetch receipts for this day (ordered oldest first)
  async function fetchReceiptsForDay() {
    if (!user || !day) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // adjust for 0-index
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching receipts:", error);
      return;
    }

    let total = 0;
    data.forEach((r) => {
      total += parseFloat(r.amount) || 0;
    });
    setDayTotal(total);
    setReceipts(data);
    // If no receipts exist, mainIndex remains 0; otherwise, leave as is.
    if (data.length === 0) {
      setMainIndex(0);
    }
  }

  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // ---------- Modal Logic ----------
  function openModal() {
    setModalShop("");
    setModalAmount("");
    setModalDescription("");
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
  }
  async function handleModalSave() {
    if (!modalShop || !modalAmount) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase.from("receipts").insert([
      {
        user_id: user.id,
        shop_name: modalShop,
        amount: parseFloat(modalAmount),
        description: modalDescription,
        date: dateStr,
      },
    ]);

    if (error) {
      console.error("Error adding receipt:", error);
      return;
    }
    const newReceipt = data[0];
    // If no receipts exist, just set newReceipt as the only element;
    // otherwise, insert the new receipt at index 1 so that the old main shifts left.
    setReceipts((prev) => {
      if (prev.length === 0) {
        return [newReceipt];
      } else {
        return [prev[0], newReceipt, ...prev.slice(1)];
      }
    });
    // Update dayTotal locally
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount));
    // Set the main position to index 1 (if there was already at least one receipt),
    // so that the new receipt occupies the center.
    setMainIndex((prev) => (receipts.length === 0 ? 0 : 1));
    closeModal();
  }

  // ---------- Carousel Logic ----------
  // We lock positions: visible window is fixed at three columns:
  // Main card (center) is at mainIndex.
  // The left card is receipts[mainIndex - 1] if exists.
  // The right card is receipts[mainIndex + 1] if exists.
  const leftReceipt = mainIndex > 0 ? receipts[mainIndex - 1] : null;
  const mainReceipt = receipts[mainIndex] || null;
  const rightReceipt = mainIndex + 1 < receipts.length ? receipts[mainIndex + 1] : null;

  const leftArrowEnabled = mainIndex > 1; // if there's at least one receipt before the main
  const rightArrowEnabled = mainIndex + 1 < receipts.length;

  function scrollRight() {
    if (leftArrowEnabled) setMainIndex(mainIndex - 1);
  }
  function scrollLeft() {
    if (rightArrowEnabled) setMainIndex(mainIndex + 1);
  }

  // ---------- Back Button ----------
  function goBack() {
    router.push("/calendar");
  }

  // ---------- Render Conditions ----------
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // Header Date: exactly as in CalendarPage
  const dateObj = new Date();
  const dayVal = parseInt(day, 10);
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const headerMonth = monthNames[dateObj.getMonth()];
  const headerYear = dateObj.getFullYear();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.dayTitle}>
            {dayVal} {headerMonth}, {headerYear}
          </h2>
          <button onClick={goBack} style={styles.backButton}>
            ← Back
          </button>
        </div>
        <div style={styles.dayTotal}>
          Spent: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {receipts.length === 0 ? (
        <div style={styles.noReceiptsContainer}>
          <div style={styles.plusContainer} onClick={openModal}>
            <div style={styles.plusCircle}>+</div>
          </div>
          <h1 style={styles.noReceipts}>No receipts</h1>
        </div>
      ) : (
        <div style={styles.carouselContainer}>
          {/* Plus button */}
          <div style={styles.plusContainer} onClick={openModal}>
            <div style={styles.plusCircle}>+</div>
          </div>

          {/* Locked 3-column layout */}
          <div style={styles.fixedCarousel}>
            {leftReceipt && (
              <div style={styles.leftCard}>
                <ReceiptCard
                  receipt={leftReceipt}
                  label={`#${mainIndex}`}
                />
              </div>
            )}
            {mainReceipt && (
              <div style={styles.centerCard}>
                <ReceiptCard
                  receipt={mainReceipt}
                  label={`#${mainIndex + 1}`}
                  isMain
                />
              </div>
            )}
            {rightReceipt && (
              <div style={styles.rightCard}>
                <ReceiptCard
                  receipt={rightReceipt}
                  label={`#${mainIndex + 2}`}
                />
              </div>
            )}
          </div>

          {/* Arrows at bottom center */}
          <div style={styles.arrowsContainer}>
            <div
              style={{
                ...styles.arrow,
                opacity: leftArrowEnabled ? 1 : 0.3,
                cursor: leftArrowEnabled ? "pointer" : "default",
              }}
              onClick={scrollRight}
            >
              ‹
            </div>
            <div
              style={{
                ...styles.arrow,
                opacity: rightArrowEnabled ? 1 : 0.3,
                cursor: rightArrowEnabled ? "pointer" : "default",
              }}
              onClick={scrollLeft}
            >
              ›
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add New Receipt</h3>
            <div style={styles.modalGroup}>
              <label style={styles.modalLabel}>Shop Name:</label>
              <input
                type="text"
                value={modalShop}
                onChange={(e) => setModalShop(e.target.value)}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalGroup}>
              <label style={styles.modalLabel}>Amount:</label>
              <input
                type="number"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalGroup}>
              <label style={styles.modalLabel}>Description:</label>
              <textarea
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                style={styles.modalTextarea}
              />
            </div>
            <div style={styles.modalActions}>
              <button onClick={handleModalSave} style={styles.modalButton}>
                Save
              </button>
              <button onClick={closeModal} style={styles.modalButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptCard({ receipt, label, isMain }) {
  return (
    <div style={isMain ? styles.mainCard : styles.sideCard}>
      <h3 style={styles.cardTitle}>{label}</h3>
      <p style={{ marginBottom: "0.75rem" }}>
        <strong>Shop:</strong> {receipt.shop_name}
      </p>
      <p style={{ marginBottom: "0.75rem" }}>
        <strong>Amount:</strong> {receipt.amount}
      </p>
      <p style={{ marginBottom: "0.75rem" }}>
        <strong>Description:</strong> {receipt.description}
      </p>
    </div>
  );
}

//
// Inline Styles
//
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#091540",
    color: "#fff",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  loading: {
    minHeight: "100vh",
    backgroundColor: "#091540",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Poppins', sans-serif",
  },
  header: {
    // EXACT same style as CalendarPage
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  dayTitle: {
    margin: 0,
    fontSize: "4rem",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: "0.5rem",
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  dayTotal: {
    fontSize: "1.2rem",
    textAlign: "right",
  },

  // No receipts
  noReceiptsContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  noReceipts: {
    fontSize: "2rem",
    fontWeight: "bold",
  },

  // Carousel container
  carouselContainer: {
    flex: 1,
    position: "relative",
  },

  // Plus button: moved further right
  plusContainer: {
    position: "absolute",
    left: "12rem",
    top: "40%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    zIndex: 10,
  },
  plusCircle: {
    width: "90px",
    height: "90px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "3.5rem",
    fontWeight: "bold",
  },

  // Locked 3-column carousel layout:
  // Main receipt in the center (bigger), second and third to its right
  mainReceipt: {
    position: "absolute",
    left: "50%",
    top: "40%",
    transform: "translate(-50%, -50%)",
    zIndex: 5,
  },
  secondReceipt: {
    position: "absolute",
    left: "calc(50% + 300px)",
    top: "40%",
    transform: "translateY(-50%)",
    zIndex: 4,
  },
  thirdReceipt: {
    position: "absolute",
    left: "calc(50% + 600px)",
    top: "40%",
    transform: "translateY(-50%)",
    zIndex: 3,
  },

  // Alternatively, a fixed carousel container with locked positions:
  fixedCarousel: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  // Arrows near bottom center
  arrowsContainer: {
    position: "absolute",
    bottom: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "1rem",
    zIndex: 10,
  },
  arrow: {
    fontSize: "7rem",
    fontWeight: "bold",
    userSelect: "none",
  },

  // Receipt cards
  mainCard: {
    width: "300px",
    minHeight: "360px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "8px",
    padding: "1rem",
    boxSizing: "border-box",
    transform: "scale(1.2)",
  },
  sideCard: {
    width: "220px",
    minHeight: "280px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "8px",
    padding: "1rem",
    boxSizing: "border-box",
    opacity: 0.9,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "0.75rem",
    fontSize: "1.2rem",
  },

  // Modal styles
  modalOverlay: {
    zIndex: 9999,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    zIndex: 10000,
    backgroundColor: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(6px)",
    border: "1px solid #fff",
    borderRadius: "4px",
    padding: "1rem",
    width: "90%",
    maxWidth: "400px",
    color: "#fff",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "1rem",
    fontSize: "1.2rem",
  },
  modalGroup: {
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
  },
  modalLabel: {
    fontSize: "1rem",
    fontWeight: "500",
    marginBottom: "0.3rem",
  },
  modalInput: {
    padding: "0.5rem",
    fontSize: "1rem",
    backgroundColor: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    borderRadius: "4px",
  },
  modalTextarea: {
    padding: "0.5rem",
    fontSize: "1rem",
    backgroundColor: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    borderRadius: "4px",
    resize: "vertical",
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: "1rem",
  },
  modalButton: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#091540",
    border: "none",
    borderRadius: "4px",
  },
};
