import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";

// Helper to format currency
function formatCurrency(value) {
  return value.toFixed(2);
}

export default function DayPage() {
  const router = useRouter();
  const { day } = router.query;

  // Auth
  const [user, setUser] = useState(null);

  // Receipts array (in ascending order), currentIndex is the "main" (center) receipt
  const [receipts, setReceipts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // For the day’s total
  const [dayTotal, setDayTotal] = useState(0);

  // Modal state for adding a new receipt
  const [showModal, setShowModal] = useState(false);
  const [modalShop, setModalShop] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // Check user on mount
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

  // Fetch receipts in ascending order
  async function fetchReceiptsForDay() {
    if (!user || !day) return;

    // Build date string for Supabase
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
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

    // Calculate day total
    let total = 0;
    data.forEach((r) => {
      total += parseFloat(r.amount) || 0;
    });
    setDayTotal(total);

    setReceipts(data);
    setCurrentIndex(0); // The first receipt (index 0) is main if it exists
  }

  // Load receipts once user + day are ready
  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // ================== MODAL LOGIC ==================
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
    // Simple validation
    if (!modalShop || !modalAmount) return;

    // Insert new receipt
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

    // Add new receipt to the END of the array (the right side)
    const newReceipt = data[0];
    setReceipts((prev) => [...prev, newReceipt]);

    // Update total
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount || 0));

    // Keep the currentIndex the same so the first receipt remains main
    // If this is the first receipt, currentIndex=0 is correct anyway.

    closeModal();
  }

  // ================== SCROLLING ==================
  // Left arrow => move main receipt to i-1 (older to the left)
  function scrollLeft() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }
  // Right arrow => move main receipt to i+1 (newer to the right)
  function scrollRight() {
    if (currentIndex < receipts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  // If user or day not loaded
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // Determine arrow states
  const leftArrowDisabled = currentIndex === 0;
  const rightArrowDisabled = currentIndex === receipts.length - 1;

  // If no receipts, show "No receipts"
  const noReceipts = receipts.length === 0;

  // Day label for top-left
  const dateObj = new Date();
  const dayVal = parseInt(day, 10);
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const monthName = monthNames[dateObj.getMonth()];
  const yearVal = dateObj.getFullYear();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h2 style={styles.dayTitle}>
          {dayVal} {monthName} {yearVal}
        </h2>
        <div style={styles.dayTotal}>
          total today: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {/* Main Area */}
      <div style={styles.main}>
        {/* Plus button on the left */}
        <div style={styles.plusContainer} onClick={openModal}>
          <div style={styles.plusCircle}>+</div>
        </div>

        {noReceipts ? (
          // Show "No receipts" if empty
          <div style={styles.noReceipts}>No receipts</div>
        ) : (
          // Carousel with left arrow, main card, right arrow
          <div style={styles.carousel}>
            {/* Left arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: leftArrowDisabled ? 0.3 : 1,
                cursor: leftArrowDisabled ? "default" : "pointer",
              }}
              onClick={() => {
                if (!leftArrowDisabled) scrollLeft();
              }}
            >
              &lt;
            </div>

            {/* Main card: receipts[currentIndex] */}
            <ReceiptCard receipt={receipts[currentIndex]} />

            {/* Right arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: rightArrowDisabled ? 0.3 : 1,
                cursor: rightArrowDisabled ? "default" : "pointer",
              }}
              onClick={() => {
                if (!rightArrowDisabled) scrollRight();
              }}
            >
              &gt;
            </div>
          </div>
        )}
      </div>

      {/* Minimal Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Add New Receipt</h3>
            <div style={styles.modalGroup}>
              <label>Shop Name:</label>
              <input
                type="text"
                value={modalShop}
                onChange={(e) => setModalShop(e.target.value)}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalGroup}>
              <label>Amount:</label>
              <input
                type="number"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                style={styles.modalInput}
              />
            </div>
            <div style={styles.modalGroup}>
              <label>Description:</label>
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

/** Single receipt card (read-only) **/
function ReceiptCard({ receipt }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Receipt</h3>
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
    padding: "1rem",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  dayTitle: {
    margin: 0,
    fontSize: "4rem",
    fontWeight: "bold",
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
  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    color: "#091540",
    padding: "1.5rem",
    borderRadius: "8px",
    minWidth: "300px",
  },
  modalGroup: {
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
  },
  modalInput: {
    padding: "0.5rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  modalTextarea: {
    padding: "0.5rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
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
  },
};
