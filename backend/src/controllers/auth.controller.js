import User from "../models/user.models.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  // res.send("signup route");
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // 密碼過短直接return
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    // 註冊email已存在，直接return
    const user = await User.findOne({ email });
    // User的方法是mongoose提供
    if (user) {
      return res.status(400).json({ message: "Eamil already exist" });
    }
    // 加密處理
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 賦值並準備打進資料庫所需欄位
    const newUser = new User({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });
    if (newUser) {
      // save to database
      await newUser.save();
      // generate jwt token here
      // generateToken = 產生 JWT（後端） + 寫入瀏覽器 cookie（前端）
      generateToken(newUser._id, res);
      // await newUser.save();
      res.status(201).json({
        _id: newUser._id,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal server Error" });
  }
};
export const login = async (req, res) => {
  // res.send("login route");
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // 比對密碼
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // generateToken = 產生 JWT（後端） + 寫入瀏覽器 cookie（前端）
    generateToken(user._id, res);
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const logout = (req, res) => {
  // res.send("logout route");
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }
    // to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    // to my database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.staus(500).json({ message: "Internal Server Error" });
  }
};
