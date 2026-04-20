import { NextResponse } from 'next/server';
import prompterClient from '@/lib/prompter-client';

// GET — Status
export async function GET() {
  const status = prompterClient.getStatus();
  return NextResponse.json(status);
}

// POST — Start listening
export async function POST() {
  const result = await prompterClient.startServer();
  const status = prompterClient.getStatus();
  return NextResponse.json({ ...result, ...status });
}

// DELETE — Stop server
export async function DELETE() {
  const result = await prompterClient.stopServer();
  return NextResponse.json(result);
}
