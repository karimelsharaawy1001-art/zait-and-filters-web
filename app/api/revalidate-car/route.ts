import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { make } = await req.json();
  if (make) {
    revalidatePath(`/cars/${make.toLowerCase()}`);
  }
  revalidatePath('/cars');
  return NextResponse.json({ revalidated: true });
}
