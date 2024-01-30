import { Prisma } from '@prisma/client';

export type CocktailRecipeFullWithImage = Prisma.CocktailRecipeGetPayload<{
  include: {
    glass: true;
    CocktailRecipeImage: {
      select: {
        image: true;
      };
    };
    garnishes: {
      include: {
        garnish: true;
      };
    };
    steps: {
      include: {
        action: true;
        ingredients: {
          include: {
            ingredient: true;
          };
        };
      };
    };
  };
}>;
