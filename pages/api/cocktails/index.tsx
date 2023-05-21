// pages/api/post/index.ts

import prisma from '../../../lib/prisma';
import { Prisma } from '.prisma/client';
import { CocktailRecipeFull } from '../../../models/CocktailRecipeFull';
import { NextApiRequest, NextApiResponse } from 'next';
import { CocktailRecipe } from '@prisma/client';
import { CocktailRecipeStepFull } from '../../../models/CocktailRecipeStepFull';
import { CocktailRecipeGarnishFull } from '../../../models/CocktailRecipeGarnishFull';
import CocktailRecipeCreateInput = Prisma.CocktailRecipeCreateInput;

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, description, tags, price, glassWithIce, image, glassId, garnishes, steps } = req.body;

  if (req.method === 'GET') {
    const cocktailRecipes: CocktailRecipeFull[] = await prisma.cocktailRecipe.findMany({
      include: {
        glass: true,
        garnishes: { include: { garnish: true } },
        steps: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });
    let searchParam = req.query.search as string | undefined;
    if (searchParam == undefined) {
      return res.json(cocktailRecipes);
    }
    const search = searchParam.trim().toLowerCase();
    return res.json(
      cocktailRecipes.filter(
        (cocktail) =>
          cocktail.name.toLowerCase().includes(search) ||
          cocktail.tags.some((tag) => tag.toLowerCase().includes(search)) ||
          cocktail.garnishes.some((garnish) => garnish.garnish.name.toLowerCase().includes(search)) ||
          cocktail.steps.some((step) =>
            step.ingredients
              .filter((ingredient) => ingredient.ingredient?.name != undefined)
              .some(
                (ingredient) =>
                  ingredient.ingredient?.name.toLowerCase().includes(search) ||
                  (ingredient.ingredient?.shortName ?? '').toLowerCase().includes(search),
              ),
          ),
      ),
    );
  }

  const input: CocktailRecipeCreateInput = {
    id: id,
    name: name,
    description: description,
    tags: tags,
    price: price,
    glassWithIce: glassWithIce,
    image: image ?? null,
    glass: { connect: { id: glassId } },
    // garnish: garnishId == undefined ? undefined : { connect: { id: garnishId } },
  };

  if (id != undefined) {
    await prisma.cocktailRecipeIngredient.deleteMany({
      where: {
        cocktailRecipeStep: {
          cocktailRecipe: {
            id: id,
          },
        },
      },
    });

    await prisma.cocktailRecipeGarnish.deleteMany({
      where: {
        cocktailRecipe: {
          id: id,
        },
      },
    });

    await prisma.cocktailRecipeStep.deleteMany({
      where: {
        cocktailRecipe: {
          id: id,
        },
      },
    });
  }

  let result: CocktailRecipe | undefined = undefined;
  if (req.method === 'PUT') {
    result = await prisma.cocktailRecipe.update({
      where: {
        id: id,
      },
      data: input,
    });
  } else if (req.method === 'POST') {
    result = await prisma.cocktailRecipe.create({
      data: input,
    });
  }

  if (steps.length > 0 && result != undefined) {
    await steps.forEach(async (step: CocktailRecipeStepFull) => {
      await prisma.cocktailRecipeStep.create({
        data: {
          mixing: step.mixing,
          tool: step.tool,
          stepNumber: step.stepNumber,
          cocktailRecipe: { connect: { id: result!.id } },
          ingredients: step.mixing
            ? {
                create: step.ingredients.map((ingredient) => {
                  return {
                    amount: ingredient.amount,
                    ingredientNumber: ingredient.ingredientNumber,
                    unit: ingredient.unit,
                    ingredient: { connect: { id: ingredient.ingredientId } },
                  };
                }),
              }
            : undefined,
        },
      });
    });
  }
  console.log(garnishes);
  if (garnishes.length > 0 && result != undefined) {
    await garnishes.forEach(async (garnish: CocktailRecipeGarnishFull) => {
      await prisma.cocktailRecipeGarnish.create({
        data: {
          cocktailRecipe: { connect: { id: result!.id } },
          garnish: { connect: { id: garnish.garnishId } },
          garnishNumber: garnish.garnishNumber,
          description: garnish.description,
          optional: garnish.optional,
        },
      });
    });
  }

  return res.json(result);
}
