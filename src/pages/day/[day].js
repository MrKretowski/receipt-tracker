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

  // Auth state
  const [user, setUser] = useState(null);
  // Receipts array in ascending order (oldest first)
  const [receipts, setReceipts] = useState([]);
  // windowStart indicates the index of the "main" (leftmost) receipt in the visible window.
  const [windowStart, setWindowStart] = useState(0);
  // Total spent for the day
  const [dayTotal, setDayTotal] = useState(0);

  // Modal state for adding new receipt
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

  // Fetch receipts for the given day
  async function fetchReceiptsForDay() {
    if (!user || !day) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // adjusting for 0-based month
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .order("created_at", { ascending: true }); // oldest first

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
    setWindowStart(0); // reset window on refresh
  }

  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // ----- Modal Logic -----
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
    setReceipts((prev) => [...prev, newReceipt]); // Append new receipt
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount || 0));
    closeModal();
    // Do not change windowStart; the main receipt remains the same.
  }

  // ----- Carousel Scrolling Logic -----
  const visibleCount = 3; // number of receipts visible if available
  const visibleReceipts = receipts.slice(windowStart, windowStart + visibleCount);

  const canScrollRight = windowStart > 0;
  const canScrollLeft = windowStart < receipts.length - 1;

  function scrollRight() {
    if (canScrollRight) {
      setWindowStart(windowStart - 1);
    }
  }
  function scrollLeft() {
    if (canScrollLeft) {
      setWindowStart(windowStart + 1);
    }
  }

  // ----- Go Back Button -----
  function goBack() {
    router.push("/calendar");
  }

  // Render conditions
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // Header Date: use same style as on the calendar page
  const dateObj = new Date();
  const dayVal = parseInt(day, 10);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const headerMonth = monthNames[dateObj.getMonth()];
  const headerYear = dateObj.getFullYear();

  return (
    <div style={styles.container}>
      {/* Header with date, go back arrow, and total */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.dayTitle}>
            {dayVal} {headerMonth} {headerYear}
          </h2>
          <button onClick={goBack} style={styles.goBackButton}>
            ← Back
          </button>
        </div>
        <div style={styles.dayTotal}>
          total today: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {/* Main Carousel Area */}
      <div style={styles.main}>
        {/* Plus button on left */}
        <div style={styles.plusContainer} onClick={openModal}>
          <div style={styles.plusCircle}>+</div>
        </div>

        {receipts.length === 0 ? (
          <div style={styles.noReceipts}>No receipts</div>
        ) : (
          <div style={styles.carousel}>
            {/* Left arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: canScrollRight ? 1 : 0.3,
                cursor: canScrollRight ? "pointer" : "default",
              }}
              onClick={scrollRight}
            >
              &lt;
            </div>

            {/* Visible receipts */}
            <div style={styles.cardsContainer}>
              {visibleReceipts.map((receipt, i) => (
                <ReceiptCard key={windowStart + i} receipt={receipt} />
              ))}
            </div>

            {/* Right arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: canScrollLeft ? 1 : 0.3,
                cursor: canScrollLeft ? "pointer" : "default",
              }}
              onClick={scrollLeft}
            >
              &gt;
            </div>
          </div>
        )}
      </div>

      {/* Minimal Modal (pop-up) */}
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

function ReceiptCard({ receipt }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Receipt</h3>
      <p>
        <strong>Shop:</strong> {receipt.shop_name}
      </p>
      <p>
        <strong>Amount:</strong> {receipt.amount}
      </p>
      <p>
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
    padding: "1rem",
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  dayTitle: {
    margin: 0,
    fontSize: "4rem",
    fontWeight: "bold",
  },
  goBackButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  dayTotal: {
    fontSize: "1.2rem",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  plusContainer: {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
  },
  plusCircle: {
    width: "50px",
    height: "50px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    fontWeight: "bold",
  },
  noReceipts: {
    fontSize: "2rem",
    fontWeight: "bold",
  },
  carousel: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  arrow: {
    fontSize: "2rem",
    fontWeight: "bold",
    userSelect: "none",
  },
  cardsContainer: {
    display: "flex",
    gap: "1rem",
  },
  card: {
    width: "220px",
    minHeight: "250px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "8px",
    padding: "1rem",
    boxSizing: "border-box",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "0.5rem",
    fontSize: "1.1rem",
  },
  // Modal styles (minimalistic, no white card)
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

