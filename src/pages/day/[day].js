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
  const [receipts, setReceipts] = useState([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [dayTotal, setDayTotal] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalShop, setModalShop] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // Check user
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

  // Fetch receipts for this day (ascending = oldest first)
  async function fetchReceiptsForDay() {
    if (!user || !day) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
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
    setMainIndex(0); // show the first receipt as main
  }

  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // Modal logic
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
      console.error(error);
      return;
    }
    await fetchReceiptsForDay();
    closeModal();
  }

  // The three columns: main, second, third
  const mainReceipt = receipts[mainIndex] || null;
  const secondReceipt = mainIndex + 1 < receipts.length ? receipts[mainIndex + 1] : null;
  const thirdReceipt = mainIndex + 2 < receipts.length ? receipts[mainIndex + 2] : null;

  // Arrows
  const canScrollLeft = mainIndex > 0;
  const canScrollRight = mainIndex + 1 < receipts.length;

  function scrollLeft() {
    if (canScrollLeft) setMainIndex(mainIndex - 1);
  }
  function scrollRight() {
    if (canScrollRight) setMainIndex(mainIndex + 1);
  }

  // Go back
  function goBack() {
    router.push("/calendar");
  }

  // If user or day not loaded
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // Date styling to match CalendarPage
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
      {/* Header EXACT style as CalendarPage */}
      <header style={styles.header}>
        {/* Left: Day, Month, Year in 4rem bold */}
        <div>
          <h2 style={styles.dayTitle}>
            {dayVal} {headerMonth}, {headerYear}
          </h2>
          <button onClick={goBack} style={styles.backButton}>
            ← Back
          </button>
        </div>

        {/* Right: Spent total */}
        <div style={styles.dayTotal}>
          Spent: <strong>${dayTotal.toFixed(2)}</strong>
        </div>
      </header>

      {/* If no receipts */}
      {receipts.length === 0 ? (
        <div style={styles.noReceiptsContainer}>
          <div style={styles.plusContainer} onClick={openModal}>
            <div style={styles.plusCircle}>+</div>
          </div>
          <h1 style={styles.noReceipts}>No receipts</h1>
        </div>
      ) : (
        // The locked 3-column layout
        <div style={styles.carouselContainer}>
          {/* Big plus button on the left, more to the right */}
          <div style={styles.plusContainer} onClick={openModal}>
            <div style={styles.plusCircle}>+</div>
          </div>

          {/* Main receipt (center, bigger) */}
          {mainReceipt && (
            <div style={styles.mainReceipt}>
              <ReceiptCard
                receipt={mainReceipt}
                label={`#${mainIndex + 1}`}
                isMain
              />
            </div>
          )}

          {/* Second receipt (same height) but to the right */}
          {secondReceipt && (
            <div style={styles.secondReceipt}>
              <ReceiptCard
                receipt={secondReceipt}
                label={`#${mainIndex + 2}`}
              />
            </div>
          )}

          {/* Third receipt further right */}
          {thirdReceipt && (
            <div style={styles.thirdReceipt}>
              <ReceiptCard
                receipt={thirdReceipt}
                label={`#${mainIndex + 3}`}
              />
            </div>
          )}

          {/* Arrows near bottom center, bigger & closer */}
          <div style={styles.arrowsContainer}>
            <div
              style={{
                ...styles.arrow,
                opacity: canScrollLeft ? 1 : 0.3,
                cursor: canScrollLeft ? "pointer" : "default",
              }}
              onClick={scrollLeft}
            >
              ‹
            </div>
            <div
              style={{
                ...styles.arrow,
                opacity: canScrollRight ? 1 : 0.3,
                cursor: canScrollRight ? "pointer" : "default",
              }}
              onClick={scrollRight}
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

/** Single receipt card */
function ReceiptCard({ receipt, label, isMain }) {
  return (
    <div style={isMain ? styles.mainCard : styles.sideCard}>
      <h3 style={styles.cardTitle}>{label}</h3>
      <p><strong>Shop:</strong> {receipt.shop_name}</p>
      <p><strong>Amount:</strong> {receipt.amount}</p>
      <p><strong>Description:</strong> {receipt.description}</p>
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
  },
  header: {
    // EXACT same style as your calendar page
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

  // If no receipts
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

  // Carousel
  carouselContainer: {
    flex: 1,
    position: "relative",
  },

  // Larger plus button, further to the right
  plusContainer: {
    position: "absolute",
    left: "9rem", // SHIFTED MORE RIGHT
    top: "45%",   // SHIFT receipts further up
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

  // Main receipt in center, bigger
  mainReceipt: {
    position: "absolute",
    left: "50%",
    top: "45%",   // SHIFT receipts further up
    transform: "translate(-50%, -50%)",
    zIndex: 5,
  },
  // second at same height
  secondReceipt: {
    position: "absolute",
    left: "calc(50% + 300px)", // SHIFT to avoid overlap
    top: "45%",
    transform: "translateY(-50%)",
    zIndex: 4,
  },
  // third further right
  thirdReceipt: {
    position: "absolute",
    left: "calc(50% + 600px)",
    top: "45%",
    transform: "translateY(-50%)",
    zIndex: 3,
  },

  // Arrows near bottom center, bigger & closer
  arrowsContainer: {
    position: "absolute",
    bottom: "1rem", // SHIFT lower
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "1rem",
    zIndex: 10,
  },
  arrow: {
    fontSize: "6rem", // bigger
    fontWeight: "bold",
    userSelect: "none",
  },

  // Main card bigger
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
  // Side cards smaller, same vertical alignment
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
    marginBottom: "0.5rem",
    fontSize: "1.2rem",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(9,21,64,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "transparent",
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
  },
  modalInput: {
    padding: "0.5rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
    backgroundColor: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    borderRadius: "4px",
  },
  modalTextarea: {
    padding: "0.5rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
    resize: "vertical",
    backgroundColor: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    borderRadius: "4px",
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
