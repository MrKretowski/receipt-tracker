import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

// A small helper to format currency
function formatCurrency(value) {
  return value.toFixed(2);
}

export default function DayPage() {
  const router = useRouter();
  const { day } = router.query;

  // Auth state
  const [user, setUser] = useState(null);

  // Carousel state: receipts array and current index (center card)
  const [receipts, setReceipts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Total spent on the day
  const [dayTotal, setDayTotal] = useState(0);

  // Check user authentication
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

  // Fetch receipts for this day, sorted by created_at descending (newest first)
  async function fetchReceiptsForDay() {
    if (!user || !day) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // month is zero-based so +1
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .order("created_at", { ascending: false }); // newest first

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
    setCurrentIndex(0); // Ensure newest (index 0) is centered
  }

  // Refresh receipts when user and day are available
  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]);

  // ========== ADD A NEW TEMP RECEIPT ==========
  function handleAddNewReceipt() {
    // Create a temp receipt object with blank fields
    const tempReceipt = {
      id: "temp", // special id for temporary receipt
      shop_name: "",
      amount: "",
      description: "",
      isNew: true, // flag for editable mode
    };

    // Prepend the temp receipt so it becomes the newest and center card
    setReceipts((prev) => [tempReceipt, ...prev]);
    setCurrentIndex(0);
  }

  // ========== SAVE A TEMP RECEIPT ==========
  async function handleSaveTempReceipt(index, shopName, amount, description) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase.from("receipts").insert([
      {
        user_id: user.id,
        shop_name,
        amount: amount ? parseFloat(amount) : 0,
        description,
        date: dateStr,
      },
    ]);

    if (error) {
      console.error("Error adding receipt:", error);
      return;
    }

    const newReceipt = data[0];
    // Replace the temp receipt with the new one
    setReceipts((prev) => {
      const newArray = [...prev];
      newArray[index] = newReceipt;
      return newArray;
    });

    // Recalculate total and reset currentIndex to show the new receipt in center
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount || 0));
    setCurrentIndex(0);
  }

  // ========== SCROLLING FUNCTIONS ==========
  // Here, left means scrolling to an earlier receipt (lower index) and right to a newer receipt (higher index)
  function scrollLeft() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }
  function scrollRight() {
    if (currentIndex < receipts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  // If user or day not loaded yet
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // ========== DETERMINE WHICH 3 RECEIPTS TO SHOW ==========
  // Now, center is the currentIndex,
  // left card is currentIndex - 1 (if exists),
  // right card is currentIndex + 1 (if exists).
  const center = currentIndex;
  const left = currentIndex - 1 >= 0 ? currentIndex - 1 : null;
  const right = currentIndex + 1 < receipts.length ? currentIndex + 1 : null;

  const leftArrowDisabled = currentIndex === 0;
  const rightArrowDisabled = currentIndex === receipts.length - 1;

  // Day/Month/Year Label (for header)
  const dateObj = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[dateObj.getMonth()];
  const yearVal = dateObj.getFullYear();
  const dayVal = parseInt(day, 10);

  return (
    <div style={styles.container}>
      {/* Top bar: Display Day Month Year on left, total spend on right */}
      <header style={styles.header}>
        <h2 style={styles.dayTitle}>
          {dayVal} {monthName} {yearVal}
        </h2>
        <div style={styles.dayTotal}>
          total today: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {/* Main area: Plus sign to add new receipt, carousel arrows, and 3 receipt cards */}
      <div style={styles.main}>
        {/* Plus sign (always on the left) */}
        <div style={styles.plusContainer} onClick={handleAddNewReceipt}>
          <div style={styles.plusCircle}>+</div>
        </div>

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

        {/* Cards container */}
        <div style={styles.cardsContainer}>
          {/* Left card (if exists) */}
          {left !== null && receipts[left] && (
            <ReceiptCard
              receipt={receipts[left]}
              index={left}
              isCenter={false}
              onSave={handleSaveTempReceipt}
            />
          )}
          {/* Center card */}
          {receipts[center] && (
            <ReceiptCard
              receipt={receipts[center]}
              index={center}
              isCenter
              onSave={handleSaveTempReceipt}
            />
          )}
          {/* Right card (if exists) */}
          {right !== null && receipts[right] && (
            <ReceiptCard
              receipt={receipts[right]}
              index={right}
              isCenter={false}
              onSave={handleSaveTempReceipt}
            />
          )}
        </div>

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
    </div>
  );
}

/** ReceiptCard Component **/
function ReceiptCard({ receipt, index, isCenter, onSave }) {
  const [shopName, setShopName] = useState(receipt.shop_name || "");
  const [amount, setAmount] = useState(receipt.amount || "");
  const [description, setDescription] = useState(receipt.description || "");

  const isTemp = receipt.id === "temp";

  function handleSave() {
    onSave(index, shopName, amount, description);
  }

  if (isTemp) {
    return (
      <div style={{ ...styles.card, ...(!isCenter ? styles.sideCard : {}) }}>
        <h3 style={styles.cardTitle}>New Receipt</h3>
        <div style={styles.formGroup}>
          <label>Shop Name:</label>
          <input
            type="text"
            style={styles.input}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label>Amount:</label>
          <input
            type="number"
            style={styles.input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label>Description:</label>
          <textarea
            style={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button style={styles.saveButton} onClick={handleSave}>
          Save
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.card, ...(!isCenter ? styles.sideCard : {}) }}>
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
    backgroundColor: "#091540", // Penn Blue
    color: "#fff",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
  },
  loading: {
    minHeight: "100vh",
    backgroundColor: "#091540",
    color: "#fff",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  dayTitle: {
    margin: 0,
    fontSize: "4rem", // Bold, 4rem as requested
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
  arrow: {
    fontSize: "2rem",
    fontWeight: "bold",
    margin: "0 1rem",
    userSelect: "none",
  },
  cardsContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    minWidth: "600px", // enough space for 3 cards
  },
  card: {
    width: "180px",
    minHeight: "220px",
    backgroundColor: "#fff",
    color: "#091540",
    borderRadius: "8px",
    padding: "1rem",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  sideCard: {
    opacity: 0.8,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "0.5rem",
    fontSize: "1.1rem",
  },
  formGroup: {
    marginBottom: "0.5rem",
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "0.3rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.9rem",
    marginTop: "0.2rem",
  },
  textarea: {
    padding: "0.3rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.9rem",
    marginTop: "0.2rem",
    resize: "vertical",
  },
  saveButton: {
    marginTop: "0.5rem",
    backgroundColor: "#7692FF", // Cornflower Blue
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "0.5rem",
    cursor: "pointer",
  },
};
