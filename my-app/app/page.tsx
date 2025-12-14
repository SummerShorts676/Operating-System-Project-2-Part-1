"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function loginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);

  const [message, setMessage] = useState("");

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
      // Store user in localStorage and redirect
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/protected');
    } catch (error: any) {
      console.error('Login error:', error);
      setMessage(error?.message || 'Network error');
    }
  }

  return (
    <div className="bg-gray-100 text-white* flex flex-col items-center justify-center min-h-screen">
      <div>
        {/* Login title */}
        <div className="bg-blue-600 text-7xl shadow-md py-5 rounded-t-2xl font-semibold">
          <h1 className="px-10">Login Page</h1>
        </div>
        {/* Login Form */}
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
					<div className="font-semibold text-red-600 p-0 m-0 h-10 flex justify-center items-center">
							{message}
						</div>
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
        {/* OAuth */}
        <div className="bg-blue-600 shadow-md py-5 rounded-b-2xl font-semibold">
          <h1>Login with...</h1>
        </div>
      </div>
    </div>
  );
}
