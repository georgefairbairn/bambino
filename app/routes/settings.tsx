import { getAuth } from '@clerk/remix/ssr.server';
import type { ActionFunctionArgs, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { db } from '~/utils/db.server';
import { SelectButton } from '~/components/select-button';
import { useLoaderData } from '@remix-run/react';
import { ROUTES } from '~/utils/consts';
import type { User } from '@prisma/client';

type LoaderData = {
  user: User;
};

export const loader: LoaderFunction = async args => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect(process.env.CLERK_SIGN_IN_URL ?? '/');
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  return json({ user });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const locale = formData.get('locale');
  const userId = formData.get('userId');

  if (typeof locale !== 'string' || typeof userId !== 'string') {
    return new Response('Invalid form submission', { status: 400 });
  }

  try {
    await db.user.update({
      where: { id: parseInt(userId) },
      data: { locale },
    });

    return redirect(ROUTES.SETTINGS);
  } catch (error) {
    console.error(error);
    return new Response('Failed to update locale', { status: 500 });
  }
};

export default function SettingsPage() {
  const {
    user: { id: userId, locale },
  } = useLoaderData<LoaderData>();

  return (
    <div className="flex flex-col mt-8 mb-4">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      <h2 className="text-xl font-bold mb-4">Preferred Voice Region</h2>
      <div className="grid grid-cols-cardsMobile gap-4 sm:grid-cols-cardsDesktop">
        <form method="post" className="flex">
          <input type="hidden" name="locale" value="en-GB" />
          <input type="hidden" name="userId" value={userId} />
          <SelectButton
            type="submit"
            icon={<span>🇬🇧</span>}
            text={<div className="py-4">English (UK)</div>}
            isSelected={locale === 'en-GB'}
          />
        </form>
        <form method="post">
          <div className="w-full">
            <input type="hidden" name="locale" value="en-US" />
            <input type="hidden" name="userId" value={userId} />
            <SelectButton
              type="submit"
              icon={<span>🇺🇸</span>}
              text={<div className="py-4">English (US)</div>}
              isSelected={locale === 'en-US'}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
