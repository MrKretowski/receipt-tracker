import { useRouter } from "next/router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function DayPage() {
  const router = useRouter();
  const { day } = router.query;
  const [user, setUser] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [shopName, setShopName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

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

  const fetchReceipts = useCallback(async () => {
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching receipts:", error);
    } else {
      setReceipts(data);
    }
  }, [user, day]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const addReceipt = async (e) => {
    e.preventDefault();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const { error } = await supabase.from("receipts").insert([
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
    } else {
      setShopName("");
      setAmount("");
      setDescription("");
      fetchReceipts();
    }
  };

  if (!user) return <p>Loading...</p>;
  if (!day) return <p>No day specified.</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h1>Receipts for Day {day}</h1>

      <div style={{ margin: "20px 0" }}>
        {receipts.map((receipt) => (
          <div key={receipt.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "8px" }}>
            <p><strong>Shop:</strong> {receipt.shop_name}</p>
            <p><strong>Amount:</strong> {receipt.amount}</p>
            <p><strong>Description:</strong> {receipt.description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={addReceipt} style={{ display: "flex", flexDirection: "column" }}>
        <h2>Add a Receipt</h2>
        <input
          type="text"
          placeholder="Shop Name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
          required
        />
        <input
          type="number"
          placeholder="Amount"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
        />
        <button type="submit" style={{ padding: "8px" }}>Add Receipt</button>
      </form>
    </div>
  );
}
