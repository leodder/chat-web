import jwt from "jsonwebtoken";

// 替使用者登入 → 產生 JWT → 寫入 Cookie，建立登入狀態。
// generateToken =「幫使用者登入」的函式。
// 它負責產生登入憑證（token），並用 Cookie 存起來。
// signup 和 login 兩個地方都需要它。
export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    httpOnly: true, // prevent XSS attack cross-site attacks
    sameSite: "strict", // CSRF attacks cross-site request forgery attacks
    secure: process.env.NODE_ENV !== "development",
  });
  return token;
};
