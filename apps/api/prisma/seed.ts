import { PrismaClient, MeshAction } from '@prisma/client';

const prisma = new PrismaClient();

const BURGER_GLB = '/models/burger.glb';
const BURGER_USDZ = '/models/burger.usdz';
const DRINK_GLB = '/models/drink.glb';
const DRINK_USDZ = '/models/drink.usdz';
const DESSERT_GLB = '/models/dessert.glb';
const DESSERT_USDZ = '/models/dessert.usdz';

async function main() {
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableCartLine.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItemAsset.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurant = await prisma.restaurant.create({
    data: {
      slug: 'casa-brasa',
      name: 'Casa Brasa',
      description: 'Grelhados, burgers e drinks com cardápio em realidade aumentada.',
      logoUrl: null,
      watermark: 'Casa Brasa',
      primaryColor: '#B33A1B',
      categories: {
        create: [
          {
            name: 'Burgers',
            sortOrder: 0,
            items: {
              create: [
                {
                  name: 'Brasa Smash',
                  description:
                    'Blend 180g, queijo cheddar, picles, cebola roxa e molho da casa no brioche tostado.',
                  basePrice: 42.9,
                  imageUrl:
                    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
                  sortOrder: 0,
                  nutritionTags: [
                    {
                      id: 'kcal',
                      label: '520 kcal',
                      position: '0m 0.14m 0.06m',
                      normal: '0m 1m 0m',
                    },
                    {
                      id: 'prot',
                      label: 'Proteína 32g',
                      position: '0.08m 0.08m 0.04m',
                      normal: '1m 0m 0m',
                    },
                    {
                      id: 'gord',
                      label: 'Gordura 28g',
                      position: '-0.08m 0.08m 0.04m',
                      normal: '-1m 0m 0m',
                    },
                  ],
                  asset: {
                    create: {
                      glbUrl: BURGER_GLB,
                      usdzUrl: BURGER_USDZ,
                      scaleFactor: 1,
                      lightingPreset: 'warm',
                    },
                  },
                  modifiers: {
                    create: [
                      {
                        name: 'Ingredientes',
                        multiSelect: true,
                        sortOrder: 0,
                        options: {
                          create: [
                            {
                              name: 'Picles',
                              priceDelta: 0,
                              meshNodeName: 'Pickles',
                              action: MeshAction.hide,
                              defaultOn: true,
                              sortOrder: 0,
                            },
                            {
                              name: 'Bacon crocante',
                              priceDelta: 6.5,
                              meshNodeName: 'Bacon',
                              action: MeshAction.show,
                              defaultOn: false,
                              sortOrder: 1,
                            },
                            {
                              name: 'Ovo',
                              priceDelta: 4.0,
                              meshNodeName: 'Egg',
                              action: MeshAction.show,
                              defaultOn: false,
                              sortOrder: 2,
                            },
                          ],
                        },
                      },
                      {
                        name: 'Ponto da carne',
                        multiSelect: false,
                        required: true,
                        sortOrder: 1,
                        options: {
                          create: [
                            {
                              name: 'Ao ponto',
                              priceDelta: 0,
                              defaultOn: true,
                              sortOrder: 0,
                            },
                            {
                              name: 'Mal passado',
                              priceDelta: 0,
                              defaultOn: false,
                              sortOrder: 1,
                            },
                            {
                              name: 'Bem passado',
                              priceDelta: 0,
                              defaultOn: false,
                              sortOrder: 2,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  name: 'Chicken Crispy',
                  description:
                    'Filé empanado, alface americana, maionese de ervas e pão de batata.',
                  basePrice: 36.5,
                  imageUrl:
                    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80',
                  sortOrder: 1,
                  asset: {
                    create: {
                      glbUrl: BURGER_GLB,
                      usdzUrl: BURGER_USDZ,
                      scaleFactor: 1,
                      lightingPreset: 'neutral',
                    },
                  },
                },
              ],
            },
          },
          {
            name: 'Drinks',
            sortOrder: 1,
            items: {
              create: [
                {
                  name: 'Negroni da Casa',
                  description: 'Gin, Campari e vermute rosso. Servido com gelo e casca de laranja.',
                  basePrice: 28.0,
                  imageUrl:
                    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
                  sortOrder: 0,
                  nutritionTags: [
                    {
                      id: 'kcal',
                      label: '180 kcal',
                      position: '0m 0.16m 0.04m',
                      normal: '0m 1m 0m',
                    },
                    {
                      id: 'alc',
                      label: 'Álcool 14%',
                      position: '0.06m 0.1m 0.04m',
                      normal: '1m 0m 0m',
                    },
                  ],
                  asset: {
                    create: {
                      glbUrl: DRINK_GLB,
                      usdzUrl: DRINK_USDZ,
                      scaleFactor: 1,
                      lightingPreset: 'cool',
                    },
                  },
                },
              ],
            },
          },
          {
            name: 'Sobremesas',
            sortOrder: 2,
            items: {
              create: [
                {
                  name: 'Brownie Quente',
                  description: 'Brownie de chocolate 70% com sorvete de baunilha.',
                  basePrice: 24.0,
                  imageUrl:
                    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
                  sortOrder: 0,
                  // sem asset 3D — fallback 2D
                },
                {
                  name: 'Petit Gâteau',
                  description: 'Centro cremoso, calda de chocolate belga.',
                  basePrice: 27.5,
                  imageUrl:
                    'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80',
                  sortOrder: 1,
                  asset: {
                    create: {
                      glbUrl: DESSERT_GLB,
                      usdzUrl: DESSERT_USDZ,
                      scaleFactor: 1,
                      lightingPreset: 'warm',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seed OK: restaurant ${restaurant.slug} (${restaurant.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
