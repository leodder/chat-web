import jwt  from "jsonwebtoken";
import User from "../models/user.models.js";

export const protectRoute = async(req, res, next) => {
  try{
    const token = req.cookie.jwt;
  } catch(error){

  }
}