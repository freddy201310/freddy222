plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.haven.kids"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.haven.kids"
        minSdk = 29 // Android 10: needed for Private DNS restrictions and modern usage stats
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        // Your Haven website. Change this before building a release.
        manifestPlaceholders["havenServer"] = "https://havenparents.com"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

// Deliberately no third-party or AndroidX dependencies: the whole app uses only the Android framework.
