import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase.config";

export const signInWithFirebase = async (
  email: string,
  password: string
): Promise<{ success: boolean; idToken?: string; message?: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const idToken = await userCredential.user.getIdToken();
    return { success: true, idToken };
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };
    let errorMessage = "An error occurred during sign in";

    switch (authError.code) {
      case "auth/invalid-credential":
        errorMessage = "Invalid email or password";
        break;
      default:
        errorMessage =
          authError.message || "An error occurred during sign in";
    }

    return { success: false, message: errorMessage };
  }
};

export const signUpWithFirebase = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential;
  return user;
};

// export const loginWithApple = async () => {
//   const auth: any = getAuth();
//   const provider = new OAuthProvider("apple.com");
//   const result: any = await signInWithPopup(auth, provider);

//   const user = result.user;

//   const credential: any = OAuthProvider.credentialFromResult(result);
//   const accessToken = credential.accessToken;
//   const idToken = credential.idToken;

//   return { user, idToken };
// };

export const forgotPasswordWithFirebase = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "Password reset link has been sent to your email.",
    };
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };
    let errorMessage = "Failed to send password reset link.";

    switch (authError.code) {
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/user-not-found":
        errorMessage = "No user found with this email address.";
        break;
      default:
        errorMessage = authError.message || errorMessage;
    }

    return { success: false, message: errorMessage };
  }
};

// export const loginWithGoogle = async () => {
//   const provider = new GoogleAuthProvider();
//   const result = await signInWithPopup(auth, provider);
//   return result.user;
// };

export const signOutUser = async () => {
  const auth = getAuth();
  await signOut(auth);
};

// export const createUserInUserCollection = async (
//   userId: string,
//   settings: any
// ) => {
//   try {
//     const docRef = doc(db, `users/${userId}/Settings/userSettings`);
//     await setDoc(docRef, settings, { merge: true });
//   } catch (error) {
//     console.error("Error updating user settings:", error);
//     throw error;
//   }
// };

export const isAdminExist = async (email: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("email", "==", email),
      where("userType", "==", "ADMIN")
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: true, userId: querySnapshot.docs[0].id };
    }
    return { success: false };
  } catch (error) {
    console.error("Error checking admin user:", error);
    throw error;
  }
};

export const sendEmailVerificationToUser = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Error sending email verification:", error);
    throw error;
  }
};

export const checkEmailVerificationStatus = (user: User | null): boolean => {
  return user?.emailVerified || false;
};
