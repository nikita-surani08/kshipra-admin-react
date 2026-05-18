"use client";

import { useState } from "react";
import { Work_Sans } from "next/font/google";
import Image from "next/image";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { useRouter } from "next/navigation";
import {
  forgotPasswordWithFirebase,
  signInWithFirebase,
  isAdminExist,
} from "@/service/api/auth.api";
import { useLoaderContext } from "@/context/loader";
import Loader from "./loader";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const Login = () => {
  const [showPassword, setShowPassword] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
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

  const handleSignIn = async () => {
    console.log("Sign In");

    setError("");
    setSuccessMessage("");

    if (!validateEmail()) {
      return;
    }

    if (!password) {
      setError("Please enter password");
      return;
    } else if (password && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setIsLoading(true);
      const adminCheck = await isAdminExist(email);

      if (!adminCheck.success) {
        setError("Admin user not found.");
        return;
      }

      const response = await signInWithFirebase(email, password);

      if (response.success && response.idToken) {
        localStorage.setItem("idToken", response.idToken);
        router.push("/admin/notes-management");
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
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
    <div
      className={`flex flex-row h-screen w-screen bg-white ${worksans.className}`}
    >
      {isLoading && <Loader />}
      <>
        <div className="w-1/2 h-full relative">
          <Image
            src="/images/login-bg.svg"
            className="object-cover w-full h-full"
            fill
            alt="Login"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <object
              data="/images/logo.svg"
              type="image/svg+xml"
              className="image-logo"
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col items-center justify-center gap-12">
          <h1 className="text-4xl font-bold text-[#1E4640]">
            👋 Welcome To <span className="text-[#7DB4AB]">KSHIPRA</span>
          </h1>
          <div className="flex flex-col w-[350px] items-center justify-center gap-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Image
                  src="/images/email.svg"
                  width={20}
                  height={20}
                  alt="Email"
                />
              </div>
              <input
                type="email"
                placeholder="Email address"
                className="border border-gray-300 rounded-xl p-3 pl-12 w-full text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Image
                  src="/images/password.svg"
                  width={20}
                  height={20}
                  alt="Password"
                />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="border border-gray-300 rounded-xl p-3 pl-12 w-full pr-20 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <IoMdEye size={24} />
                ) : (
                  <IoMdEyeOff size={24} />
                )}
              </button>
            </div>
            <button
              type="button"
              className="self-end text-sm font-medium text-[#1E4640] hover:text-[#7DB4AB]"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>
          <div className="-mt-4 flex flex-col items-center justify-center gap-4">
            <button
              type="button"
              className="bg-[#1E4640] w-[350px] text-white p-3 rounded-xl py-3 text-lg font-medium hover:bg-opacity-90 transition-colors"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              Sign In
            </button>
            <div className="relative text-red-500">{error}</div>
            <div className="relative text-green-600 text-center">
              {successMessage}
            </div>
          </div>
        </div>
      </>
    </div>
  );
};

export default Login;
