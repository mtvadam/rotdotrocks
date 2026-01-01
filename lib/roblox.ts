/**
 * Roblox profile fetching utilities
 * Uses Roblox's public API to verify challenge phrases
 */

interface RobloxProfile {
  username: string
  userId: string
  description: string
}

/**
 * Fetch a Roblox user's profile description using the correct API flow
 * Step 1: POST to /v1/usernames/users to get user ID from username
 * Step 2: GET /v1/users/{userId} to get profile with description
 */
export async function fetchRobloxProfile(username: string): Promise<RobloxProfile | null> {
  try {
    // Step 1: Get user ID from username using POST endpoint
    const usernameResponse = await fetch(
      'https://users.roblox.com/v1/usernames/users',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: true,
        }),
      }
    )

    if (!usernameResponse.ok) {
      console.error('Roblox user lookup failed')
      return null
    }

    const usernameData = await usernameResponse.json()

    if (!usernameData.data || usernameData.data.length === 0) {
      // Username not found - this is expected for invalid usernames
      return null
    }

    const userData = usernameData.data[0]
    const userId = userData.id

    // Step 2: Fetch the user's profile with description
    const profileResponse = await fetch(
      `https://users.roblox.com/v1/users/${userId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!profileResponse.ok) {
      console.error('Roblox profile fetch failed')
      return null
    }

    const profileData = await profileResponse.json()

    return {
      username: profileData.name,
      userId: String(profileData.id),
      description: profileData.description || '',
    }
  } catch (error) {
    console.error('Roblox profile fetch error')
    return null
  }
}

/**
 * Fetch a Roblox user's avatar headshot URL
 * Uses the Roblox Thumbnails API
 * @param userId - The Roblox user ID
 * @param size - Image size (default 150x150)
 */
export async function fetchRobloxAvatar(
  userId: string,
  size: '48x48' | '50x50' | '60x60' | '75x75' | '100x100' | '110x110' | '150x150' | '180x180' | '352x352' | '420x420' | '720x720' = '150x150'
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('Roblox avatar fetch failed')
      return null
    }

    const data = await response.json()

    if (!data.data || data.data.length === 0) {
      return null
    }

    const avatarData = data.data[0]
    if (avatarData.state === 'Completed' && avatarData.imageUrl) {
      return avatarData.imageUrl
    }

    return null
  } catch (error) {
    console.error('Roblox avatar fetch error')
    return null
  }
}

/**
 * Check if a challenge phrase exists in a user's profile description
 * Flexible matching: allows whitespace before/after and other text around it
 */
export async function verifyChallengeInProfile(
  username: string,
  challengePhrase: string
): Promise<boolean> {
  const profile = await fetchRobloxProfile(username)

  if (!profile) {
    return false
  }

  // Flexible matching: trim whitespace and check if phrase exists anywhere in description
  const description = profile.description.trim().toLowerCase()
  const phrase = challengePhrase.trim().toLowerCase()

  // Check if the challenge phrase exists in the description (case-insensitive)
  // This allows the phrase to be surrounded by other text or have extra whitespace
  return description.includes(phrase)
}
