import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/calendar");
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      router.replace("/calendar");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#091540",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Poppins', sans-serif",
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "100%",
          padding: "2rem",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "1rem",
            color: "#091540",
          }}
        >
          Login
        </h1>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #7692FF",
              borderRadius: "4px",
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #7692FF",
              borderRadius: "4px",
            }}
            required
          />
          <button
            type="submit"
            style={{
              padding: "0.75rem",
              fontSize: "1rem",
              backgroundColor: "#7692FF",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Log In
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem" }}>
          Don’t have an account?{" "}
          <Link
            href="/signup"
            style={{
              color: "#ABD2FA",
              textDecoration: "underline",
            }}
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
