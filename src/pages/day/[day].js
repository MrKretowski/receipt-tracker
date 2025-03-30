import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

// A helper to format currency
function formatCurrency(value) {
  return value.toFixed(2);
}

export default function DayPage() {
  const router = useRouter();
  const { day } = router.query;

  // Auth state
  const [user, setUser] = useState(null);

  // Receipt carousel: receipts array and current index (which receipt is centered)
  const [receipts, setReceipts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Day total
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

  // Fetch receipts for the day (order ascending so new ones are appended)
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
      .order("created_at", { ascending: true }); // oldest first

    if (error) {
      console.error("Error fetching receipts:", error);
      return;
    }

    // Calculate total for the day
    let total = 0;
    data.forEach((r) => {
      total += parseFloat(r.amount) || 0;
    });
    setDayTotal(total);

    setReceipts(data);
    // If there is at least one receipt, show the first one centered.
    if (data.length > 0) {
      setCurrentIndex(0);
    }
  }

  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // ========== Modal Logic for Adding New Receipt ==========
  function openModal() {
    // Clear fields and open modal
    setModalShop("");
    setModalAmount("");
    setModalDescription("");
    setShowModal(true);
  }
  async function handleModalSave() {
    if (!modalShop || !modalAmount) return; // simple validation
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Insert the new receipt into Supabase
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

    // Append the new receipt locally
    const newReceipt = data[0];
    setReceipts((prev) => [...prev, newReceipt]);
    // Optionally update day total
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount || 0));

    setShowModal(false);
    // If only one receipt before, then no scrolling (currentIndex remains 0).
    // If more than one receipt now, leave currentIndex unchanged.
  }
  function handleModalCancel() {
    setShowModal(false);
  }

  // ========== SCROLLING FUNCTIONS ==========
  function scrollLeft() {
    // Increase index to show a receipt that is further right (older)
    if (currentIndex < receipts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }
  function scrollRight() {
    // Decrease index to show a receipt that is further left (newer)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // ---------- Render Logic ----------
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  return (
    <div style={styles.container}>
      {/* Header with Day Label and Total */}
      <header style={styles.header}>
        <h2 style={styles.dayTitle}>
          {day} {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}
        </h2>
        <div style={styles.dayTotal}>
          total today: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {/* Main Carousel Area */}
      <div style={styles.main}>
        {/* Plus button always visible on the left */}
        <div style={styles.plusContainer} onClick={openModal}>
          <div style={styles.plusCircle}>+</div>
        </div>

        {receipts.length === 0 ? (
          // When no receipts, show big "no receipts" message and no arrows
          <div style={styles.noReceipts}>No receipts</div>
        ) : (
          <div style={styles.carouselContainer}>
            {/* Left arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: currentIndex === 0 ? 0.3 : 1,
                cursor: currentIndex === 0 ? "default" : "pointer",
              }}
              onClick={scrollRight}
            >
              &lt;
            </div>

            {/* Center receipt */}
            <ReceiptCard receipt={receipts[currentIndex]} />

            {/* Right arrow */}
            <div
              style={{
                ...styles.arrow,
                opacity: currentIndex === receipts.length - 1 ? 0.3 : 1,
                cursor: currentIndex === receipts.length - 1 ? "default" : "pointer",
              }}
              onClick={scrollLeft}
            >
              &gt;
            </div>
          </div>
        )}
      </div>

      {/* Modal for Adding New Receipt */}
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
              <button onClick={handleModalCancel} style={styles.modalButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A simple receipt card (read-only) **/
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
  carouselContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  noReceipts: {
    fontSize: "2rem",
    fontWeight: "bold",
  },
  // Modal styles
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

