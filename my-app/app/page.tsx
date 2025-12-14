// Login page - supports both email/password and GitHub OAuth authentication
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

export default function loginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);

  const [message, setMessage] = useState("");

  // ===== Authentication Functions =====

  // Store OAuth user in memory (not localStorage) when authenticated
  useEffect(() => {
    if (status === "authenticated" && session && !user) {
      const oauthUser = {
        id: 404,
        firstname: session.user?.name || "",
        lastname: null,
        email: session.user?.email || ""
      };
      setUser(oauthUser);
    }
  }, [status, session, user]);

  async function handleSignOut() {
    setUser(null);
    localStorage.removeItem('user');
    await signOut({ redirect: false });
  }

  async function login() {
    setMessage("");
    setUser(null);
    if (!email || !password) {
      setMessage("Please enter email and password");
      return;
    }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }
      setUser(data.user);
      setMessage('Login successful');
      router.push('/protected');
    } catch (error: any) {
      console.error('Login error:', error);
      setMessage(error?.message || 'Network error');
    // Fisher-Yates shuffle copy
    const arr = source.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const picked = arr.slice(0, Math.min(6, arr.length));
    const extracted = picked.map((obj) => ({
      name: obj.Recipe_name || obj.name || "Unnamed",
      nutrients: extractNutrients(obj),
      raw: obj,
    }));
    setRandomRecipes(extracted);
  }

  useEffect(() => {
    async function FetchDataset() {
      try {
        const start = performance.now();
        const response = await fetch("http://localhost:5000/FetchDataset?per_page=0");
        const result = await response.json();
        const end = performance.now();
        const duration = end - start;
        console.log(result);
        // Handle new API response structure with pagination
        const dataArray = result.data || result;
        setData(Array.isArray(dataArray) ? dataArray : []);
        setFunctionExecMs(duration);
        setLastFetchTime(new Date().toISOString());
      } catch (error) {
        console.error("Error fetching dataset:", error);
        setData([]);
      }
    }

    FetchDataset();
  }, []);

  useEffect(() => {
    // Recompute results whenever data, dietType or searchTerm change
    const q = (searchTerm || "").toLowerCase();
    const results = data.filter((item) => {
      const dietField = ((item && item.Diet_type) || "")
        .toString()
        .toLowerCase();
      const matchesDietType =
        dietType === "all" || dietField === dietType.toLowerCase();
      // Check any field for the search query
      const anyField = Object.values(item || {})
        .join(" ")
        .toLowerCase();
      const matchesSearchTerm = anyField.includes(q);
      return matchesDietType && matchesSearchTerm;
    });
    setSearchResults(results);
  }, [data, dietType, searchTerm]);

  // When the nutrition panel is visible, automatically recompute when selection changes
  useEffect(() => {
    if (showNutrition) {
      getNutritionalInsights();
    }
  }

  return (
    <div className="bg-gray-100 text-white* flex flex-col items-center justify-center min-h-screen">
      <div>
        {/* Login title */}
        <div className="bg-blue-600 text-7xl shadow-md py-5 rounded-t-2xl font-semibold">
          <h1 className="px-10">Login Page</h1>
        </div>
        {/* ===== Email/Password Input Fields ===== */}
        <div className="flex flex-col bg-white w-full text-black shadow-md gap-3 px-10 py-10">
          <p className="font-semibold text-3xl">Email</p>
          <input
            type="email"
            placeholder="Enter your email"
            className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="font-semibold text-3xl">Password</p>
          <input
            type="password"
            placeholder="Enter your password"
            className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
					{/* ===== Error/Success Message Display ===== */}
					<div className="font-semibold text-red-600 p-0 m-0 h-10 flex justify-center items-center">
							{message}
						</div>
          {/* ===== Login and Register Buttons ===== */}
          <div className="flex items-center justify-center m-auto gap-10">
            <button
              onClick={() => { setMessage(""); login(); }}
              className="py-2 hover:bg-blue-500 px-4 rounded text-white bg-blue-600 text-3xl font-semibold"
            >
              Sign In
            </button>
            <Link
              href="/register"
              className="py-2 px-4 rounded text-white bg-blue-600 text-3xl font-semibold"
            >
              Register
            </Link>
          </div>
        </div>
        {/* ===== OAuth Authentication Section ===== */}
        <div className="bg-blue-600 shadow-md py-5 px-10 rounded-b-2xl font-semibold flex flex-col gap-3">

          {session ? (
            <div className="flex flex-col gap-2">
              <p className="text-white">Signed in as {session.user?.email || session.user?.name}</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                onClick={() => router.push('/protected')}
                className="py-2 px-4 rounded text-black bg-white text-lg font-semibold hover:bg-gray-100"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="py-2 px-4 rounded text-black bg-white text-lg font-semibold hover:bg-gray-100"
              >
                Sign Out
              </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="py-2 px-4 rounded text-black bg-white text-lg font-semibold hover:bg-gray-100"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
