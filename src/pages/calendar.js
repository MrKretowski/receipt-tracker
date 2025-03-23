import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [calendarCells, setCalendarCells] = useState([]); // array of 42 cells (some empty, some day numbers)
  const [dailyCounts, setDailyCounts] = useState({}); // { dayNumber: receiptCount }
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [hoverLogout, setHoverLogout] = useState(false);

  // For labeling the month/year
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const monthName = monthNames[monthIndex];

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

  // 2) Build the calendar cells (42 total for 6 weeks)
  useEffect(() => {
    const buildCalendar = () => {
      // We'll do Sunday-based. getDay() returns 0 for Sunday, 6 for Saturday.
      const firstOfMonth = new Date(year, monthIndex, 1);
      const startDay = firstOfMonth.getDay(); // 0..6
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

      // We'll fill up to 42 cells: offset + days + trailing empties
      const cells = [];
      // push empty cells for offset
      for (let i = 0; i < startDay; i++) {
        cells.push(null); // null means no day
      }
      // push actual days
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
      }
      // fill the remaining cells up to 42
      while (cells.length < 42) {
        cells.push(null);
      }
      setCalendarCells(cells);
    };
    buildCalendar();
  }, [monthIndex, year]);

  // 3) Fetch receipts for the current month to get daily counts & monthly total
  useEffect(() => {
    if (!user) return;

    const fetchMonthData = async () => {
      // Construct date range for the current month
      const firstDay = new Date(year, monthIndex, 1).toISOString().split("T")[0];
      const lastDay = new Date(year, monthIndex + 1, 0).toISOString().split("T")[0];

      // Fetch receipts in that date range
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

      // Calculate daily counts and monthly total
      const dayCounts = {};
      let total = 0;

      data.forEach((receipt) => {
        const dateObj = new Date(receipt.date);
        const dayNum = dateObj.getDate(); // 1..31
        if (!dayCounts[dayNum]) {
          dayCounts[dayNum] = 0;
        }
        dayCounts[dayNum] += 1; // increment receipt count
        total += parseFloat(receipt.amount) || 0;
      });

      setDailyCounts(dayCounts);
      setMonthlyTotal(total);
    };

    fetchMonthData();
  }, [user, monthIndex, year]);

  // 4) Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // If no user loaded yet
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#091540",
          color: "#fff",
          fontFamily: "'Poppins', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#091540", // Penn Blue
        color: "#fff",
        fontFamily: "'Poppins', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: Month/Year on left, user info & logout on right */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>
          {monthName} {year}
        </h2>

        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Signed in as <strong>{user.email}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
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
              padding: "0.4rem 0.8rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Calendar Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridAutoRows: "80px",
          gap: "1px",
          padding: "1rem",
        }}
      >
        {calendarCells.map((cell, index) => {
          // If cell is null, it's an empty slot
          if (!cell) {
            return <div key={index} style={{ border: "1px solid transparent" }} />;
          }

          // If there's a receipt count for this day
          const count = dailyCounts[cell] || 0;

          return (
            <div
              key={index}
              onClick={() => router.push(`/day/${cell}`)} // clickable cell
              style={{
                border: "1px solid #fff",
                padding: "0.5rem",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Day number */}
              <span style={{ fontSize: "1rem" }}>{cell}</span>

              {/* Circle with count if there's any receipt */}
              {count > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    backgroundColor: "#ABD2FA", // Uranian Blue
                    color: "#091540",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
