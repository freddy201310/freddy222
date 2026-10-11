// Compiles the app's Kotlin sources against android.jar without the Android Gradle Plugin.
// Useful in CI or anywhere the Android SDK can't be installed. Usage:
//   gradle -p android/typecheck build -PandroidJar=/path/to/platforms/android-34/android.jar
rootProject.name = "haven-kids-typecheck"
