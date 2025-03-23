import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/calendar");
      }
    };
    checkUser();
  }, [router]);

  const handleSignup = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
      return;
    }

    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert([
        { email: data.user.email, name },
      ]);
      if (insertError) {
        alert(insertError.message);
        return;
      }
    }

    
    router.push("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#091540",
        color: "#fff",
        fontFamily: "'Poppins', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
        }}
      >
        <h1 style={{ fontSize: "4rem", fontWeight: "bold", margin: 0 }}>Tracky</h1>
        <div style={{ fontSize: "1.2rem" }}>Sign Up</div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <form onSubmit={handleSignup} style={{ width: "300px", textAlign: "left" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #fff",
                padding: "0.5rem 0",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #fff",
                padding: "0.5rem 0",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #fff",
                padding: "0.5rem 0",
                color: "#fff",
                fontSize: "1rem",
                outline: "none",
              }}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              backgroundColor: "#fff",
              color: "#091540",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Sign Up
          </button>

          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            Already have an account?{" "}
            <Link
              href="/"
              style={{
                color: "#ABD2FA",
                textDecoration: "underline",
              }}
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
