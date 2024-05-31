import { LoaderFunction, redirect } from '@remix-run/node';
import { ROUTES } from '~/utils/consts';
import { db } from '~/utils/db.server'; // Import your Prisma client

export const loader: LoaderFunction = async ({ params }) => {
  const searchId = params.searchId;
  const nameId = params.nameId;

  if (!searchId) return redirect(ROUTES.LIBRARY);

  if (nameId) return redirect(`/search/${searchId}/${nameId}`);

  const searchDetails = await db.search.findUnique({
    where: {
      id: parseInt(searchId),
    },
  });

  if (!searchDetails) {
    throw new Response('Search not found', { status: 404 });
  }

  const genderPreference = searchDetails.genderPreference;
  const genderConditions = [
    ...(genderPreference !== 'girl' ? [{ gender: 'male' }] : []),
    ...(genderPreference !== 'boy' ? [{ gender: 'female' }] : []),
    { gender: 'unisex' },
  ];

  try {
    const totalNamesCount = await db.name.count({
      where: {
        OR: genderConditions,
        NOT: {
          userActions: {
            some: {
              searchId: parseInt(searchId),
              actionType: {
                in: ['like', 'dislike'],
              },
            },
          },
        },
      },
    });

    if (totalNamesCount === 0) {
      throw new Response('No available names left to display', { status: 404 });
    }

    const randomName = await db.name.findFirst({
      where: {
        OR: genderConditions,
        NOT: {
          userActions: {
            some: {
              searchId: parseInt(searchId),
              actionType: {
                in: ['like', 'dislike'],
              },
            },
          },
        },
      },
      take: 1,
      skip: Math.floor(Math.random() * totalNamesCount),
    });

    if (!randomName) {
      throw new Response('No available names left to display', { status: 404 });
    }

    return redirect(`/search/${searchId}/${randomName.id}`);
  } catch (error) {
    console.error('Failed to fetch a random name:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export default function SearchIndex() {
  // This will never render because the loader always redirects
  return null;
}
