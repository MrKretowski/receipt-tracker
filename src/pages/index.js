import {useState, useEffect} from "react";
import {useRouter} from "next/router";
import {supabase} from "../../lib/supabaseClient"
import Link from 'next/link';

export default function LoginPage(){
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  useEffect(() => {
    const checkUser = async () => {
      const { data: {user} } = await supabase.auth.getUser();
      if(user) {
        router.replace("/calendar");
      }
    };
    checkUser();
  }, [router]);


  const handleLogin = async (e) => {
    e.preventDefault();
    const {error} = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if(error){
      alert(error.message);
    }else{
      router.replace("/calendar");
    }
  };
  return (
    <div style={{ maxWidth: "400px", margin: "40px auto" }}>
      <h1 style={{ textAlign: "center" }}>Login</h1>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
          required
        />
        <button type="submit" style={{ padding: "8px" }}>
          Log In
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "10px" }}>
        Don’t have an account?{" "}
        <Link 
          href="/signup" 
          style={{ color: "blue", textDecoration: "underline" }}
        >
          Sign up here
        </Link>
      </p>
    </div>
  );
}