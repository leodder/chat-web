import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

// 前端送 request → request 會帶 cookie（包含 jwt）
// protectRoute 先檢查 jwt 是否存在
// 如果沒有 → 回傳 401
// 如果有 → 驗證 jwt 是否正確（jwt.verify）
// 再從資料庫查使用者（用 jwt 裡的 userId）
// 查到後 → 把 user 放到 req.user
// 執行 next() → 進入下一個真正的路由（例如 /getProfile）
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No Token Provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SCRECT);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // 把使用者資料放到 request 裡，讓後面所有 API 都能用。
    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
