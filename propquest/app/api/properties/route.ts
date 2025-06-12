// /app/api/properties/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // Helper for MongoDB connection

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("propertyguruPJ"); // your database name
    const properties = await db.collection("properties").find({}).toArray();

    return NextResponse.json(properties);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
