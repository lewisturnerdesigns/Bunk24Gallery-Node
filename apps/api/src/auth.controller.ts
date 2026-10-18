import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { signAdminToken, verifyAdminCredentials } from "./admin-auth";

@Controller("auth/admin")
export class AuthController {
  @Post("login")
  login(@Body() body: { email?: string; password?: string }) {
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    if (!verifyAdminCredentials(email, password)) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }
    return { accessToken: signAdminToken(email.trim().toLowerCase()), tokenType: "Bearer", expiresIn: Number(process.env.JWT_EXPIRE_MINUTES || 60) * 60 };
  }
}
