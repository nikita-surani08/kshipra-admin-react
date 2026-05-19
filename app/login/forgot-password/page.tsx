"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Work_Sans } from "next/font/google";
import Link from "next/link";
import { forgotPasswordWithFirebase, isAdminExist } from "@/service/api/auth.api";
import { useLoaderContext } from "@/context/loader";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { isLoading, setIsLoading } = useLoaderContext();

  const validateEmail = () => {
    if (!email) {
      setError("Please enter email");
      return false;
    }

    if (!email.includes("@")) {
      setError("Please enter valid email address");
      return false;
    }

    return true;
  };

  const handleContinue = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateEmail()) {
      return;
    }

    try {
      setIsLoading(true);
      const adminCheck = await isAdminExist(email);

      if (!adminCheck.success) {
        setError("Admin user not found.");
        return;
      }

      const response = await forgotPasswordWithFirebase(email);

      if (response.success) {
        setSuccessMessage(
          response.message || "Password reset link has been sent to your email."
        );
      } else {
        setError(response.message || "Failed to send password reset link.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-row h-screen w-screen bg-white ${worksans.className}`}>
      <div className="w-1/2 h-full relative">
        <Image
          src="/images/login-bg.svg"
          className="object-cover w-full h-full"
          fill
          alt="Forgot Password"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <object data="/images/logo.svg" type="image/svg+xml" className="image-logo" />
        </div>
      </div>
      <div className="w-1/2 flex flex-col items-center justify-center gap-12 px-6">
        <div className="flex flex-col w-[350px] items-center justify-center gap-4">
          <h1 className="text-4xl font-bold text-[#1E4640]">Forgot password?</h1>
          <p className="text-base text-[#556B66] text-center">
            Enter your admin email and we'll send you a reset link right away.
          </p>
          <form className="w-full space-y-5" onSubmit={handleContinue}>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Image src="/images/email.svg" width={20} height={20} alt="Email" />
              </div>
              <input
                type="email"
                placeholder="Enter your email address"
                className="border border-gray-300 rounded-xl p-3 pl-12 w-full text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="bg-[#1E4640] w-full text-white p-3 rounded-xl text-lg font-medium hover:bg-opacity-90 transition-colors"
              disabled={isLoading}
            >
              Continue
            </button>
          </form>
          <div className="text-center text-sm text-red-500">{error}</div>
          <div className="text-center text-sm text-green-600">{successMessage}</div>
          <Link href="/login" className="text-sm font-medium text-[#1E4640] hover:text-[#7DB4AB]">
            ← Back to login page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
