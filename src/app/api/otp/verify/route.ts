import { NextRequest, NextResponse } from "next/server";
import { verifyOtpApi } from "@/app/actions/order";

export async function POST(req: NextRequest) {
  try {
    const { prescriptionNo, otp } = await req.json();
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!prescriptionNo || !otp) {
      return NextResponse.json({ success: false, error: "Missing prescriptionNo or otp" }, { status: 400 });
    }

    const result = await verifyOtpApi(prescriptionNo, otp, accessToken);
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    }
    
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error: any) {
    console.error("API verify route error:", error);
    return NextResponse.json({ success: false, error: error.message || "OTP verification failed" }, { status: 500 });
  }
}
