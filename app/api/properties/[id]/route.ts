import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("propertyguruPJ");

    const property = await db.collection("properties").findOne(
      { _id: new ObjectId(params.id) },
      {
        projection: {
          url: 1,
          title: 1,
          address: 1,
          price: 1,
          beds: 1,
          baths: 1,
          sqft: 1,
          psf: 1,
          house_type: 1,
          furnishing: 1,
          lease_type: 1,
          date_listed: 1,
          images: 1,
          facilities: 1,
        },
      }
    );

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}
