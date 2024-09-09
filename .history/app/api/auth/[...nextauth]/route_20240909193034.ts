import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";

// Explicitly typing handlers
export async function GET(req: NextRequest, res: NextResponse) {
  return NextAuth(authOptions)(req, res);
}

export async function POST(req: NextRequest, res: NextResponse) {
  return NextAuth(authOptions)(req, res);
}
