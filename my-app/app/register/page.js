// User registration page - allows new users to create an account
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== Registration Submit Handler =====
  async function register() {
    setMessage("");
    // Validate all fields are filled
    if (!firstname || !lastname || !email || !password) {
      setMessage("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      // Send registration request to API
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Registration failed");
        setIsSubmitting(false);
        return;
      }
      // Success: redirect to login
      setMessage("Registration successful");
      router.push("/login");
    } catch (error) {
      console.error("Register error:", error);
      setMessage(error?.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-100 text-white* flex flex-col items-center justify-center min-h-screen">
      <div>
        {/* ===== Registration Form Header ===== */}
        <div className="bg-blue-600 text-7xl shadow-md py-5 rounded-t-2xl font-semibold">
          <h1 className="px-10">Register Page</h1>
        </div>
        {/* ===== Registration Form Inputs ===== */}
        <div className="flex flex-col bg-white w-full text-black shadow-md gap-6 px-10 py-10">
          {/* ===== Personal Information Inputs ===== */}
          {/* Row 1: First & Last Name */}
          <div className="flex gap-6 w-full">
            <div className="flex flex-col w-full">
              <p className="font-semibold text-3xl">First Name</p>
              <input
                type="text"
                placeholder="Enter your first name"
                className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-full">
              <p className="font-semibold text-3xl">Last Name</p>
              <input
                type="text"
                placeholder="Enter your last name"
                className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
              />
            </div>
          </div>
          {/* Row 2: Email & Password */}
          <div className="flex gap-6 w-full">
            <div className="flex flex-col w-full">
              <p className="font-semibold text-3xl">Email</p>
              <input
                type="email"
                placeholder="Enter your email"
                className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-full">
              <p className="font-semibold text-3xl">Password</p>
              <input
                type="password"
                placeholder="Enter your password"
                className="p-2 rounded w-full shadow-md bg-white active:bg-white sm:w-auto"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {/* ===== Error/Success Message Display ===== */}
          <div className="font-semibold text-red-600 p-0 m-0 h-10 flex justify-center items-center">
            {message}
          </div>
          {/* ===== Register and Back Buttons ===== */}
          <div className="flex items-center justify-center m-auto gap-10">
            <button
              onClick={() => {
                if (!isSubmitting) {
                  setMessage("");
                  register();
                }
              }}
              className="py-2 hover:bg-blue-500 px-4 rounded text-white bg-blue-600 text-3xl font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Register"}
            </button>
            <Link
              href="../"
              className="py-2 hover:bg-blue-500 px-4 rounded text-white bg-blue-600 text-3xl font-semibold"
            >
              Go Back
            </Link>
          </div>
        </div>
        {/* Footer */}
        <div className="bg-blue-600 text-blue-600 shadow-md py-5 rounded-b-2xl font-semibold">
          <h1>Hello There! ***You are shocked</h1>
        </div>
      </div>
    </div>
  );
}
