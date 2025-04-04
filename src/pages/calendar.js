import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [calendarCells, setCalendarCells] = useState([]);
  const [dailyCounts, setDailyCounts] = useState({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [hoverLogout, setHoverLogout] = useState(false);

  // Use state to store the current month and year
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const monthName = monthNames[currentMonth];

  // Handlers for month navigation
  function handlePrevMonth() {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function handleNextMonth() {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  // 1) Check if user is logged in
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

  // 2) Build the calendar cells (42 total for 6 rows)
  useEffect(() => {
    const buildCalendar = () => {
      const firstOfMonth = new Date(currentYear, currentMonth, 1);
      const startDay = firstOfMonth.getDay(); // 0=Sunday ... 6=Saturday
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const cells = [];
      // Empty cells before day 1
      for (let i = 0; i < startDay; i++) {
        cells.push(null);
      }
      // Actual day numbers
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
      }
      // Fill the remaining cells (if any)
      while (cells.length < 42) {
        cells.push(null);
      }
      setCalendarCells(cells);
    };
    buildCalendar();
  }, [currentMonth, currentYear]);

  // 3) Fetch receipts for the current month -> daily counts & monthly total
  useEffect(() => {
    if (!user) return;

    const fetchMonthData = async () => {
      const firstDay = new Date(currentYear, currentMonth, 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase
        .from("receipts")
        .select("date, amount")
        .eq("user_id", user.id)
        .gte("date", firstDay)
        .lte("date", lastDay);

      if (error) {
        console.error("Error fetching receipts:", error);
        return;
      }

      const dayCounts = {};
      let total = 0;
      data.forEach((receipt) => {
        const dateObj = new Date(receipt.date);
        const dayNum = dateObj.getDate();
        dayCounts[dayNum] = (dayCounts[dayNum] || 0) + 1;
        total += parseFloat(receipt.amount) || 0;
      });

      setDailyCounts(dayCounts);
      setMonthlyTotal(total);
    };

    fetchMonthData();
  }, [user, currentMonth, currentYear]);

  // 4) Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (!user) {
    return (
      <div style={styles.loading}>
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        {/* Month Navigation (Arrows and Date) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={styles.monthArrow} onClick={handlePrevMonth}>
            ‹
          </div>
          <h2 style={{ margin: "0 1rem", fontSize: "4rem", fontWeight: "bold" }}>
            {monthName}, {currentYear}
          </h2>
          <div style={styles.monthArrow} onClick={handleNextMonth}>
            ›
          </div>
        </div>

        {/* User Info & Logout */}
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "1.2rem" }}>
            Signed in as <br />
            <strong>{user.email}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem" }}>
            Spent: <strong>${monthlyTotal.toFixed(2)}</strong>
          </p>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoverLogout(true)}
            onMouseLeave={() => setHoverLogout(false)}
            style={{
              marginTop: "0.5rem",
              backgroundColor: hoverLogout ? "#ABD2FA" : "#fff",
              color: "#091540",
              border: "none",
              borderRadius: "4px",
              padding: "0.6rem 1.2rem",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "1rem",
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Centered Calendar Grid */}
      <div style={styles.calendarGridContainer}>
        <div style={styles.calendarGrid}>
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={index}
                  style={{ border: "1px solid transparent" }}
                />
              );
            }
            const count = dailyCounts[cell] || 0;
            return (
              <div
                key={index}
                onClick={() => router.push(`/day/${cell}`)}
                style={styles.calendarCell}
              >
                <span style={{ fontSize: "1rem" }}>{cell}</span>
                {count > 0 && (
                  <div style={styles.countBadge}>
                    {count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
  },
  monthArrow: {
    fontSize: "2rem",
    fontWeight: "bold",
    cursor: "pointer",
    userSelect: "none",
  },
  calendarGridContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    marginTop: "2rem",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gridAutoRows: "80px",
    gap: "1px",
    width: "100%",
    maxWidth: "700px",
    padding: "1rem",
  },
  calendarCell: {
    border: "1px solid #fff",
    padding: "0.5rem",
    cursor: "pointer",
    position: "relative",
  },
  countBadge: {
    position: "absolute",
    top: "5px",
    right: "5px",
    backgroundColor: "#ABD2FA",
    color: "#091540",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: "bold",
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
};
