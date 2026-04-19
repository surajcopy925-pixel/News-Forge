// src/app/api/prompter/connect/route.ts
import { NextResponse } from 'next/server';
import prompterClient from '@/lib/prompter-client';

export async function POST() {
  try {
    const result = await prompterClient.connect();
    return NextResponse.json({
      success: result.success,
      connected: result.success,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, connected: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  prompterClient.disconnect();
  return NextResponse.json({ success: true, connected: false });
}

export async function GET() {
  return NextResponse.json(prompterClient.getStatus());
}
