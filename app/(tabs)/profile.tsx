import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  return (
    <View className="flex-1 items-center justify-center bg-[#C6E7F5] px-8">
      {user?.imageUrl ? (
        <Image source={{ uri: user.imageUrl }} className="mb-4 h-24 w-24 rounded-full" />
      ) : (
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-gray-300">
          <Text className="text-3xl text-gray-600">
            {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
          </Text>
        </View>
      )}

      <Text className="mb-2 text-xl font-bold">{user?.fullName || 'User'}</Text>
      <Text className="mb-8 text-gray-600">{user?.emailAddresses[0]?.emailAddress}</Text>

      <Pressable
        className="w-full rounded-lg bg-red-600 p-4"
        onPress={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-center font-semibold text-white">Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
}
