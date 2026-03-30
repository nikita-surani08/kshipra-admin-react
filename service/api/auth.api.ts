import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase.config";
import { randomUUID } from "crypto";

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
  } catch (error: any) {
    let errorMessage = "An error occurred during sign in";

    switch (error.code) {
      case "auth/invalid-credential":
        errorMessage = "Invalid email or password";
        break;
      default:
        errorMessage = error.message || "An error occurred during sign in";
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

// export const forgotPasswordWithFirebase = async (
//   email: string
// ): Promise<any> => {
//   await sendPasswordResetEmail(auth, email);
// };

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

export const sendEmailVerificationToUser = async (user: any): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Error sending email verification:", error);
    throw error;
  }
};

export const checkEmailVerificationStatus = (user: any): boolean => {
  return user?.emailVerified || false;
};
