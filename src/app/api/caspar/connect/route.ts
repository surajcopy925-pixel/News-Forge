import { NextResponse } from 'next/server';
import casparClient from '@/lib/caspar-client';

export async function POST() {
  try {
    const result = await casparClient.connect();
    return NextResponse.json({
      success: true,
      connected: true,
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
  try {
    casparClient.disconnect();
    return NextResponse.json({
      success: true,
      connected: false,
      message: 'Disconnected',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = casparClient.getStatus();
  return NextResponse.json(status);
}
