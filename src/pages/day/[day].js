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

  // Auth
  const [user, setUser] = useState(null);

  // Carousel
  const [receipts, setReceipts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // For calculating total spent on this day
  const [dayTotal, setDayTotal] = useState(0);

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

  // Fetch receipts for this day, sorted by created_at descending
  async function fetchReceiptsForDay() {
    if (!user || !day) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-based => +1
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

    // Calculate total
    let total = 0;
    data.forEach((r) => {
      total += parseFloat(r.amount) || 0;
    });
    setDayTotal(total);

    setReceipts(data);
    setCurrentIndex(0); // Show newest (index 0) in the center
  }

  // Initial + refresh after day changes
  useEffect(() => {
    fetchReceiptsForDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, day]); // once user and day are known

  // ========== ADD A NEW TEMP RECEIPT ==========
  function handleAddNewReceipt() {
    // Prepend a temp receipt with blank data
    const tempReceipt = {
      id: "temp", // a special ID
      shop_name: "",
      amount: "",
      description: "",
      isNew: true, // flag to show it's editable
    };

    // Put it at index 0, shift existing receipts to the right
    setReceipts((prev) => [tempReceipt, ...prev]);
    setCurrentIndex(0); // make the new one the center
  }

  // ========== SAVE A TEMP RECEIPT ==========
  async function handleSaveTempReceipt(index, shopName, amount, description) {
    // Insert into Supabase
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { data, error } = await supabase.from("receipts").insert([
      {
        user_id: user.id,
        shop_name: shopName,
        amount: amount ? parseFloat(amount) : 0,
        description,
        date: dateStr,
      },
    ]);

    if (error) {
      console.error("Error adding receipt:", error);
      return;
    }

    // data[0] is the newly inserted row
    const newReceipt = data[0];

    // Replace the temp receipt with the real one
    setReceipts((prev) => {
      const newArray = [...prev];
      newArray[index] = newReceipt;
      return newArray;
    });

    // Re-calc total
    setDayTotal((prev) => prev + parseFloat(newReceipt.amount || 0));
  }

  // ========== SCROLLING ==========
  function scrollLeft() {
    if (currentIndex < receipts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }
  function scrollRight() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  // If not loaded
  if (!user) return <div style={styles.loading}>Loading...</div>;
  if (!day) return <div style={styles.loading}>No day specified.</div>;

  // ========== DETERMINE WHICH 3 RECEIPTS TO SHOW (left, center, right) ==========
  const center = currentIndex;
  const left = currentIndex + 1 <= receipts.length - 1 ? currentIndex + 1 : null;
  const right = currentIndex - 1 >= 0 ? currentIndex - 1 : null;

  // left arrow disabled if right===null
  const leftArrowDisabled = right === null;
  // right arrow disabled if left===null
  const rightArrowDisabled = left === null;

  // Day/Month/Year Label
  const dateObj = new Date();
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const monthName = monthNames[dateObj.getMonth()];
  const yearVal = dateObj.getFullYear();
  const dayVal = parseInt(day, 10);

  return (
    <div style={styles.container}>
      {/* Top bar: "DD Month YYYY" on left, total on right */}
      <header style={styles.header}>
        <h2 style={styles.dayTitle}>
          {dayVal} {monthName} {yearVal}
        </h2>
        <div style={styles.dayTotal}>
          total today: <strong>${formatCurrency(dayTotal)}</strong>
        </div>
      </header>

      {/* Main area: plus sign on left, arrows, 3 receipts in the middle */}
      <div style={styles.main}>
        {/* Big plus sign to add new receipt */}
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

        {/* 3 Cards: left, center, right */}
        <div style={styles.cardsContainer}>
          {/* Left card */}
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
          {/* Right card */}
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

/** A single receipt card
    If `receipt.isNew` is true or `receipt.id === "temp"`, we show an editable form. */
function ReceiptCard({ receipt, index, isCenter, onSave }) {
  const [shopName, setShopName] = useState(receipt.shop_name || "");
  const [amount, setAmount] = useState(receipt.amount || "");
  const [description, setDescription] = useState(receipt.description || "");

  const isTemp = receipt.id === "temp";

  function handleSave() {
    // call parent to insert into DB
    onSave(index, shopName, amount, description);
  }

  if (isTemp) {
    // Editable form for the new (temp) receipt
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

  // Otherwise, it's an existing receipt (read-only)
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
    fontSize: "2rem",
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
    // style for left/right cards if you want them smaller or dimmer
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
