"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import useScheduleStore from "@/store/useScheduleStore";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginUser = useScheduleStore((state) => state.loginUser);
  const isLoggedIn = useScheduleStore((state) => state.isLoggedIn);
  const checkAuth = useScheduleStore((state) => state.checkAuth);

  // If already logged in, redirect to index
  useEffect(() => {
    const authenticated = checkAuth();
    if (authenticated) {
      router.push("/");
    }
  }, [checkAuth, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await loginUser(name, email, password, isSignUp);
    setIsLoading(false);
    
    if (success) {
      if (isSignUp) {
        setIsSignUp(false);
        alert("Account created successfully! Please sign in.");
        setName("");
        setPassword("");
      } else {
        router.push("/");
      }
    } else {
      alert("Authentication failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4 font-sans relative">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden z-10">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>

        <div className="flex items-center justify-center gap-3 mb-8 mt-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md border border-emerald-500">S</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SyncForge</h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            {isSignUp ? "Enter your details to get started." : "Welcome back! Please enter your details."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="name">Full Name</label>
              <input 
                id="name" 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-800 font-medium placeholder:text-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="email">Email address</label>
            <input 
              id="email" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="smarty@codekada.com" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-800 font-medium placeholder:text-slate-400"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-slate-700" htmlFor="password">Password</label>
              {!isSignUp && (
                <button type="button" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Forgot password?</button>
              )}
            </div>
            <input 
              id="password" 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-slate-800 font-medium placeholder:text-slate-400"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors mt-2 disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>{isSignUp ? "Create Account" : "Sign In"} <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-medium">
          {isSignUp ? "Already have an account?" : "Don&apos;t have an account?"}
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-emerald-600 font-bold hover:underline ml-1.5"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-6 left-0 w-full text-center text-xs text-slate-400 font-medium">
        &copy; 2026 Ternary Koders. Built for CodeKada Hackathon.
      </div>
    </div>
  );
}
