import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [days, setDays] = useState([]);

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

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tempDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      tempDays.push(d);
    }
    setDays(tempDays);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Calendar</h1>
      <button onClick={handleLogout} style={{ margin: "10px" }}>
        Logout
      </button>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        {days.map((day) => (
          <Link
            key={day}
            href={`/day/${day}`}
            style={{
              margin: "5px",
              padding: "10px",
              border: "1px solid #ccc",
              textDecoration: "none",
            }}
          >
            {day}
          </Link>
        ))}
      </div>
    </div>
  );
}
