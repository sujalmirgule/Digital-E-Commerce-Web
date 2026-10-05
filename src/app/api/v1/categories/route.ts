import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/categories
 *
 * Public endpoint to fetch active categories for product discovery,
 * navigation menus, and category faceted filters.
 */
export async function GET(_req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        imageUrl: true,
        displayOrder: true,
        _count: {
          select: {
            products: {
              where: {
                status: "PUBLISHED",
                seller: { status: "APPROVED" },
              },
            },
          },
        },
      },
    });

    const sanitizedCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      imageUrl: c.imageUrl,
      displayOrder: c.displayOrder,
      productCount: c._count.products,
    }));

    return apiSuccess(
      sanitizedCategories,
      "Categories retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[CATEGORIES_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to fetch marketplace categories",
      500
    );
  }
}
