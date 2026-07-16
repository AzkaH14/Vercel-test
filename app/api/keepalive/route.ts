import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return new NextResponse('Missing DATABASE_URL', { status: 500 });
    }
    
    // Initialize the Neon connection
    const sql = neon(connectionString);
    
    // Execute a fast, lightweight query to keep the database awake
    await sql`SELECT 1;`;
    
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Keepalive error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
