import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { parse } from 'csv-parse/sync';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
 