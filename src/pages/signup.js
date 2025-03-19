import {useState, useEffect} from "react";
import {useRouter} from "next/router";
import {supabase} from "../../lib/supabaseClient"

export default function SignUpPage(){
    const router = useRouter();
    const[email,setEmail] = useState("");
    const[password,setPassword] = useState("");
    const[name,setName] = useState("");


    useEffect (() => {
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
    <div style={{ maxWidth: "400px", margin: "40px auto" }}>
      <h1 style={{ textAlign: "center" }}>Sign Up</h1>
      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column" }}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: "8px", padding: "8px" }}
          required
        />
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
        <button type="submit" style={{ padding: "8px" }}>Sign Up</button>
      </form>
    </div>
  );
}

