// global get user data(like redux' store)
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
// toast
import { toast } from "react-hot-toast";

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIng: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
    } catch (error) {
      set({ authUser: null });
      console.log("Error in checkAuth:", error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Signup failed. Please try again."
      );
      console.log("Error in signup:", error);
    } finally {
      set({ isSigningUp: false });
    }
  },
  logout: async() => {
    try{
      await axiosInstance.post("/auth/logout");
      set({authUser: null});
      toast.success("logged out successfully");
    } catch(error){
      toast.error(
        error.response?.data?.message || "Logout failed. Please try again."
      );
      console.log("Error in logout:", error);
    }
  }
}));
