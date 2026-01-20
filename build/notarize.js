const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename

  // Check if we have the required environment variables
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID
  const keychainProfile = process.env.APPLE_KEYCHAIN_PROFILE

  // Skip notarization if credentials are not available
  if (!appleId || (!appleIdPassword && !keychainProfile) || !teamId) {
    console.warn('Skipping notarization: Apple credentials not found in environment')
    return
  }

  console.log(`Notarizing ${appName}...`)

  try {
    await notarize({
      appPath: `${appOutDir}/${appName}.app`,
      teamId: teamId,
      appleId: appleId,
      appleIdPassword: appleIdPassword || keychainProfile,
    })
    console.log('Notarization successful!')
  } catch (error) {
    console.error('Notarization failed:', error)
    throw error
  }
}

